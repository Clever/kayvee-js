var _   = require("underscore");
var kv  = require("../kayvee");
var router = require("../router");


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

const assign = Object.assign || _.assign; // Use the faster Object.assign if possible

let globalRouter;

function setGlobalRouting(filename) {
  globalRouter = new router.Router();
  globalRouter.loadConfig(filename);
}

function getGlobalRouter() {
  return globalRouter;
}

// This is a port from kayvee-go/logger/logger.go
class Logger {
  formatter = null;
  logLvl = null;
  globals = null;
  logWriter = null;
  logRouter = null;

  constructor(source, logLvl = process.env.KAYVEE_LOG_LEVEL, formatter = kv.format, output = console.error) {
    this.formatter = formatter;
    this.logLvl = this._validateLogLvl(logLvl);
    this.globals = {};
    this.globals.source = source;
    this.logWriter = output;
  }

  setRouter(r) {
    this.logRouter = r;
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
    this._logWithLevel(LEVELS.Debug, {
      title,
    }, data);
  }

  infoD(title, data) {
    this._logWithLevel(LEVELS.Info, {
      title,
    }, data);
  }

  warnD(title, data) {
    this._logWithLevel(LEVELS.Warning, {
      title,
    }, data);
  }

  errorD(title, data) {
    this._logWithLevel(LEVELS.Error, {
      title,
    }, data);
  }

  criticalD(title, data) {
    this._logWithLevel(LEVELS.Critical, {
      title,
    }, data);
  }

  counterD(title, value, data) {
    this._logWithLevel(LEVELS.Info, {
      title,
      value,
      type: "counter",
    }, data);
  }

  gaugeD(title, value, data) {
    this._logWithLevel(LEVELS.Info, {
      title,
      value,
      type:  "gauge",
    }, data);
  }

  _logWithLevel(logLvl, metadata, userdata) {
    if (LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[this.logLvl]) {
      return;
    }
    const data = assign({level: logLvl}, this.globals, metadata, userdata);
    if (this.logRouter) {
      data._kvmeta = this.logRouter.route(data);
    } else if (globalRouter) {
      data._kvmeta = globalRouter.route(data);
    }
    this.logWriter(this.formatter(data));
  }
}

module.exports = Logger;
module.exports.setGlobalRouting = setGlobalRouting;
module.exports.getGlobalRouter = getGlobalRouter;
module.exports.mockRouting = (cb) => {
  const _logWithLevel: any = Logger.prototype._logWithLevel;

  if (_logWithLevel.isMocked) {
    throw Error("Nested kv.mockRouting calls are not supported");
  }

  const ruleMatches = {};

  Logger.prototype._logWithLevel = (logLvl, metadata, userdata) => {
    const formatter = this.formatter;
    const logWriter = this.logWriter;

    this.formatter = msg => msg;
    this.logWriter = (msg) => {
      if (!msg._kvmeta) { return; }

      msg._kvmeta.routes.forEach(route => {
        ruleMatches[route.rule] = (ruleMatches[route.rule] || []).concat(msg);
      });
    };

    _logWithLevel.call(this, logLvl, metadata, userdata);

    this.formatter = formatter;
    this.logWriter = logWriter;
  };

  const stfuTypeScript: any = Logger.prototype._logWithLevel;
  stfuTypeScript.isMocked = true;

  const done = () => {
    Logger.prototype._logWithLevel = _logWithLevel;
    return ruleMatches;
  };

  cb(done);
};
_.extend(module.exports, LEVELS);
module.exports.LEVELS = ["debug", "info", "warn", "error", "critical"];
module.exports.METRICS = ["counter", "gauge"];
