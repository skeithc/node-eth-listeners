const winston = require('winston');
const _ = require('lodash');
const util = require('util');

const { format } = winston;

const formatOptions = { colors: true, depth: 4 };

module.exports = winston.createLogger({
  level: 'debug',
  format: format.combine(
    format((info) => _.assign(
      info,
      { message: util.formatWithOptions(formatOptions, info.message) },
    ))(),
    format.timestamp(),
    format.padLevels(),
    format.colorize(),
    format.printf(({
      level, message, label, timestamp, ...rest
    }) => {
      const params = rest[Symbol.for('splat')];
      const paramsString = (params || []).map((p) => util.formatWithOptions(formatOptions, p)).join(' ');
      return `${timestamp} ${level}: ${message} ${paramsString}`;
    }),
  ),
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      json: false,
      colorize: true,
    }),
  ],
});
