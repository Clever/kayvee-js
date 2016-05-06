var _ = require("underscore");
_.mixin(require("underscore.deep"));

// Converts a map to a string space-delimited key=val pairs
function format(data) {
  if (process.env.DEPLOY_ENV != null) {
    return JSON.stringify(_.extend({deploy_env: process.env.DEPLOY_ENV}, data));
  }
  return JSON.stringify(data);
}

// Similar to format, but takes additional reserved params to promote logging best-practices
function formatLog(source = "", level = "", title = "", data = {}) {
  let reallyData = _.deepClone(data);
  if (!_.isObject(data)) {
    reallyData = {};
  }
  const reserved = {source, level, title};

  // reserved keys overwrite other keys in data
  return format(_.extend(reallyData, reserved));
}

module.exports = {
  format,
  formatLog,
};

const LOG_LEVELS = {
  UNKNOWN: "unknown",
  CRITICAL: "critical",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  TRACE: "trace",
};

_.extend(module.exports, LOG_LEVELS);
