var _ = require('underscore');
var kv  = require("../kayvee");

var LOG_LEVELS = {
  "Debug":    "debug",
  "Info":     "info",
  "Warning":  "warning",
  "Error":    "error",
  "Critical": "critical",
};

var LOG_LEVEL_ENUM = {
  "debug":    0,
  "info":     1,
  "warning":  2,
  "error":    3,
  "critical": 4,
};

// This is a port from kayvee-go/logger/logger.go
class Logger {
  constructor(source, logLvl=null, formatter=kv.format, output=console.error) {
    this.formatter = formatter;
    if (!(typeof logLvl !== "undefined" && logLvl !== null)) {
      logLvl = process.env.KAYVEE_LOG_LEVEL;
    }
    this.logLvl = this._validateLogLvl(logLvl);
    this.globals = {};
    this.globals["source"] = source;
    this.logWriter = output;
  }

  setConfig(source, logLvl, formatter, output) {
    this.global["source"] = source;
    this.logLvl = this._validateLogLvl(logLvl);
    this.formatter = formatter;
    return this.logWriter = output;
  }

  _validateLogLvl(logLvl) {
    if (!(typeof logLvl !== "undefined" && logLvl !== null)) {
      return LOG_LEVELS.Debug;
    } else {
      for (var key in LOG_LEVELS) {
        if (Object.prototype.hasOwnProperty.call(LOG_LEVELS, key)) {
          var value = LOG_LEVELS[key];
          if (logLvl.toLowerCase() === value) {
            return value;
          }
        }
      }
    }
    return LOG_LEVELS.Debug;
  }

  setLogLevel(logLvl) {
    return this.logLvl = this._validateLogLvl(logLvl);
  }

  setFormatter(formatter) {
    return this.formatter = formatter;
  }

  setOutput(output) {
    return this.logWriter = output;
  }

  debug(title) {
    return this.debugD(title, {});
  }

  info(title) {
    return this.infoD(title, {});
  }

  warn(title) {
    return this.warnD(title, {});
  }

  error(title) {
    return this.errorD(title, {});
  }

  critical(title) {
    return this.criticalD(title, {});
  }

  counter(title) {
    return this.counterD(title, 1, {});
  }

  gauge(title, value) {
    return this.gaugeD(title, value, {});
  }

  debugD(title, data) {
    data["title"] = title;
    return this.logWithLevel(LOG_LEVELS.Debug, data);
  }

  infoD(title, data) {
    data["title"] = title;
    return this.logWithLevel(LOG_LEVELS.Info, data);
  }

  warnD(title, data) {
    data["title"] = title;
    return this.logWithLevel(LOG_LEVELS.Warning, data);
  }

  errorD(title, data) {
    data["title"] = title;
    return this.logWithLevel(LOG_LEVELS.Error, data);
  }

  criticalD(title, data) {
    data["title"] = title;
    return this.logWithLevel(LOG_LEVELS.Critical, data);
  }

  counterD(title, value, data) {
    data["title"] = title;
    data["value"] = value;
    data["type"] = "counter";
    return this.logWithLevel(LOG_LEVELS.Info, data);
  }

  gaugeD(title, value, data) {
    data["title"] = title;
    data["value"] = value;
    data["type"] = "gauge";
    return this.logWithLevel(LOG_LEVELS.Info, data);
  }

  logWithLevel(logLvl, data) {
    var iterable;
    if (LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[this.logLvl]) {
      return;
    }
    data["level"] = logLvl;
    for (var key in (iterable = this.globals)) {
      var value = iterable[key];
      if (key in data) {
        continue;
      }
      data[key] = value;
    }
    var logString = this.formatter(data);
    return this.logWriter(logString);
  }
}

module.exports = Logger;
_.extend(module.exports, LOG_LEVELS);
