const InstanceFactory = artifacts.require('./levels/InstanceFactory.sol');
const Instance = artifacts.require('./attacks/Instance.sol');
const Lux = artifacts.require('./Lux.sol');

const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('Instance', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await InstanceFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should allow the player to solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Instance,
      { from: player }
    );

    const password = await instance.password.call();
    await instance.authenticate(password);
    const clear = await instance.getCleared();
    assert.equal(clear, true);

    // Factory check
    const ethCompleted = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );
    assert.equal(ethCompleted, true);
  });
});
