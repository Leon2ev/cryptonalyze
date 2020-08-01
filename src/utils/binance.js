const api = require('binance');
const marketFilter = require('./market-filter')
const sendTelegramMessage = require('./telegram')

//Connection to Binance API
const binanceWS = new api.BinanceWS(true);
const binanceRest = new api.BinanceRest({
  timeout: 15000, // Optional, defaults to 15000, is the request time out in milliseconds
  recvWindow: 5000, // Optional, defaults to 5000, increase if you're getting timestamp errors
  disableBeautification: false,
  handleDrift: false,
  baseUrl: 'https://api.binance.com/',
  requestOptions: {}
});
const streams = binanceWS.streams;

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

//Creacte stream string for each pair on the market and store it inside an array.
const streamsArray = async () => {
  const market = await getMarket()
  const streamsArray = []
  market.forEach(pair => {
    const tradeStream = streams.trade(pair.symbol)
    const klineStream = streams.kline(pair.symbol, '1d')
    streamsArray.push(tradeStream, klineStream)
  })
  return streamsArray
}

//Receive array of streams and run stream for each item from an array.
const startStreams = async (callback) => {
  console.log('Streams are started')
  const combinedStreams = await streamsArray()
  binanceWS.onCombinedStream(combinedStreams, streamEvent => {
    callback(streamEvent.data)
  })
}

const filterStreamData = (stream) => {
  if (stream.eventType === 'kline') {
    getKlineStartTime(stream)
    customizeKlineStreamObject(stream)
  } else if (stream.eventType === 'trade') {
    actualDataArray.forEach(item => {
      if (item.symbol === stream.symbol) {
        const tradeCost = stream.price * stream.quantity
        if (tradeCost > 0.3) {
          sendTelegramMessage(stream, item, tradeCost)
        }
      }
    })
  }
}

const customizeKlineStreamObject = ({kline}) => {
  const object = {
    openTime: kline.startTime,
    open: kline.open,
    high: kline.high,
    low: kline.low,
    close: kline.close,
    volume: kline.volume,
    closeTime: kline.endTime,
    quoteAssetVolume: kline.quoteVolume,
    trades: kline.trades,
    takerBaseAssetVolume: kline.volumeActive,
    takerQuoteAssetVolume: kline.quoteVolumeActive,
    ignored: kline.ignored,
    symbol: kline.symbol
  }
  customStreamKlineObject(object)
}

//Add incomming stream data to an existing seven days kline object.
const customStreamKlineObject = (object) => {
  const array = marketsArray
  let symbol
  let quoteAsset
  let market
  let weekVolumeQuote = 0;
  let weekVolumeTotal = 0;
  let weekTakerVolumeQuote = 0
  array.forEach(pair => {
    if (pair.symbol === object.symbol) {
      symbol = pair.symbol
      quoteAsset = pair.quoteAsset
      market = pair.market
      weekVolumeQuote = parseFloat(pair.weekVolumeQuote) + parseFloat(object.quoteAssetVolume)
      weekVolumeTotal = parseFloat(pair.weekVolumeTotal) + parseFloat(object.volume)
      weekTakerVolumeQuote = parseFloat(pair.weekTakerVolumeQuote) + parseFloat(object.takerQuoteAssetVolume)
    }
  })
  const newObject = {
    symbol,
    quoteAsset,
    market,
    weekVolumeQuote,
    weekVolumeTotal,
    weekTakerVolumeQuote
  }

  createCustomObject(newObject, addToArrayOrUpdateIfExist)
}

//Check if new kline is open to calculate privious kline endTime.
let endTimeForKlines
const getKlineStartTime = async ({kline}) => {
  if (endTimeForKlines === undefined || (endTimeForKlines + 1) < kline.startTime) {
    endTimeForKlines = kline.startTime - 1
    getKlines(marketPairs, endTimeForKlines)
  }
}

// App starter
const startApp = () => {
  startStreams(filterStreamData)
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

//Customize seven days object.
const createCustomObject = (data, callback) => {
  const weekAveragePrice = data.weekVolumeQuote / data.weekVolumeTotal
  const balance = 2 * data.weekTakerVolumeQuote - data.weekVolumeQuote
  data.coeficient = data.weekVolumeQuote / 672
  data.weekVolumeQuote = data.weekVolumeQuote.toFixed(2)
  data.weekVolumeTotal = data.weekVolumeTotal.toString()
  data.weekTakerVolumeQuote = data.weekTakerVolumeQuote.toFixed(2)
  data.weekAveragePrice = weekAveragePrice.toFixed(8)
  data.balance = balance.toFixed(2)
  callback(data)
}

/**
Buffer array get custom trading pair objects one by one. When all objects
received, add data to market array and empy buffer.
*/
let bufferMarketArray = []
let marketsArray = []
const addObjectToArray = (object) => {
  bufferMarketArray.push(object)
  if (marketPairs.length === bufferMarketArray.length) {
    marketsArray = [...bufferMarketArray]
    bufferMarketArray = []
  }
}

/**
Create an array that stores objects with last available data. Update existing
object if new data is comming.
*/
let actualDataArray = []
const addToArrayOrUpdateIfExist = (object) => {
  if (actualDataArray.some(pair => pair.symbol === object.symbol)) {
    actualDataArray.forEach(pair => {
      if (pair.symbol === object.symbol) {
        pair.coeficient = object.coeficient
        pair.weekVolumeQuote = object.weekVolumeQuote
        pair.weekAveragePrice = object.weekAveragePrice
        pair.balance = object.balance
      }
    })
  } else if (object != undefined) {
    actualDataArray.push(object)
  }
}


module.exports = startApp
