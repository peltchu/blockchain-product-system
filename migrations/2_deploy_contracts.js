var ProductSystem = artifacts.require("./ProductSystem.sol");

// Expire permit approximately after one day
var oneDay = 60 * 60 * 24;

module.exports = function(deployer) {
  deployer.deploy(ProductSystem, oneDay);
};
