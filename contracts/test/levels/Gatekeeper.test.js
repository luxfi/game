const GatekeeperOneFactory = artifacts.require(
  './levels/GatekeeperOneFactory.sol'
);
const GatekeeperTwoFactory = artifacts.require(
  './levels/GatekeeperTwoFactory.sol'
);
const GatekeeperOne = artifacts.require('./levels/GatekeeperOne.sol');
const GatekeeperTwo = artifacts.require('./levels/GatekeeperTwo.sol');
const GatekeeperOneAttack = artifacts.require(
  './attacks/GatekeeperOneAttack.sol'
);
const GatekeeperTwoAttack = artifacts.require(
  './attacks/GatekeeperTwoAttack.sol'
);

const Lux = artifacts.require('./Lux.sol');
const {
  BN,
  constants,
  expectEvent,
  expectRevert,
} = require('openzeppelin-test-helpers');
const utils = require('../utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('GatekeeperOne', function (accounts) {
  let lux;
  let level;
  let owner = accounts[1];
  let player = accounts[0];
  let statproxy;

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await GatekeeperOneFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player didnt solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      GatekeeperOne
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
      GatekeeperOne
    );

    const attacker = await GatekeeperOneAttack.new(instance.address, {
      from: player,
    });

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isTrue(completed);
  });
});

contract('GatekeeperTwo', function (accounts) {
  let lux;
  let level;
  let player = accounts[0];

  before(async function () {
    lux = await utils.getLuxWithStatsProxy();
    level = await GatekeeperTwoFactory.new();
    await lux.registerLevel(level.address);
  });

  it('should fail if the player didnt solve the level', async function () {
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      GatekeeperTwo
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
      GatekeeperTwo
    );

    const attacker = await GatekeeperTwoAttack.new(instance.address, {
      from: player,
    });

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );

    assert.isTrue(completed);
  });
});
