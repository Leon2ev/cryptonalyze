//Filter allPairs pairs from Binance and group them by the market
const marketFilter = (data) => {
  const btcPairs = [];
  const bnbPairs = [];
  const ethPairs = [];
  const trxPairs = [];
  const xrpPairs = [];
  const usdtPairs = [];
  const busdPairs = [];
  const bidrPairs = [];
  const uahPairs = [];
  const gbpPairs = [];
  const idrtPairs = [];
  const bkrwPairs = [];
  const zarPairs = [];
  const eurPairs = [];
  const rubPairs = [];
  const tryPairs = [];
  const paxPairs = [];
  const usdPairs = [];
  const usdcPairs = [];
  const usdsPairs = [];
  const ngnPairs = [];
  for (let i = 0; i < data.length; i++) {
    if (data[i].symbol.slice(-3) === 'BTC') {
      const object = splitMarketSymbolOne(data[i].symbol)
      btcPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'ETH') {
      const object = splitMarketSymbolOne(data[i].symbol)
      ethPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'BNB') {
      const object = splitMarketSymbolOne(data[i].symbol)
      bnbPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'TRX') {
      const object = splitMarketSymbolOne(data[i].symbol)
      trxPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'XRP') {
      const object = splitMarketSymbolOne(data[i].symbol)
      xrpPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'USDT') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      usdtPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'BUSD') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      busdPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'BIDR') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      bidrPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'UAH') {
      const object = splitMarketSymbolOne(data[i].symbol)
      uahPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'GBP') {
      const object = splitMarketSymbolOne(data[i].symbol)
      gbpPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'IDRT') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      idrtPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'BKRW') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      bkrwPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'ZAR') {
      const object = splitMarketSymbolOne(data[i].symbol)
      zarPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'EUR') {
      const object = splitMarketSymbolOne(data[i].symbol)
      eurPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'RUB') {
      const object = splitMarketSymbolOne(data[i].symbol)
      rubPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'TRY') {
      const object = splitMarketSymbolOne(data[i].symbol)
      tryPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'PAX') {
      const object = splitMarketSymbolOne(data[i].symbol)
      paxPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'USD') {
      const object = splitMarketSymbolOne(data[i].symbol)
      usdPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'USDC') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      usdcPairs.push(object);
    } else if (data[i].symbol.slice(-4) === 'USDS') {
      const object = splitMarketSymbolTwo(data[i].symbol)
      usdsPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'NGN') {
      const object = splitMarketSymbolOne(data[i].symbol)
      ngnPairs.push(object);
    } else {
      console.log(`New market is added ${data[i].symbol}`)
    }
  }
  return {
    btcPairs,
    bnbPairs,
    ethPairs,
    trxPairs,
    xrpPairs,
    usdtPairs,
    busdPairs,
    usdcPairs,
    paxPairs,
    bidrPairs,
    bkrwPairs,
    eurPairs,
    gbpPairs,
    idrtPairs,
    ngnPairs,
    rubPairs,
    tryPairs,
    zarPairs,
    uahPairs
  }
}

//Split single symbol string on market and quote asset and return it as object.
const splitMarketSymbolOne = (data) => {
  const symbol = data;
  const quoteAsset = data.slice(0, -3);
  const market = data.slice(-3);

  return {symbol, quoteAsset, market}
}

const splitMarketSymbolTwo = (data) => {
  const symbol = data;
  const quoteAsset = data.slice(0, -4);
  const market = data.slice(-4);

  return {symbol, quoteAsset, market}
}

module.exports = marketFilter
