//Dotenv.config
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

//Connection to Telegram API
const token = process.env.TELEGRAM_TOKEN;
const chat_id = process.env.TELEGRAM_CHAT_ID;
const bot = new TelegramBot(token, {polling: true});

//Icons for telegram message
const upGraph = String.fromCodePoint(0x1F4C8);
const downGraph = String.fromCodePoint(0x1F4C9);
const tick = String.fromCodePoint(0x2705);
const cross = String.fromCodePoint(0x274C);
const price = String.fromCodePoint(0x1F4B2);

const sendTelegramMessage = (stream, item, tradeCost) => {
  if (stream.maker === false) {
    const buyMsgTemplate =
    `${upGraph} #${stream.symbol} ${tick}BUY\n`+
    `Trade Cost: ${tradeCost.toFixed(2)} BTC\n`+
    `${price}Price: ${stream.price}\n`+
    `${price}Price average(7d): ${item.weekAveragePrice}\n`+
    `Balance(7d): ${item.balance} BTC`
    bot.sendMessage(chat_id, buyMsgTemplate);

  } else if (stream.maker === true) {
    const sellMsgTemplate =
    `${downGraph} #${stream.symbol} ${cross}SELL\n`+
    `Trade Cost: ${tradeCost.toFixed(2)} BTC\n`+
    `${price}Price: ${stream.price}\n`+
    `${price}Price average(7d): ${item.weekAveragePrice}\n`+
    `Balance(7d): ${item.balance} BTC`
    bot.sendMessage(chat_id, sellMsgTemplate);
  }
}

module.exports = sendTelegramMessage
