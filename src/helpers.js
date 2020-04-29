const moment = require('moment');

const helpers = {};

// funcion que devuelve tiempo que ha pasado...
helpers.timeago = timestamp => {
    return moment(timestamp).startOf('minutes').fromNow();
};

helpers.getRandomArbitrary = (min, max) => {
    var r = Math.random() * (max - min) + min;
    return r.toFixed(5) /*.toString().replace(".", ",")*/ ;
}

helpers.getRandomInt = (min, max) => {
    return (Math.floor(Math.random() * (max - min)) + min).toString();
}

module.exports = helpers;