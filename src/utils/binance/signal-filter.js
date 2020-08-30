const signalFilter = ({price}, {coeficient, weekAveragePrice}, c) => {
  if (c > coeficient && price <= weekAveragePrice) {
    return true;
  }
};

module.exports = signalFilter;