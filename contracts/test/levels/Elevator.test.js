const ElevatorFactory = artifacts.require('./levels/ElevatorFactory.sol');
const ElevatorAttack = artifacts.require('./attacks/ElevatorAttack.sol');
const Elevator = artifacts.require('./levels/Elevator.sol');

const Lux = artifacts.require('./Lux.sol');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('Elevator', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await ElevatorFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player didnt solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Elevator
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
      Elevator
    );

    const attacker = await ElevatorAttack.new();
    await attacker.attack(instance.address);

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isTrue(completed);
  });
});
