const api = require('binance');
const filterByMarket = require('./market-filter');
const createCustomObject = require('./data-for-period');

const binanceRest = new api.BinanceRest({
  timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
  recvWindow: 5000, // Optional, defaults to 5000, increase if you're getting timestamp errors
  disableBeautification: false,
  handleDrift: false,
  baseUrl: 'https://api.binance.com/',
  requestOptions: {}
});

//Receive all trading pairs. Filter and store them by market.
let selectedMarkets;
const getMarket = async () => {
  try {
    const data = await binanceRest.allPrices();
    const markets = filterByMarket(data);
    selectedMarkets = mergeArrays(markets.btcPairs);
    return selectedMarkets;
  } catch (e) {
    console.error('No data is received', e);
  }
};

//Create one array from selected markets.
const mergeArrays = (...args) => {
  const array = [];
  args.forEach(arg => {
    array.push(...arg);
  });
  return array;
};

/**
Request kline object for each pair on the selected market and period.
Add symbol to each object.
*/
const getKlines = (market, endTime, interval, limit) => {
  for (let i = 0; i < market.length; i++) {
    binanceRest
      .klines({
        symbol: market[i].symbol,
        interval,
        limit,
        endTime
      })
      .then(data => {
        data.forEach(item => {
          item.symbol = market[i].symbol,
          item.baseAsset = market[i].baseAsset,
          item.quoteAsset = market[i].quoteAsset;
        });
        sevenDaysObject(data);
      })
      .catch(e => {
        console.error(e);
      });
  }
};

//Create one object by adding seven single day objects to each other.
const sevenDaysObject = (data) => {

  let symbol;
  let baseAsset;
  let quoteAsset;
  let weekVolumeQuote = 0;
  let weekVolumeTotal = 0;
  let weekTakerVolumeQuote = 0;

  data.forEach(day => {
    symbol = day.symbol;
    baseAsset = day.baseAsset;
    quoteAsset = day.quoteAsset;
    weekVolumeQuote += parseFloat(day.quoteAssetVolume);
    weekVolumeTotal += parseFloat(day.volume);
    weekTakerVolumeQuote += parseFloat(day.takerQuoteAssetVolume);
  });

  const object = {
    symbol,
    baseAsset,
    quoteAsset,
    weekVolumeQuote,
    weekVolumeTotal,
    weekTakerVolumeQuote
  };

  createCustomObject(object, addObjectToArray);
};

/**
Buffer array get custom trading pair objects one by one. When all objects
received, add data to market array and empty buffer.
*/
let bufferMarketsArray = [];
let marketsArray = [];
const addObjectToArray = (object) => {
  bufferMarketsArray.push(object);
  if (selectedMarkets.length === bufferMarketsArray.length) {
    marketsArray = [...bufferMarketsArray];
    bufferMarketsArray = [];
  }
};

const getMarketsArray = () => {
  return marketsArray;
};

module.exports = { getMarket, getKlines, getMarketsArray };
