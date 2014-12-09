_ = require 'underscore'

toKeyVal = (data) -> _.map (data), (v, k) -> "#{k}=#{JSON.stringify v}"

# Converts a map to a string space-delimited key=val pairs
format = (data) ->
  JSON.stringify data

# Similar to format, but takes additional reserved params to promote logging best-practices
formatLog = (source, level, title, data) ->
  # consistently output empty string for unset keys, because null values differ by language
  source = "" if source in [null, undefined]
  level = "" if level in [null, undefined]
  title = "" if title in [null, undefined]

  reserved = {source, level, title}
  data = {} if not _.isObject data

  # reserved keys overwrite other keys in data
  return format(_.extend data, reserved)

module.exports =
  format: format
  formatLog: formatLog

LOG_LEVELS =
  UNKNOWN: "unknown"
  CRITICAL: "critical"
  ERROR: "error"
  WARNING: "warning"
  INFO: "info"
  TRACE: "trace"

_.extend(module.exports, LOG_LEVELS)
