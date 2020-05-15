module.exports = {

  waitSeconds: seconds =>
    new Promise(resolve => setTimeout(resolve, seconds * 1000)),

  getProductItemCreatedEvent: receipt => {
    const ev = receipt.logs[0]
    assert.equal(ev.event, "ProductItemCreated");
    return { itemId: ev.args.itemId.toNumber(), correlationId: ev.args.correlationId }
  }

}