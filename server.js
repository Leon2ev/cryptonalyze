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
let tradeStreams
const getMarket = async () => {
  try {
    const data = await getAllPrices()
    const market = await marketFilter(data)
    btcPairs = market.btcPairs
    tradeStreams = tradeStreamsArray(btcPairs)
    console.log('Group by market')
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
  const btcPairs = await getMarket()
  console.log('Get klines')
  for (let i = 0; i < btcPairs.length; i++) {
    binanceRest
      .klines({
        symbol: btcPairs[i],
        interval: '1d',
        limit: 7
      })
      .then(data => {
        data.forEach(item => {item.symbol = btcPairs[i]})
        createCustomObject(data)
      })
      .catch(e => {console.error(e)});
  }
}

getKlines()
//Create array of trade streams from market for use in @onCombinedStream
const tradeStreamsArray = (market) => {
  const streamsArray = []
  let stream
  market.forEach(pair => {
    stream = streams.trade(pair)
    streamsArray.push(stream)
  })
  return streamsArray
}

//Create custom object


let object
const createCustomObject = data => {
  let weekVolumeQuote = 0;
  let weekVolume = 0;
  let weekTakerVolumeQuote = 0;
  let weekAveragePrice = 0;
  let coeficient = 0;
  let balance = 0;

  for (let i = 0; i < data.length; i++) {
    const symbol = data[i].symbol
    weekVolumeQuote += parseFloat(data[i].quoteAssetVolume)
    weekVolume += parseFloat(data[i].volume)
    weekTakerVolumeQuote += parseFloat(data[i].takerQuoteAssetVolume)
    weekAveragePrice = weekVolumeQuote / weekVolume
    coeficient = weekVolumeQuote / 672
    balance = weekTakerVolumeQuote - (weekVolumeQuote - weekTakerVolumeQuote)
    object = {symbol,
              coeficient,
              'weekVolumeQuote': weekVolumeQuote.toFixed(2),
              'weekAveragePrice': weekAveragePrice.toFixed(8),
              'balance': balance.toFixed(2)
              }
  }
  addObjectToArray(object)
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
const startStreams = (callback) => {
  console.log('Streams are started')
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
      stream.balance = item.balance
      if (tradeCost > 0.4) {
        console.log(stream)
      }
    }
  })
}

//Icons for telegram message
const upGraph = String.fromCodePoint(0x1F4C8);
const downGraph = String.fromCodePoint(0x1F4C9);
const tick = String.fromCodePoint(0x2705);
const cross = String.fromCodePoint(0x274C);
const price = String.fromCodePoint(0x1F4B2);


      // if (streamEvent.stream === customObjectArray[i].tradeStream) {
      //   tradeData = streamEvent.data
      //   if (tradeData.symbol === customObjectArray[i].symbol) {
      //     total = tradeData.price * tradeData.quantity
      //     priceDifference = (tradeData.price - customObjectArray[i].weekAverage)
      //                       / tradeData.price * 100
      //   }
      //   if (total > customObjectArray[i].coeficient > 1 && priceDifference <= 5){
      //     if (tradeData.maker === false) {
      //       const buyMsgTemplate =
      //       `${upGraph} #${tradeData.symbol} ${tick}BUY\n`+
      //       `BTC: ${total.toFixed(2)}\n`+
      //       `${price}Price: ${tradeData.price}\n`+
      //       `${priceDifference.toFixed(2)}% of ${customObjectArray[i].weekAverage}\n`+
      //       `Volume(24h): ${customObjectArray[i].dayVolume} BTC\n`+
      //       `Balance(7d): ${customObjectArray[i].balance} BTC`
      //       bot.sendMessage(chat_id, buyMsgTemplate);
      //     } else if (tradeData.maker === true) {
      //       const sellMsgTemplate =
      //       `${downGraph} #${tradeData.symbol} ${cross}SELL\n`+
      //       `BTC: ${total.toFixed(2)}\n`+
      //       `${price}Price: ${tradeData.price}\n`+
      //       `${priceDifference.toFixed(2)}% of ${customObjectArray[i].weekAverage}\n`+
      //       `Volume(24h): ${customObjectArray[i].dayVolume} BTC\n`+
      //       `Balance(7d): ${customObjectArray[i].balance} BTC`
      //       bot.sendMessage(chat_id, sellMsgTemplate);
      //     }
      //   }
      // }
