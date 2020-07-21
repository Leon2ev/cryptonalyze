//Dotenv.config
require('dotenv').config();

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const api = require('binance');
const TelegramBot = require('node-telegram-bot-api');
const marketFilter = require('./utils/market-filter')
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

//Connection to Telegram API
const token = process.env.TELEGRAM_TOKEN;
const chat_id = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, {polling: true});

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
const pushEachPairToArray = async () => {
  try {
    const data = await getAllPrices()
    const market = await marketFilter(data)
    btcPairs = [market.btcPairs[0], market.btcPairs[1]]
    console.log('Group by market')
  } catch (e) {
    console.error('No data is received', e)
  }
  getKlines()
}

pushEachPairToArray()

/**
Request kline object for each pair on the selected market and period.
Add symbol to each object.
*/
const getKlines = () => {
  console.log('Get klines')
  for (let i = 0; i < btcPairs.length; i++) {
    binanceRest
      .klines({
        symbol: btcPairs[i],
        interval: '1d',
        limit: 7
      })
      .then(data => {
        data.forEach(item => {item['symbol'] = btcPairs[i]})
        createCustomObject(data)
      })
      .catch(err => {console.error(err)});
  }
}

//Create custom object
let tradeStream
let tickerStream
let obj
const createCustomObject = data => {

  let weekVolumeQuote = 0;
  let weekVolume = 0;
  let weekTakerVolumeQuote = 0;
  let weekAverage = 0;
  let coeficient = 0;
  let balance = 0;

  for (let i = 0; i < data.length; i++) {
    const symbol = data[i].symbol
    weekVolumeQuote += parseFloat(data[i].quoteAssetVolume)
    weekVolume += parseFloat(data[i].volume)
    weekTakerVolumeQuote += parseFloat(data[i].takerQuoteAssetVolume)
    weekAverage = weekVolumeQuote / weekVolume
    coeficient = weekVolumeQuote / 672
    balance = weekTakerVolumeQuote - (weekVolumeQuote - weekTakerVolumeQuote)
    tradeStream = streams.trade(symbol)
    tickerStream = streams.ticker(symbol)
    obj = {symbol,
          coeficient,
          tradeStream,
          tickerStream,
          'weekVolumeQuote': weekVolumeQuote.toFixed(2),
          'weekAverage': weekAverage.toFixed(8),
          'balance': balance.toFixed(2)
          }
  }
  firstTimeRun()
}

//Check if code running first time or not
let firstRun = true
let startStreamDone = false
let customObjectArray = []
let tradeStreams = []
let tickerStreams = []
const firstTimeRun = () => {
  if (firstRun === true) {
    customObjectArray.push(obj)
    tradeStreams.push(tradeStream)
    tickerStreams.push(tickerStream)
    if (startStreamDone === false) {
      console.log('First run')
      startStream()
    }
  } else {
    updateCustomObjectArray()
  }
}

//Update old array with new values
const updateCustomObjectArray = () => {
  customObjectArray.forEach(item => {
    if (item.symbol === obj.symbol) {
      item = obj
    }
  })
}

//Start stream if data is ready
const startStream = () => {
  startStreamDone = true
  if (btcPairs.length === customObjectArray.length) {
    console.log('Start websocket')
    getStreams()
  } else {
    console.log('Data not ready')
    setTimeout(() => { startStream() }, 1000)
  }
}

//Add data from a stream to an object with the same symbol.
const fetchData = (stream, array) => {
  array.forEach(item => {
    if (item.symbol === stream.symbol) {
      item['dayVolume'] = stream.quoteAssetVolume
    }
  })
}

//Run ticker and trade stream for each market pair.
const getStreams = () => {
  binanceWS.onCombinedStream(tickerStreams, streamEvent => {
    fetchData(streamEvent.data, customObjectArray)
  })
  binanceWS.onCombinedStream(tickerStreams, streamEvent => {
    fetchData(streamEvent.data)
  })
}
