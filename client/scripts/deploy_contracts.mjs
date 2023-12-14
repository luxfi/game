import prompt from "prompt";
import colors from "colors";
import Web3 from "web3";
import { ethers } from "ethers";
import fs from "fs";
import * as ethutil from "../src/utils/ethutil.js";
import * as constants from "../src/constants.js";
import HDWalletProvider from "@truffle/hdwallet-provider";
import * as gamedata from "../src/gamedata/gamedata.json" assert { type: "json" };
import * as LuxABI from "contracts/build/contracts/Lux.sol/Lux.json" assert { type: "json" };
import * as ProxyAdminABI from "contracts/build/contracts/proxy/ProxyAdmin.sol/ProxyAdmin.json" assert { type: "json" };
import * as ImplementationABI from "contracts/build/contracts/metrics/Statistics.sol/Statistics.json" assert { type: "json" };
import * as ProxyStatsABI from "contracts/build/contracts/proxy/ProxyStats.sol/ProxyStats.json" assert { type: "json" };

let web3;
let lux;
let proxyAdmin;
let implementation;
let proxyStats;

const PROMPT_ON_DEVELOP = true;
const DEPLOY_DATA_PATH = `./client/src/gamedata/deploy.${constants.ACTIVE_NETWORK.name}.json`;

async function exec() {
  console.log(
    colors.cyan(`<< NETWORK: ${constants.ACTIVE_NETWORK.name} >>`).inverse
  );

  await initWeb3();

  // Retrieve deployment data for the active network.
  const deployData = loadDeployData(DEPLOY_DATA_PATH);
  // Determine which contracts need to be deployed.
  let count = 0;
  if (needsDeploy(deployData.lux)) {
    count++;
    console.log(colors.red(`(${count}) Will deploy Lux.sol!`));
  }
  if (needsDeploy(deployData.implementation)) {
    count++;
    console.log(colors.red(`(${count}) Will deploy Statistics.sol!`));
  }
  if (needsDeploy(deployData.proxyAdmin)) {
    count++;
    console.log(colors.red(`(${count}) Will deploy ProxyAdmin.sol!`));
  }
  if (needsDeploy(deployData.proxyStats)) {
    count++;
    console.log(colors.red(`(${count}) Will deploy ProxyStats.sol!`));
  }
  gamedata.default.levels.map((level) => {
    if (needsDeploy(deployData[level.deployId])) {
      count++;
      console.log(
        colors.cyan(
          `(${count}) Will deploy ${level.levelContract} (${level.name})`
        )
      );
    }
  });

  if (count === 0) {
    console.log(colors.gray(`No actions to perform, exiting.`));
    return;
  }

  if (await confirmDeployment()) {
    await deployContracts(deployData);
    storeDeployData(DEPLOY_DATA_PATH, deployData);
    console.log("Done");
    process.exit();
  }
}

exec();

async function deployContracts(deployData) {
  const props = {
    gasPrice: parseInt((await web3.eth.getGasPrice()) * 1.05),
    gas: 20000000,
  };

  let from = constants.ADDRESSES[constants.ACTIVE_NETWORK.name];
  if (!from) from = (await web3.eth.getAccounts())[0];
  console.log("FROM: ", from);

  // Deploy/retrieve lux contract
  const Lux = await ethutil.getTruffleContract(LuxABI.default, {
    from,
  });
  try {
    if (needsDeploy(deployData.lux)) {
      console.log(`Deploying Lux.sol...`);
      lux = await Lux.new(props);
      console.log(colors.yellow(`  Lux: ${lux.address}`));
      deployData.lux = lux.address;
    } else {
      console.log("Using deployed Lux.sol:", deployData.lux);
      lux = await Lux.at(deployData.lux);
      // console.log('lux: ', lux);
    }
  } catch (error) {
    console.log(error);
  }

  // Deploy/retrieve Implementation
  await deployImplementation(from, props, deployData);

  // Deploy/retrieve Proxy Admin
  await deployProxyAdmin(from, props, deployData);

  // Deploy/retrieve ProxyStats
  await deployProxyStats(from, props, deployData);

  // set ProxyStats in Lux
  await setStatProxy(from, props);

  // Sweep levels
  const promises = gamedata.default.levels.map(async (level) => {
    // console.log('level: ', level);
    return new Promise(async (resolve) => {
      if (needsDeploy(deployData[level.deployId])) {
        console.log(
          `Deploying ${level.levelContract}, deployId: ${level.deployId}...`
        );

        // Deploy contract
        const LevelABI = JSON.parse(
          fs.readFileSync(
            `contracts/build/contracts/levels/${
              level.levelContract
            }/${withoutExtension(level.levelContract)}.json`,
            "utf-8"
          )
        );
        const Contract = await ethutil.getTruffleContract(LevelABI, { from });
        const contract = await Contract.new(...level.deployParams, props);
        console.log(colors.yellow(`  ${level.name}: ${contract.address}`));
        deployData[level.deployId] = contract.address;
        console.log(
          colors.gray(
            `  storing deployed id: ${level.deployId} with address: ${contract.address}`
          )
        );

        // Register level in Lux contract
        console.log(
          `  Registering level ${level.levelContract} in Lux.sol...`
        );
        const tx = await lux.registerLevel(contract.address, props);
        console.log(`Registered ${level.levelContract}!`);
      } else {
        console.log(`Using deployed ${level.levelContract}...`);
      }
      resolve(level);
    });
  });

  return Promise.all(promises);
}

