const express = require('express');
const app = express();
const server = require('http').createServer(app);
const startApp = require('./utils/binance/websocket');
const port = process.env.PORT || 8000;

startApp();

server.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
