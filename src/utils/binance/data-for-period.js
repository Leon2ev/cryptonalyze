//Customize seven days object.
const createCustomObject = (data, callback) => {
  const weekAveragePrice = data.weekVolumeQuote / data.weekVolumeTotal;
  const balance = 2 * data.weekTakerVolumeQuote - data.weekVolumeQuote;
  data.coeficient = data.weekVolumeQuote / 672;
  data.weekVolumeQuote = data.weekVolumeQuote.toFixed(2);
  data.weekVolumeTotal = data.weekVolumeTotal.toString();
  data.weekTakerVolumeQuote = data.weekTakerVolumeQuote.toFixed(2);
  data.weekAveragePrice = weekAveragePrice.toFixed(8);
  data.balance = balance.toFixed(2);
  callback(data);
};

module.exports = createCustomObject;
