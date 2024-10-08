var _ = require("underscore");
var kv = require("../kayvee");
var router = require("../router");
var LEVELS = {
    Trace: "trace",
    Debug: "debug",
    Info: "info",
    Warning: "warning",
    Error: "error",
    Critical: "critical",
};
var LOG_LEVEL_ENUM = {
    trace: 0,
    debug: 1,
    info: 2,
    warning: 3,
    error: 4,
    critical: 5,
};
var assign = Object.assign || _.assign; // Use the faster Object.assign if possible
var globalRouter;
function setGlobalRouting(filename) {
    globalRouter = new router.Router();
    globalRouter.loadConfig(filename);
}
function getGlobalRouter() {
    return globalRouter;
}
// This is a modified from kayvee-go/logger/logger.go
var Logger = /** @class */ (function () {
    function Logger(source, logLvl, formatter, output, asyncLocalStorage) {
        if (logLvl === void 0) { logLvl = process.env.KAYVEE_LOG_LEVEL; }
        if (formatter === void 0) { formatter = kv.format; }
        if (output === void 0) { output = console.error; }
        if (asyncLocalStorage === void 0) { asyncLocalStorage = null; }
        this.formatter = null;
        this.logLvl = null;
        this.globals = null;
        this.logWriter = null;
        this.logRouter = null;
        this.asyncLocalStorage = null;
        this.formatter = formatter;
        this.logLvl = this._validateLogLvl(logLvl);
        this.globals = {};
        this.globals.source = source;
        this.logWriter = output;
        this.asyncLocalStorage = asyncLocalStorage;
        if (process.env._TEAM_OWNER) {
            this.globals.team = process.env._TEAM_OWNER;
        }
        if (process.env._DEPLOY_ENV) {
            this.globals.deploy_env = process.env._DEPLOY_ENV;
        }
        if (process.env._EXECUTION_NAME) {
            this.globals.wf_id = process.env._EXECUTION_NAME;
        }
        if (process.env._POD_ID) {
            this.globals["pod-id"] = process.env._POD_ID;
        }
        if (process.env._POD_SHORTNAME) {
            this.globals["pod-shortname"] = process.env._POD_SHORTNAME;
        }
        if (process.env._POD_REGION) {
            this.globals["pod-region"] = process.env._POD_REGION;
        }
        if (process.env._POD_ACCOUNT) {
            this.globals["pod-account"] = process.env._POD_ACCOUNT;
        }
    }
    Logger.prototype.setRouter = function (r) {
        this.logRouter = r;
    };
    Logger.prototype.setConfig = function (source, logLvl, formatter, output) {
        this.globals.source = source;
        this.logLvl = this._validateLogLvl(logLvl);
        this.formatter = formatter;
        this.logWriter = output;
        return this.logWriter;
    };
    Logger.prototype._validateLogLvl = function (logLvl) {
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
    };
    Logger.prototype.setLogLevel = function (logLvl) {
        this.logLvl = this._validateLogLvl(logLvl);
        return this.logLvl;
    };
    Logger.prototype.setFormatter = function (formatter) {
        this.formatter = formatter;
        return this.formatter;
    };
    Logger.prototype.setOutput = function (output) {
        this.logWriter = output;
        return this.logWriter;
    };
    Logger.prototype.trace = function (title) {
        this.traceD(title, {});
    };
    Logger.prototype.debug = function (title) {
        this.debugD(title, {});
    };
    Logger.prototype.info = function (title) {
        this.infoD(title, {});
    };
    Logger.prototype.warn = function (title) {
        this.warnD(title, {});
    };
    Logger.prototype.error = function (title) {
        this.errorD(title, {});
    };
    Logger.prototype.critical = function (title) {
        this.criticalD(title, {});
    };
    Logger.prototype.counter = function (title) {
        this.counterD(title, 1, {});
    };
    Logger.prototype.gauge = function (title, value) {
        this.gaugeD(title, value, {});
    };
    Logger.prototype.traceD = function (title, data) {
        this._logWithLevel(LEVELS.Trace, {
            title: title,
        }, data);
    };
    Logger.prototype.debugD = function (title, data) {
        this._logWithLevel(LEVELS.Debug, {
            title: title,
        }, data);
    };
    Logger.prototype.infoD = function (title, data) {
        this._logWithLevel(LEVELS.Info, {
            title: title,
        }, data);
    };
    Logger.prototype.warnD = function (title, data) {
        this._logWithLevel(LEVELS.Warning, {
            title: title,
        }, data);
    };
    Logger.prototype.errorD = function (title, data) {
        this._logWithLevel(LEVELS.Error, {
            title: title,
        }, data);
    };
    Logger.prototype.criticalD = function (title, data) {
        this._logWithLevel(LEVELS.Critical, {
            title: title,
        }, data);
    };
    Logger.prototype.counterD = function (title, value, data) {
        this._logWithLevel(LEVELS.Info, {
            title: title,
            value: value,
            type: "counter",
        }, data);
    };
    Logger.prototype.gaugeD = function (title, value, data) {
        this._logWithLevel(LEVELS.Info, {
            title: title,
            value: value,
            type: "gauge",
        }, data);
    };
    Logger.prototype._logWithLevel = function (logLvl, metadata, userdata) {
        if (LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[this.logLvl]) {
            return;
        }
        var storeData = this.asyncLocalStorage ? this.asyncLocalStorage.getStore() || {} : {};
        var contextData = storeData.context ? { context: storeData.context } : {};
        var data = assign({ level: logLvl }, this.globals, metadata, contextData, userdata);
        if (this.logRouter) {
            data._kvmeta = this.logRouter.route(data);
        }
        else if (globalRouter) {
            data._kvmeta = globalRouter.route(data);
        }
        this.logWriter(this.formatter(data));
    };
    return Logger;
}());
module.exports = Logger;
module.exports.setGlobalRouting = setGlobalRouting;
module.exports.getGlobalRouter = getGlobalRouter;
module.exports.mockRouting = function (cb) {
    var _logWithLevel = Logger.prototype._logWithLevel;
    if (_logWithLevel.isMocked) {
        throw Error("Nested kv.mockRouting calls are not supported");
    }
    var ruleMatches = {};
    Logger.prototype._logWithLevel = function (logLvl, metadata, userdata) {
        var formatter = this.formatter;
        var logWriter = this.logWriter;
        this.formatter = function (msg) { return msg; };
        this.logWriter = function (msg) {
            if (!msg._kvmeta) {
                return;
            }
            msg._kvmeta.routes.forEach(function (route) {
                ruleMatches[route.rule] = (ruleMatches[route.rule] || []).concat(route);
            });
        };
        _logWithLevel.call(this, logLvl, metadata, userdata);
        this.formatter = formatter;
        this.logWriter = logWriter;
    };
    var stfuTypeScript = Logger.prototype._logWithLevel;
    stfuTypeScript.isMocked = true;
    var done = function () {
        Logger.prototype._logWithLevel = _logWithLevel;
        return ruleMatches;
    };
    cb(done);
};
_.extend(module.exports, LEVELS);
module.exports.LEVELS = ["trace", "debug", "info", "warn", "error", "critical"];
module.exports.METRICS = ["counter", "gauge"];
