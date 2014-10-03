_ = require 'underscore'

toKeyVal = (data) -> _.map (data), (v, k) -> "#{k}=#{JSON.stringify v}"

# Converts a map to a string space-delimited key=val pairs
format = (data, sort = true) ->
  keyvals = toKeyVal(data)
  keyvals.sort() if sort
  keyvals.join(" ")

# Similar to format, but takes additional reserved params to promote logging best-practices
formatLog = (source, level, title, data) ->
  # consistently output empty string for unset keys, because null values differ by language
  source = "" if source in [null, undefined]
  level = "" if level in [null, undefined]
  title = "" if title in [null, undefined]

  reserved = format {source, level, title}, false
  return reserved unless (_.isObject data) and (_.keys data).length > 0
  "#{reserved} #{format data}"

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
