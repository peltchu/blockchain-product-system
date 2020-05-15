const { waitSeconds, getProductItemCreatedEvent } = require('./util.js');

const ProductSystem = artifacts.require("./ProductSystem.sol");

contract("ProductSystem", accounts => {

  describe("Test", () => {

    it("Creating a new product should work and fire the associated event with the correct params", async () => {

      const system = await ProductSystem.deployed();

      const receipt1 = await system.createProductItem("correlation 1", "data");
      const receipt2 = await system.createProductItem("correlation 2", "data");

      const event1 = getProductItemCreatedEvent(receipt1);
      const event2 = getProductItemCreatedEvent(receipt2);

      assert.equal(event1.itemId, 1);
      assert.equal(event1.correlationId, "correlation 1");
      assert.equal(event2.itemId, 2);
      assert.equal(event2.correlationId, "correlation 2");
    });


    it("Changing ownership should work when the actor is the current owner", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      const initialOwner = await system.getOwner(itemId);

      await system.transferOwnership(itemId, accounts[1], {from: accounts[0]});

      const newOwner = await system.getOwner(itemId);

      assert.equal(initialOwner, accounts[0], "initial owner");
      assert.equal(newOwner, accounts[1], "new owner");
    });


    it("Changing ownership should fail when the actor is not the current owner", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      try {
        await system.transferOwnership(itemId, accounts[1], { from: accounts[1] });
      } catch (error) {
        const expectedFailure = error.message.search("Operation permitted only by owner") >= 0;
        assert.equal(expectedFailure, true, "Unexpected failure");
        return;
      }

      assert.fail("Should have failed");
    });


    it("Setting data should work when the actor is the current owner", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      await system.setItemDatum(itemId, "test", "value", {from: accounts[0]});
      const datum = await system.getItemDatum(itemId, "test", {from: accounts[0]});

      assert.equal(datum, "value");
    });


    it("Setting data should fail if the actor is not the current owner", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      try {
        await system.setItemDatum(itemId, "test", "value", { from: accounts[1] });
      } catch (error) {
        const expectedFailure = error.message.search("Operation permitted only by owner") >= 0;
        assert.equal(expectedFailure, true, "Unexpected failure");
        return;
      }

      assert.fail("Should have failed");
    });


    it("Paying for datum that is not contributed by the actor should withdraw a fee " + 
      "and deposit it to the contributor of datum", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      const contributorBalanceBefore = await web3.eth.getBalance(accounts[0]);
      const actorBalanceBefore = await web3.eth.getBalance(accounts[1]);

      await system.payDatumFee(itemId, "manufacturingData", { from: accounts[1], value: "1000000000000000"});

      const contributorBalanceAfter = await web3.eth.getBalance(accounts[0]);
      const actorBalanceAfter = await web3.eth.getBalance(accounts[1]);

      const contributorEtherGained = (contributorBalanceAfter - contributorBalanceBefore) / 1000000000000000000;
      const actorEtherSpent = (actorBalanceBefore - actorBalanceAfter) / 1000000000000000000;

      assert.equal(contributorEtherGained == 0.001, true, "Contributor ether gained")
      assert.equal(actorEtherSpent > 0.001, true, "Actor ether used");
    });


    it("Accessing data that the actor has contributed should work without paying a fee", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[0]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      const data = await system.getItemDatum(itemId, "manufacturingData");

      assert.equal(data, "data", "data");
    });


    it("Accessing data contributed by another actor should fail if permit has not been paid for", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[1]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      try {
        await system.getItemDatum(itemId, "manufacturingData");
      } catch (error) {
        const expectedFailure = error.message.search("No permit") >= 0;
        assert.equal(expectedFailure, true, "Unexpected failure");
        return;
      }

      assert.fail("Should have failed");
    });


    it("Accessing data contributed by another actor should work after paying for a permit", async () => {

      const system = await ProductSystem.deployed();

      const receipt = await system.createProductItem("1", "data", {from: accounts[1]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      await system.payDatumFee(itemId, "manufacturingData", {value: "1000000000000000"});

      const data = await system.getItemDatum(itemId, "manufacturingData");

      assert.equal(data, "data", "data");
    });


    it("Accessing data within the permit timeout should work without paying again", async () => {

      // Lease expiration: 10 seconds
      const system = await ProductSystem.new(10);

      const receipt = await system.createProductItem("1", "data", {from: accounts[1]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      await system.payDatumFee(itemId, "manufacturingData", {value: "1000000000000000"});

      const data = await system.getItemDatum(itemId, "manufacturingData");

      // Force new block to be mined in truffle test so that block timestamp changes
      await system.createProductItem("2", "", {from: accounts[1]});

      const dataAfter = await system.getItemDatum(itemId, "manufacturingData");

      assert.equal(data, "data", "data");
      assert.equal(dataAfter, "data", "dataAfterTimeout");
    });


    it("Access should expire after the timeout", async () => {

      // Lease expiration: 10 seconds
      const system = await ProductSystem.new(10);

      const receipt = await system.createProductItem("1", "data", {from: accounts[1]});
      const { itemId } = getProductItemCreatedEvent(receipt);

      await system.payDatumFee(itemId, "manufacturingData", {value: "1000000000000000"});

      const data = await system.getItemDatum(itemId, "manufacturingData");

      assert.equal(data, "data", "data");

      await waitSeconds(15);

      // Force new block to be mined in truffle test so that block timestamp changes
      await system.createProductItem("2", "", {from: accounts[1]});

      try {
        await system.getItemDatum(itemId, "manufacturingData");
      } catch (error) {
        const expectedFailure = error.message.search("No permit") >= 0;
        assert.equal(expectedFailure, true, "Unexpected failure");
        return;
      }

      assert.fail("Should have failed");
    });

  });

});
