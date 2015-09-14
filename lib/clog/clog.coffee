_ = require 'underscore'
kv  = require "../kayvee"

LOG_LEVELS = {
  "Debug":    "debug",
  "Info":     "info",
  "Warning":  "warning",
  "Error":    "error",
  "Critical": "critical",
}

LOG_LEVEL_ENUM = {
  "debug":    0,
  "info":     1,
  "warning":  2,
  "error":    3,
  "critical": 4,
}

class Logger
  constructor: (source, logLvl=null, @formatter=kv.format, output=console.error) ->
    if !logLvl?
      logLvl = process.env.LOG_LEVEL_CONFIG
    @logLvl = @_validateLogLvl(logLvl)
    @globals = {}
    @globals["source"] = source
    @logWriter = output

  setConfig: (source, logLvl, formatter, output) ->
    @global["source"] = source
    @logLvl = @_validateLogLvl(logLvl)
    @formatter = formatter
    @logWriter = output

  _validateLogLvl: (logLvl) ->
    if !logLvl?
      return LOG_LEVELS.Debug
    else
      for own key, value of LOG_LEVELS
        if logLvl.toLowerCase() == value
          return value

  setLogLevel: (logLvl) ->
    @logLvl = logLvl

  setFormatter: (formatter) ->
    @formatter = formatter

  setOutput: (output) ->
    @logWriter = output

  debug: (title) ->
    @debugD(title, {})

  info: (title) ->
    @infoD(title, {})

  warn: (title) ->
    @warnD(title, {})

  error: (title) ->
    @errorD(title, {})

  critical: (title) ->
    @criticalD(title, {})

  counter: (title) ->
    @counterD(title, 1, {})

  gauge: (title, value) ->
    @gaugeD(title, value, {})

  debugD: (title, data) ->
    data["title"] = title
    @logWithLevel(LOG_LEVELS.Debug, data)

  infoD: (title, data) ->
    data["title"] = title
    @logWithLevel(LOG_LEVELS.Info, data)

  warnD: (title, data) ->
    data["title"] = title
    @logWithLevel(LOG_LEVELS.Warning, data)

  errorD: (title, data) ->
    data["title"] = title
    @logWithLevel(LOG_LEVELS.Error, data)

  criticalD: (title, data) ->
    data["title"] = title
    @logWithLevel(LOG_LEVELS.Critical, data)

  counterD: (title, value, data) ->
    data["title"] = title
    data["value"] = value
    data["type"] = "counter"
    @logWithLevel(LOG_LEVELS.Info, data)

  gaugeD: (title, value, data) ->
    data["title"] = title
    data["value"] = value
    data["type"] = "gauge"
    @logWithLevel(LOG_LEVELS.Info, data)

  logWithLevel: (logLvl, data) ->
    if LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[@logLvl]
      return
    data["level"] = logLvl
    for key,value of @globals
      if key of data
        continue
      data[key] = value
    logString = @formatter(data)
    @logWriter(logString)

module.exports = Logger
_.extend(module.exports, LOG_LEVELS)
