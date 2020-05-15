pragma solidity >=0.4.16 <0.7.0;

contract ProductSystem {

  uint leaseTimeSeconds;

  struct ItemDatum {
    address payable contributor;
    mapping(address => uint) permits;
    string datum;
  }

  struct ProductItem {
    uint itemId;
    address owner;
    mapping(string => ItemDatum) data;
  }

  uint itemCount;
  mapping(uint => ProductItem) private items;

  event ProductItemCreated(uint itemId, string correlationId, address actor);


  constructor(uint _leaseTimeSeconds) public {
    leaseTimeSeconds = _leaseTimeSeconds;
  }


  modifier onlyOwner(uint itemId) {
    require(
      msg.sender == items[itemId].owner,
      "Operation permitted only by owner"
    );
    _;
  }

  modifier onlyNotContributor(uint _itemId, string memory _key) {
    require(
      items[_itemId].data[_key].contributor != msg.sender,
      "Only applicable to actors who are not contributors of the datum"
    );
    _;
  }


  function createProductItem(
    string memory correlationId,
    string memory _manufacturingData
  ) public returns (uint itemId) {

    uint newItemId = ++itemCount;

    ProductItem memory newProduct = ProductItem({
      itemId: newItemId,
        owner: msg.sender
    });
    items[newItemId] = newProduct;

    setItemDatum(newItemId, "manufacturingData", _manufacturingData);

    emit ProductItemCreated(newItemId, correlationId, msg.sender);

    return newItemId;
  }


  function setItemDatum(
	  uint _itemId,
	  string memory _key,
	  string memory _datum
  ) public onlyOwner(_itemId) {
    items[_itemId].data[_key] = ItemDatum(msg.sender, _datum);
  }


  function payDatumFee(uint _itemId, string memory _key) public payable onlyNotContributor(_itemId, _key) {
    require(msg.value == 1000000000000000, "Costs 0.001 eth");
    items[_itemId].data[_key].contributor.transfer(msg.value);
    items[_itemId].data[_key].permits[msg.sender] = block.timestamp;
  }


  function getItemDatum(uint _itemId, string memory _key) public view returns (string memory datum) {

    if (msg.sender != items[_itemId].data[_key].contributor) {
      uint permitTimestamp = items[_itemId].data[_key].permits[msg.sender];
      require(permitTimestamp + leaseTimeSeconds >= block.timestamp, "No permit");
    }

    return items[_itemId].data[_key].datum;
  }


  function transferOwnership(
    uint _itemId,
    address _newOwner
  ) public onlyOwner(_itemId) {
    items[_itemId].owner = _newOwner;
  }

  function getOwner(uint _itemId) public view returns (address owner) {
    return items[_itemId].owner;
  }

}
