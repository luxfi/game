const Telephone = artifacts.require('./levels/Telephone.sol');
const TelephoneFactory = artifacts.require('./levels/TelephoneFactory.sol');
const TelephoneAttack = artifacts.require('./attacks/TelephoneAttack.sol');

const Lux = artifacts.require('./Lux.sol');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('Telephone', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await TelephoneFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player did not solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Telephone
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
      Telephone
    );

    const attacker = await TelephoneAttack.new();
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
