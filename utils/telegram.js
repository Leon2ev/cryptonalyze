//Dotenv.config
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

//Connection to Telegram API
const token = process.env.TELEGRAM_TOKEN;
const chat_id = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, {polling: true});
const url = 'https://www.binance.com/en/trade/'

//Icons for telegram message
const upGraph = String.fromCodePoint(0x1F4C8);
const downGraph = String.fromCodePoint(0x1F4C9);
const tick = String.fromCodePoint(0x2705);
const cross = String.fromCodePoint(0x274C);
const price = String.fromCodePoint(0x1F4B2);

const sendTelegramMessage = (stream, item, tradeCost) => {
  if (stream.maker === false) {
    const buyMsgTemplate =
    `${tick} *#${stream.symbol}* *BUY*\n`+
    `--------------------\n`+
    `${price}Trade Cost: *${tradeCost.toFixed(2)} ${item.market}*\n`+
    `${price}Price: *${stream.price} ${item.market}*\n`+
    `--------------------\n`+
    `*Statistic for 7 days*\n`+
    `--------------------\n`+
    `${price}Price average: *${item.weekAveragePrice} ${item.market}*\n`+
    `${price}Balance: *${item.balance} ${item.market}*\n`+
    `--------------------\n`+
    `${upGraph} [Link to Binance](${url}${item.market}_${item.quoteAsset})`
    bot.sendMessage(chat_id, buyMsgTemplate, { parse_mode: 'Markdown' });

  } else if (stream.maker === true) {
    const sellMsgTemplate =
    `${cross} *#${stream.symbol}* *SELL*\n`+
    `--------------------\n`+
    `${price}Trade Cost: *${tradeCost.toFixed(2)} ${item.market}*\n`+
    `${price}Price: *${stream.price} ${item.market}*\n`+
    `--------------------\n`+
    `*Statistic for 7 days*\n`+
    `--------------------\n`+
    `${price}Price average: *${item.weekAveragePrice} ${item.market}*\n`+
    `${price}Balance: *${item.balance} ${item.market}*\n`+
    `--------------------\n`+
    `${downGraph} [Link to Binance](${url}${item.market}_${item.quoteAsset})`
    bot.sendMessage(chat_id, sellMsgTemplate, { parse_mode: 'Markdown' });
  }
}

module.exports = sendTelegramMessage
