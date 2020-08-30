//Dotenv.config
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

//Connection to Telegram API
const token = process.env.TELEGRAM_TOKEN;
const chat_id = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, {polling: true});
const url = 'https://www.binance.com/en/trade/';

//Icons for telegram message
const upGraph = String.fromCodePoint(0x1F4C8);
const downGraph = String.fromCodePoint(0x1F4C9);
const tick = String.fromCodePoint(0x2705);
const cross = String.fromCodePoint(0x274C);
const price = String.fromCodePoint(0x1F4B2);

//Message template for telegram
const sendTelegramMessage = (stream, item, tradeCost) => {
  if (stream.maker === false) {
    const buyMsgTemplate =
    `${tick} *#${stream.symbol}* *BUY*\n`+
    `--------------------\n`+
    `${price}Trade Cost: *${tradeCost.toFixed(2)} ${item.quoteAsset}*\n`+
    `${price}Price: *${stream.price}*\n`+
    `--------------------\n`+
    `*Statistic for 7 days*\n`+
    `--------------------\n`+
    `${price}Price avg: *${item.weekAveragePrice}*\n`+
    `${price}Volume: *${item.weekVolumeQuote}*\n`+
    `${price}Balance: *${item.balance}*\n`+
    `--------------------\n`+
    `${upGraph} [Link to Binance](${url}${item.baseAsset}_${item.quoteAsset})`;
    bot.sendMessage(chat_id, buyMsgTemplate, {parse_mode: 'Markdown',
                                              disable_web_page_preview: true });

  } else if (stream.maker === true) {
    const sellMsgTemplate =
    `${cross} *#${stream.symbol}* *SELL*\n`+
    `--------------------\n`+
    `${price}Trade Cost: *${tradeCost.toFixed(2)} ${item.quoteAsset}*\n`+
    `${price}Price: *${stream.price}*\n`+
    `--------------------\n`+
    `*Statistic for 7 days*\n`+
    `--------------------\n`+
    `${price}Price avg: *${item.weekAveragePrice}*\n`+
    `${price}Volume: *${item.weekVolumeQuote}*\n`+
    `${price}Balance: *${item.balance}*\n`+
    `--------------------\n`+
    `${downGraph} [Link to Binance](${url}${item.baseAsset}_${item.quoteAsset})`;
    bot.sendMessage(chat_id, sellMsgTemplate, { parse_mode: 'Markdown',
                                                disable_web_page_preview: true });
  }
};

module.exports = sendTelegramMessage;
