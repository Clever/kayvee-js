var _ = require("underscore");

const deploy_env = process.env._DEPLOY_ENV;
const workflow_id = process.env._EXECUTION_NAME;

// Encode errors to strings instead of toJSON()
function replaceErrors(key, value) {
  if (value instanceof Error) {
    return value.toString();
  }

  return value;
}

// Converts a map to a string space-delimited key=val pairs
function format(data) {
  if (deploy_env || workflow_id) {
    return JSON.stringify(_.extend({deploy_env, workflow_id}, data), replaceErrors);
  }
  return JSON.stringify(data, replaceErrors);
}

// Similar to format, but takes additional reserved params to promote logging best-practices
function formatLog(source = "", level = "", title = "", data = {}) {
  let info = data;
  if (!_.isObject(data)) {
    info = {};
  }
  const reserved = {source, level, title};

  // reserved keys overwrite other keys in data
  return format(_.extend({}, info, reserved));
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
