/*eslint no-undef: "off"*/
const Lux = artifacts.require('./Lux.sol');
const DummyFactory = artifacts.require('./levels/DummyFactory.sol');
const Dummy = artifacts.require('./levels/Dummy.sol');
const FallbackFactory = artifacts.require('./levels/FallbackFactory.sol');
const Manufactured = artifacts.require('./levels/Manufactured.sol');
const { expectRevert } = require('openzeppelin-test-helpers');
const utils = require('./utils/TestUtils');
const { ethers, upgrades } = require('hardhat');

contract('Lux', function (accounts) {
  // ----------------------------------
  // Before
  // ----------------------------------

  let owner = accounts[0];
  let player = accounts[1];
  let player2 = accounts[2];
  let lux;
  let ProxyStats;
  let statistics;

  before(async function () {
    lux = await Lux.new();
    const implementation = await ethers.getContractFactory('Statistics');
    ProxyStats = await upgrades.deployProxy(implementation, [
      lux.address,
    ]);
    await lux.setStatistics(ProxyStats.address);

    statistics = await ethers.getContractAt('Statistics', ProxyStats.address);
  });

  it(`should not allow a player to manufacture a solution instance`, async function () {
    const level = await FallbackFactory.new();
    await lux.registerLevel(level.address, { from: owner });
    expect(await statistics.doesLevelExist(level.address)).to.equal(true);

    // Instead of solving the instance, the player manufactures an instance
    // with the desired state:
    // const instance = await utils.createLevelInstance(lux, level.address, player, Fallback)
    const instance = await Manufactured.new();

    await expectRevert.unspecified(
      lux.submitLevelInstance(instance.address, { from: player })
    );
  });

  it(`should not allow player A to use player's B instance to complete a level`, async function () {
    const level = await DummyFactory.new();
    await lux.registerLevel(level.address, { from: owner });
    expect(await statistics.doesLevelExist(level.address)).to.equal(true);

    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Dummy
    );

    await instance.setCompleted(true);
    const completed = await instance.completed();
    assert.equal(completed, true);

    await expectRevert.unspecified(
      lux.submitLevelInstance(instance.address, { from: player2 })
    );
  });

  it(`should not allow a player to generate 2 completion logs with the same instance`, async function () {
    const level = await DummyFactory.new();
    await lux.registerLevel(level.address, { from: owner });
    expect(await statistics.doesLevelExist(level.address)).to.equal(true);

    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Dummy
    );
    await instance.setCompleted(true);
    const completed = await instance.completed();
    assert.equal(completed, true);

    const ethCompleted = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );
    assert.equal(ethCompleted, true);

    expect(await statistics.isLevelCompleted(player, level.address)).to.equal(
      true
    );

    // Resubmit instance
    await expectRevert.unspecified(
      lux.submitLevelInstance(instance.address)
    );
  });

  it(`should provide instances and verify completion`, async function () {
    const level = await DummyFactory.new();
    await lux.registerLevel(level.address, { from: owner });
    expect(await statistics.doesLevelExist(level.address)).to.equal(true);

    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Dummy
    );
    await instance.setCompleted(true);
    const completed = await instance.completed();
    assert.equal(completed, true);

    const ethCompleted = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );
    assert.equal(ethCompleted, true);

    expect(await statistics.isLevelCompleted(player, level.address)).to.equal(
      true
    );
  });

  it(`should provide instances and verify non-complettion`, async function () {
    const level = await DummyFactory.new();
    await lux.registerLevel(level.address, { from: owner });
    expect(await statistics.doesLevelExist(level.address)).to.equal(true);
    const instance = await utils.createLevelInstance(
      lux,
      level.address,
      player,
      Dummy
    );

    const completed = await utils.submitLevelInstance(
      lux,
      level.address,
      instance.address,
      player
    );
    assert.equal(completed, false);
  });

  it(`should not provide instances to non-registered level factories`, async function () {
    const level = await DummyFactory.new();
    await expectRevert.unspecified(
      lux.createLevelInstance(level.address, { from: player })
    );
    expect(await statistics.doesLevelExist(level.address)).to.equal(false);
  });

  it(`should not allow anyone but the owner to upload a level`, async function () {
    const level = await DummyFactory.new();
    await expectRevert.unspecified(
      lux.registerLevel(level.address, { from: player })
    );
    expect(await statistics.doesLevelExist(level.address)).to.equal(false);
  });
});
