//Dotenv.config
require('dotenv').config();

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const api = require('binance');
const marketFilter = require('./utils/market-filter')
const sendTelegramMessage = require('./utils/telegram')
const port = process.env.PORT;

server.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});

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

/**
Check if new 15min kline is open.
When new kline is open sends request to update data.
*/
let newKlineTime
binanceWS.onKline('BNBBTC', '1m', data => {
  if (newKlineTime === undefined) {
    newKlineTime = data.kline.startTime;
  } else if (newKlineTime < data.kline.startTime) {
    newKlineTime = data.kline.startTime
    getKlines()
  }
});

//Receive all trading pairs. Filter and store them by market.
let btcPairs
const getMarket = async () => {
  try {
    const data = await getAllPrices()
    const market = await marketFilter(data)
    btcPairs = market.btcPairs
    return btcPairs
  } catch (e) {
    console.error('No data is received', e)
  }
}

/**
Request kline object for each pair on the selected market and period.
Add symbol to each object.
*/
const getKlines = async () => {
  const market = await getMarket()
  console.log('Get klines')
  for (let i = 0; i < market.length; i++) {
    binanceRest
      .klines({
        symbol: market[i].symbol,
        interval: '1d',
        limit: 7
      })
      .then(data => {
        data.forEach(item => {
          item.symbol = market[i].symbol,
          item.quoteAsset = market[i].quoteAsset,
          item.market = market[i].market
        })
        sevenDaysObject(data)
      })
      .catch(e => {console.error(e)});
  }
}

//Start of a program
getKlines()

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

//Create array of trade streams from market for use in @onCombinedStream
const tradeStreamsArray = async () => {
  const market = await getMarket()
  const streamsArray = []
  let stream
  market.forEach(pair => {
    stream = streams.trade(pair.symbol)
    streamsArray.push(stream)
  })
  return streamsArray
}

/**
Buffer array get custom trading pair objects one by one. When all objects
received, add data to market array and empy buffer.
*/
let bufferMarketArray = []
let marketsArray = []
let streamsStarted
const addObjectToArray = (object) => {
  bufferMarketArray.push(object)
  if (btcPairs.length === bufferMarketArray.length) {
    marketsArray = [...bufferMarketArray]
    bufferMarketArray = []
    if (!streamsStarted) {
      streamsStarted = true
      startStreams(filterStreamData)
    }
  }
}

//Run trade streams for each pair from selected market.
const startStreams = async (callback) => {
  console.log('Streams are started')
  const tradeStreams = await tradeStreamsArray()
  binanceWS.onCombinedStream(tradeStreams, streamEvent => {
    callback(streamEvent.data)
  })
}

//Filter stream data. For filter using one week historic data.
const filterStreamData = (stream) => {
  const array = marketsArray
  array.forEach(item => {
    if (item.symbol === stream.symbol) {
      const tradeCost = stream.price * stream.quantity
      if (tradeCost > item.coeficient) {
        sendTelegramMessage(stream, item, tradeCost)
      }
    }
  })
}
