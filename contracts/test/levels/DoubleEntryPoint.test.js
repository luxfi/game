const DoubleEntryPoint = artifacts.require('./levels/DoubleEntryPoint.sol');
const DoubleEntryPointFactory = artifacts.require(
  './levels/DoubleEntryPointFactory.sol'
);
const DetectionBot = artifacts.require('./attacks/DetectionBot.sol');
const Forta = artifacts.require('./levels/Forta.sol');

const Lux = artifacts.require('./Lux.sol');
const { web3 } = require('openzeppelin-test-helpers/src/setup');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('DoubleEntryPoint', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await DoubleEntryPointFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player did not solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      DoubleEntryPoint
    );

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isFalse(completed);
  });

  it('should allow the player to solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      DoubleEntryPoint
    );

    const fortaAddress = await instance.forta();

    const fortaContract = await Forta.at(fortaAddress);

    const detectionBot = await DetectionBot.new(fortaAddress, { from: player });

    await fortaContract.setDetectionBot(detectionBot.address, { from: player });

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isTrue(completed);
  });
});
