module.exports = function extractSellerId(url) {

  const match = url.match(/seller=([A-Z0-9]+)/);

  return match ? match[1] : null;

};