const { Telegraf } = require('telegraf');

module.exports = function(token) {
    return new
    Telegraf(token);
}