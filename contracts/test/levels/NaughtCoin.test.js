const NaughtCoin = artifacts.require('./levels/NaughtCoin.sol');
const NaughtCoinFactory = artifacts.require('./levels/NaughtCoinFactory.sol');
const NaughtCoinAttack = artifacts.require('./attacks/NaughtCoinAttack.sol');

const Lux = artifacts.require('./Lux.sol');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('NaughtCoin', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await NaughtCoinFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player did not solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      NaughtCoin
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
      NaughtCoin
    );
    const attacker = await NaughtCoinAttack.new();

    // Allow the contract to call transfer tokens on your behalf, transferFrom has a different implementation to transfer, so it will be allowed
    let balance = await instance.balanceOf(player);
    await instance.approve(attacker.address, balance);

    // Transfer the tokens out
    await attacker.attack(instance.address, player);

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isTrue(completed);
  });
});
