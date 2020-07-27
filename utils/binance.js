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

//Get prices for all pairs from Binance
const getAllPrices = async () => {
  try {
    return await binanceRest.allPrices()
  } catch (e) {
    console.error('Missing Connection with Binance', e)
  }
}

//Receive all trading pairs. Filter and store them by market.
let marketPairs
const getMarket = async () => {
  try {
    const data = await getAllPrices()
    const market = await marketFilter(data)
    const markets = await combineArrays(market.usdtPairs);
    marketPairs = markets
    return markets
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

//Create array streams from market for use in @onCombinedStream
const streamsArray = async () => {
  const market = await getMarket()
  const streamsArray = []
  market.forEach(pair => {
    const tradeStream = streams.trade(pair.symbol)
    const klineStream = streams.kline(pair.symbol, '5m')
    streamsArray.push(tradeStream, klineStream)
  })
  return streamsArray
}

//Run trade streams for each pair from selected market.
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
    customStreamKlineObject(stream)
  } else if (stream.eventType === 'trade') {
    marketsArray.forEach(item => {
      if (item.symbol === stream.symbol) {
        const tradeCost = stream.price * stream.quantity
        if (tradeCost > 30000) {
          sendTelegramMessage(stream, item, tradeCost)
        }
      }
    })
  }
}

const customStreamKlineObject = ({kline}) => {
  const array = marketsArray
  array.forEach(pair => {
    if (pair.symbol === kline.symbol) {
      pair.symbol = kline.symbol
      pair.weekVolumeQuote = parseFloat(pair.weekVolumeQuote)
      pair.weekVolumeTotal = parseFloat(pair.weekVolumeTotal)
      pair.weekTakerVolumeQuote = parseFloat(pair.weekTakerVolumeQuote)
      pair.weekVolumeQuote += parseFloat(kline.quoteVolume)
      pair.weekVolumeTotal += parseFloat(kline.volume)
      pair.weekTakerVolumeQuote += parseFloat(kline.quoteVolumeActive)
      createCustomObject(pair)
    }
  })

  // const symbol = kline.symbol
  // const quoteVolume = parseFloat(kline.quoteVolume)
  // const volume = parseFloat(kline.volume)
  // const quoteVolumeTaker = parseFloat(kline.quoteVolumeActive)
  // return {
  //   symbol,
  //   quoteVolume,
  //   volume,
  //   quoteVolumeTaker
  // }
}

//Check if new kline is open to calculate privious kline endTime.
let endTimeForKlines
const getKlineStartTime = async ({kline}) => {
  if (endTimeForKlines === undefined || (endTimeForKlines + 1) < kline.startTime) {
    endTimeForKlines = kline.startTime - 1
    console.log(endTimeForKlines)
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
        interval: '5m',
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

//Create one 7 day object from 7 single day objects.
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

  createCustomObject(object)
}

//Calculate custom variables and add then to 7day kline object.
const createCustomObject = (data) => {
  const weekAveragePrice = data.weekVolumeQuote / data.weekVolumeTotal
  const balance = 2 * data.weekTakerVolumeQuote - data.weekVolumeQuote
  data.coeficient = data.weekVolumeQuote / 672
  data.weekVolumeQuote = data.weekVolumeQuote.toFixed(2)
  data.weekVolumeTotal = data.weekVolumeTotal.toString()
  data.weekTakerVolumeQuote = data.weekTakerVolumeQuote.toFixed(2)
  data.weekAveragePrice = weekAveragePrice.toFixed(8)
  data.balance = balance.toFixed(2)
  addObjectToArray(data)
}

/**
Buffer array get custom trading pair objects one by one. When all objects
received, add data to market array and empy buffer.
*/
let bufferMarketArray = []
let marketsArray = []
const addObjectToArray = (object) => {
  if (marketsArray.length === marketPairs.length) {
    marketsArray.forEach(pair => {
      if (pair.symbol === object.symbol) {
        pair = object
      }
    })
  } else {
    bufferMarketArray.push(object)
    if (marketPairs.length === bufferMarketArray.length) {
      marketsArray = [...bufferMarketArray]
      bufferMarketArray = []
    }
  }
}

module.exports = startApp
