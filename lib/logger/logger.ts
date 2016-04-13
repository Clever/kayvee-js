var _ = require("underscore");
var kv  = require("../kayvee");

var LEVELS = {
  Debug:    "debug",
  Info:     "info",
  Warning:  "warning",
  Error:    "error",
  Critical: "critical",
};

var LOG_LEVEL_ENUM = {
  debug:    0,
  info:     1,
  warning:  2,
  error:    3,
  critical: 4,
};

// This is a port from kayvee-go/logger/logger.go
class Logger {
  formatter = null;
  logLvl = null;
  globals = null;
  logWriter = null;

  constructor(source, logLvl = process.env.KAYVEE_LOG_LEVEL, formatter = kv.format, output = console.error) {
    this.formatter = formatter;
    this.logLvl = this._validateLogLvl(logLvl);
    this.globals = {};
    this.globals.source = source;
    this.logWriter = output;
  }

  setConfig(source, logLvl, formatter, output) {
    this.globals.source = source;
    this.logLvl = this._validateLogLvl(logLvl);
    this.formatter = formatter;
    this.logWriter = output;
    return this.logWriter;
  }

  _validateLogLvl(logLvl) {
    if (logLvl == null) {
      return LEVELS.Debug;
    }
    for (var key in LEVELS) {
      if (Object.prototype.hasOwnProperty.call(LEVELS, key)) {
        var value = LEVELS[key];
        if (logLvl.toLowerCase() === value) {
          return value;
        }
      }
    }
    return LEVELS.Debug;
  }

  setLogLevel(logLvl) {
    this.logLvl = this._validateLogLvl(logLvl);
    return this.logLvl;
  }

  setFormatter(formatter) {
    this.formatter = formatter;
    return this.formatter;
  }

  setOutput(output) {
    this.logWriter = output;
    return this.logWriter;
  }

  debug(title) {
    this.debugD(title, {});
  }

  info(title) {
    this.infoD(title, {});
  }

  warn(title) {
    this.warnD(title, {});
  }

  error(title) {
    this.errorD(title, {});
  }

  critical(title) {
    this.criticalD(title, {});
  }

  counter(title) {
    this.counterD(title, 1, {});
  }

  gauge(title, value) {
    this.gaugeD(title, value, {});
  }

  debugD(title, data) {
    data.title = title;
    this.logWithLevel(LEVELS.Debug, data);
  }

  infoD(title, data) {
    data.title = title;
    this.logWithLevel(LEVELS.Info, data);
  }

  warnD(title, data) {
    data.title = title;
    this.logWithLevel(LEVELS.Warning, data);
  }

  errorD(title, data) {
    data.title = title;
    this.logWithLevel(LEVELS.Error, data);
  }

  criticalD(title, data) {
    data.title = title;
    this.logWithLevel(LEVELS.Critical, data);
  }

  counterD(title, value, data) {
    data.title = title;
    data.value = value;
    data.type = "counter";
    this.logWithLevel(LEVELS.Info, data);
  }

  gaugeD(title, value, data) {
    data.title = title;
    data.value = value;
    data.type = "gauge";
    this.logWithLevel(LEVELS.Info, data);
  }

  logWithLevel(logLvl, data) {
    if (LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[this.logLvl]) {
      return;
    }
    data.level = logLvl;
    _.defaults(data, this.globals);
    this.logWriter(this.formatter(data));
  }
}

module.exports = Logger;
_.extend(module.exports, LEVELS);
