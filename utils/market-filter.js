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
      const object = splitMarketSymbol(data[i].symbol)
      btcPairs.push(object);
    } else if (data[i].symbol.slice(-3) === 'ETH') {
      ethPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'BNB') {
      bnbPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'TRX') {
      trxPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'XRP') {
      xrpPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'USDT') {
      usdtPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'BUSD') {
      busdPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'BIDR') {
      bidrPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'UAH') {
      uahPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'GBP') {
      gbpPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'IDRT') {
      idrtPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'BKRW') {
      bkrwPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'ZAR') {
      zarPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'EUR') {
      eurPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'RUB') {
      rubPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'TRY') {
      tryPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'PAX') {
      paxPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'USD') {
      usdPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'USDC') {
      usdcPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-4) === 'USDS') {
      usdsPairs.push(data[i].symbol);
    } else if (data[i].symbol.slice(-3) === 'NGN') {
      ngnPairs.push(data[i].symbol);
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

const splitMarketSymbol = (data) => {
  const symbol = data;
  const quoteAsset = data.slice(0, -3);
  const market = data.slice(-3);

  return {symbol, quoteAsset, market}
}

module.exports = marketFilter
