const Lux = artifacts.require('./Lux.sol');

const TokenFactory = artifacts.require('./levels/TokenFactory.sol');
const Token = artifacts.require('./levels/Token.sol');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('Token', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await TokenFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should allow the player to solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Token
    );

    // Check init balances
    let balance = new BN(await instance.balanceOf(player));
    //console.log(`init player balance: ${balance}`)
    assert.equal(balance, 20);
    const supply = new BN(await instance.totalSupply.call());
    //console.log(`token supply: ${supply}`)
    assert.equal(supply, 21000000);

    // Check transfer
    await instance.transfer(accounts[2], 1, { from: player });
    balance = await instance.balanceOf(player);
    //console.log(`player balance: ${balance}`)
    assert.equal(balance, 19);

    // Overflow
    await instance.transfer(accounts[2], 20, { from: player });
    balance = await instance.balanceOf(player);
    //console.log(`player balance: ${balance}`)
    assert.equal(balance, 1.157920892373162e77);

    // Check win.
    const ethCompleted = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );
    assert.equal(ethCompleted, true);
  });
});