// ----------------------------------
// Deployment Functions
// ----------------------------------

async function deployProxyAdmin(from, props, deployData) {
  const ProxyAdmin = await ethutil.getTruffleContract(ProxyAdminABI.default, {
    from,
  });

  if (needsDeploy(deployData.proxyAdmin)) {
    console.log(`Deploying ProxyAdmin.sol...`);
    proxyAdmin = await ProxyAdmin.new(props);
    console.log(colors.yellow(`  ProxyAdmin: ${proxyAdmin.address}`));
    deployData.proxyAdmin = proxyAdmin.address;
  } else {
    console.log("Using deployed ProxyAdmin.sol:", deployData.proxyAdmin);
    proxyAdmin = await ProxyAdmin.at(deployData.proxyAdmin);
  }
  return proxyAdmin.address;
}

async function deployImplementation(from, props, deployData) {
  const Implementation = await ethutil.getTruffleContract(
    ImplementationABI.default,
    {
      from,
    }
  );
  if (needsDeploy(deployData.implementation)) {
    console.log(`Deploying Statistics.sol...`);
    implementation = await Implementation.new(props);
    console.log(colors.yellow(`  Statistics: ${implementation.address}`));
    deployData.implementation = implementation.address;
  } else {
    console.log("Using deployed Statistics.sol:", deployData.implementation);
    implementation = await Implementation.at(deployData.implementation);
  }

  return implementation.address;
}

async function deployProxyStats(from, props, deployData) {
  const ProxyStats = await ethutil.getTruffleContract(ProxyStatsABI.default, {
    from,
  });
  if (needsDeploy(deployData.proxyStats)) {
    console.log(`Deploying Proxy.sol...`);
    proxyStats = await ProxyStats.new(
      ...[implementation.address, proxyAdmin.address, lux.address],
      props
    );
    console.log(colors.yellow(`  Proxy: ${proxyStats.address}`));
    deployData.proxyStats = proxyStats.address;
  } else {
    console.log("Using deployed Proxy.sol:", deployData.proxyStats);
    proxyStats = await ProxyStats.at(deployData.proxyStats);
  }

  return proxyStats.address;
}

// ----------------------------------
// Utils
// ----------------------------------

async function setStatProxy(from, props) {
  console.log(`Setting proxy in Lux.sol...`);

  const luxContract = new web3.eth.Contract(
    LuxABI.default.abi,
    lux.address
  );

  let proxy_address = await lux.statistics();
  if (needsSetProxy(proxy_address)) {
    await luxContract.methods.setStatistics(proxyStats.address).send({
      from,
      ...props,
    });
  }
}

function needsSetProxy(proxy) {
  return (
    proxy === undefined ||
    proxy === "0x0000000000000000000000000000000000000000"
  );
}

function withoutExtension(str) {
  return str.split(".")[0];
}

function needsDeploy(deployAddress) {
  if (constants.ACTIVE_NETWORK === constants.NETWORKS.LOCAL) return true;
  return deployAddress === undefined || deployAddress === "x";
}

function initWeb3() {
  return new Promise(async (resolve, reject) => {
    let provider;
    if (constants.ACTIVE_NETWORK === constants.NETWORKS.LOCAL) {
      const providerUrl = `${constants.ACTIVE_NETWORK.url}:${constants.ACTIVE_NETWORK.port}`;
      console.log(colors.gray(`connecting web3 to '${providerUrl}'...`));
      provider = new Web3.providers.HttpProvider(providerUrl);
    } else {
      provider = new HDWalletProvider(
        constants.ACTIVE_NETWORK.privKey,
        constants.ACTIVE_NETWORK.url
      );
    }
    //web3 = new ethers.providers.Web3Provider(provider)
    web3 = new Web3(provider);
    ethutil.setWeb3(web3);

    resolve();

    // web3.eth.net.isListening((err, res) => {
    //   if (err) {
    //     console.log('error connecting web3:', err);
    //     reject();
    //     return;
    //   }
    //   console.log(colors.gray(`web3 connected: ${res}\n`));
    //   ethutil.setWeb3(web3);
    //   resolve();
    // });
  }).catch((error) => {
    console.log(error);
  });
}

function loadDeployData(path) {
  try {
    return JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (err) {
    return {};
  }
}

function storeDeployData(path, deployData) {
  console.log(colors.green(`Writing updated deploy data: ${path}`));
  return fs.writeFileSync(path, JSON.stringify(deployData, null, 2), "utf8");
}

function confirmDeployment() {
  return new Promise((resolve, reject) => {
    if (
      PROMPT_ON_DEVELOP ||
      constants.ACTIVE_NETWORK !== constants.NETWORKS.LOCAL
    ) {
      const options = {
        properties: {
          confirmDeployment: {
            description: `Confirm deployment? (y/n)`,
          },
        },
      };

      prompt.start();
      prompt.get(options, (err, res) => {
        if (err) return reject(err);
        resolve(res.confirmDeployment === "y");
      });
    } else {
      resolve(true);
    }
  });
}
