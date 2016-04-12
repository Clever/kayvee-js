"use strict";

var _ = require('underscore');

var toKeyVal = (data) => _.map(data, (v, k) => `${k}=${JSON.stringify(v)}`);

// Converts a map to a string space-delimited key=val pairs
var format = function(data) {
  return JSON.stringify(data);
};

// Similar to format, but takes additional reserved params to promote logging best-practices
var formatLog = function(source, level, title, data) {
  // consistently output empty string for unset keys, because null values differ by language
  if ([null, undefined].indexOf(source) >= 0) { source = ""; }
  if ([null, undefined].indexOf(level) >= 0) { level = ""; }
  if ([null, undefined].indexOf(title) >= 0) { title = ""; }

  var reserved = {source, level, title};
  if (!_.isObject(data)) { data = {}; }

  // reserved keys overwrite other keys in data
  return format(_.extend(data, reserved));
};

module.exports =
  {format: format,
  formatLog: formatLog
  };

var LOG_LEVELS =
  {UNKNOWN: "unknown",
  CRITICAL: "critical",
  ERROR: "error",
  WARNING: "warning",
  INFO: "info",
  TRACE: "trace"
  };

_.extend(module.exports, LOG_LEVELS);
