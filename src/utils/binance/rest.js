const api = require('binance');
const marketFilter = require('./market-filter')
const createCustomObject = require('./data-for-period')

const binanceRest = new api.BinanceRest({
  timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
  recvWindow: 5000, // Optional, defaults to 5000, increase if you're getting timestamp errors
  disableBeautification: false,
  handleDrift: false,
  baseUrl: 'https://api.binance.com/',
  requestOptions: {}
});

//Receive all trading pairs. Filter and store them by market.
let marketPairs
const getMarket = async () => {
  try {
    const data = await binanceRest.allPrices()
    const market = await marketFilter(data)
    const markets = await combineArrays(market.btcPairs);
    // marketPairs = [markets[0], markets[1]]
    marketPairs = markets
    return marketPairs
  } catch (e) {
    console.error('No data is received', e)
  }
}

//Create one array from selected markets.
const combineArrays = (...args) => {
  const array = []
  args.forEach(arg => {
    array.push(...arg)
  })
  return array
}

/**
Request kline object for each pair on the selected market and period.
Add symbol to each object.
*/
const getKlines = (market, time) => {
  for (let i = 0; i < market.length; i++) {
    binanceRest
      .klines({
        symbol: market[i].symbol,
        interval: '1d',
        limit: 7,
        endTime: time
      })
      .then(data => {
        data.forEach(item => {
          item.symbol = market[i].symbol,
          item.quoteAsset = market[i].quoteAsset,
          item.market = market[i].market
        })
        sevenDaysObject(data)
      })
      .catch(e => {
        console.error(e);
      });
  }
}

//Create one object by adding seven single day objects to each other.
const sevenDaysObject = (data) => {

  let symbol
  let quoteAsset
  let market
  let weekVolumeQuote = 0;
  let weekVolumeTotal = 0;
  let weekTakerVolumeQuote = 0;

  data.forEach(day => {
    symbol = day.symbol
    quoteAsset = day.quoteAsset
    market = day.market
    weekVolumeQuote += parseFloat(day.quoteAssetVolume)
    weekVolumeTotal += parseFloat(day.volume)
    weekTakerVolumeQuote += parseFloat(day.takerQuoteAssetVolume)
  })

  const object = {symbol,
                  quoteAsset,
                  market,
                  weekVolumeQuote,
                  weekVolumeTotal,
                  weekTakerVolumeQuote
                  }

  createCustomObject(object, addObjectToArray)
}

/**
Buffer array get custom trading pair objects one by one. When all objects
received, add data to market array and empy buffer.
*/
let bufferMarketsArray = []
let marketsArray = []
const addObjectToArray = (object) => {
  bufferMarketsArray.push(object)
  if (marketPairs.length === bufferMarketsArray.length) {
    marketsArray = [...bufferMarketsArray]
    bufferMarketsArray = []
  }
}

const getMarketsArray = async () => {
  return marketsArray
}

module.exports = { getMarket, getKlines, getMarketsArray }
