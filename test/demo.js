const { getProductItemCreatedEvent } = require('./util.js');

const ProductSystem = artifacts.require("./ProductSystem.sol");

contract("ProductSystem", accounts => {

  it("Demonstration scenario", async () => {

    const system = await ProductSystem.deployed();

    const { createProductItem, transferOwnership, setItemDatum, payDatumFee, getItemDatum } = system;

    const manufacturer = accounts[1];
    const vehicleManufacturer = accounts[2];
    const truckDealer = accounts[0];

    const manufacturingData = JSON.stringify({serialNumber: 4950, modelSpecifier: "KPV"});
    const inspectionData = JSON.stringify({date: "2020-04-21", result: "ipfs://..."});

    // Step 1-2
    const receipt = await createProductItem(
      "7e49f4c4-74d3-4c1f-a9e9-8d4c6717378a", manufacturingData, {from: manufacturer});
    const { itemId } = getProductItemCreatedEvent(receipt);

    // Step 3-4
    await transferOwnership(itemId, vehicleManufacturer, {from: manufacturer});

    // Step 5-6
    await setItemDatum(itemId, "inspectionResult", inspectionData, { from: vehicleManufacturer });

    // Step 7-8
    await transferOwnership(itemId, truckDealer, {from: vehicleManufacturer});

    // Step 9-10
    await payDatumFee(itemId, "manufacturingData", {from: truckDealer, value: "1000000000000000"});
    await payDatumFee(itemId, "inspectionResult", {from: truckDealer, value: "1000000000000000"});

    // Step 11-12
    const result1 = await getItemDatum(itemId, "manufacturingData");
    const result2 = await getItemDatum(itemId, "inspectionResult");

    // Check result
    assert.equal(result1, manufacturingData);
    assert.equal(result2, inspectionData);
  });

});
