const api = require('binance');
const { interval, limit } = require('./vars-for-api');
const sendTelegramMessage = require('../telegram');
const createCustomObject = require('./data-for-period');
const { getMarket, getKlines, getMarketsArray } = require('./rest');
const signalFilter = require('./signal-filter');

const binanceWS = new api.BinanceWS(true);
const streams = binanceWS.streams;

//Creacte stream string for each pair on the selectedMarkets and store it inside an array.
let selectedMarkets;
const streamsArray = async () => {
  try {
    selectedMarkets = await getMarket();
    const streamsArray = [];
    selectedMarkets.forEach(pair => {
      const tradeStream = streams.trade(pair.symbol);
      const klineStream = streams.kline(pair.symbol, interval);
      streamsArray.push(tradeStream, klineStream);
    });
    return streamsArray;
  } catch (e) {
    console.error(e);
  }
};

//Receive array of streams and run stream for each item from an array.
const startStreams = async (callback) => {
  console.log('Streams are started');
  const combinedStreams = await streamsArray();
  binanceWS.onCombinedStream(combinedStreams, streamEvent => {
    callback(streamEvent.data);
  });
};

const splitStreams = (stream) => {
  if (stream.eventType === 'kline') {
    customizeKlineStreamObject(stream);
  } else if (stream.eventType === 'trade') {
    filterTradingData(stream);
  }
};

const filterTradingData = (stream) => {
  actualDataArray.forEach(item => {
    if (item.symbol === stream.symbol) {
      const tradeCost = stream.price * stream.quantity;
      const filtered = signalFilter(stream, item, tradeCost);
      if (filtered === true) {
        sendTelegramMessage(stream, item, tradeCost);
      }
    }
  });
};

const customizeKlineStreamObject = ({ kline }) => {
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
  };
  getKlineStartTime(object);
};

//Check if new kline is open to calculate privious kline endTime.
let endTimeForKlines;
const getKlineStartTime = (object) => {
  if (endTimeForKlines === undefined || (endTimeForKlines + 1) < object.openTime) {
    endTimeForKlines = object.openTime - 1;
    getKlines(selectedMarkets, endTimeForKlines, interval, limit);
  }
  customStreamKlineObject(object);
};

//Add incomming stream data to an existing seven days kline object.
const customStreamKlineObject = (object) => {
  const array = getMarketsArray();
  let symbol;
  let baseAsset;
  let quoteAsset;
  let weekVolumeQuote = 0;
  let weekVolumeTotal = 0;
  let weekTakerVolumeQuote = 0;
  array.forEach(pair => {
    if (pair.symbol === object.symbol) {
      symbol = pair.symbol;
      baseAsset = pair.baseAsset;
      quoteAsset = pair.quoteAsset;
      weekVolumeQuote = parseFloat(pair.weekVolumeQuote) + parseFloat(object.quoteAssetVolume);
      weekVolumeTotal = parseFloat(pair.weekVolumeTotal) + parseFloat(object.volume);
      weekTakerVolumeQuote = parseFloat(pair.weekTakerVolumeQuote) + parseFloat(object.takerQuoteAssetVolume);
    }
  });
  const newObject = {
    symbol,
    baseAsset,
    quoteAsset,
    weekVolumeQuote,
    weekVolumeTotal,
    weekTakerVolumeQuote
  };
  createCustomObject(newObject, addToArrayOrUpdateIfExist);
};

/**
Create an array that stores objects with last available data. Update existing
object if new data is comming.
*/
let actualDataArray = [];
const addToArrayOrUpdateIfExist = (object) => {
  if (actualDataArray.some(pair => pair.symbol === object.symbol)) {
    actualDataArray.forEach(pair => {
      if (pair.symbol === object.symbol) {
        pair.coeficient = object.coeficient;
        pair.weekVolumeQuote = object.weekVolumeQuote;
        pair.weekAveragePrice = object.weekAveragePrice;
        pair.balance = object.balance;
      }
    });
  } else if (object != undefined) {
    actualDataArray.push(object);
  }
};

// App starter
const startApp = () => {
  startStreams(splitStreams);
};

module.exports = startApp;
