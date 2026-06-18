import * as kv from "../kayvee";
import { Router } from "../router";

type Formatter = (data: Record<string, unknown>) => string;
type LogData = Record<string, unknown>;

const LEVELS = {
  Trace: "trace",
  Debug: "debug",
  Info: "info",
  Warning: "warning",
  Error: "error",
  Critical: "critical",
} as const;

const LOG_LEVEL_ENUM: Record<string, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warning: 3,
  error: 4,
  critical: 5,
};

let globalRouter: Router | undefined;

export function setGlobalRouting(filename: string): void {
  globalRouter = new Router();
  globalRouter.loadConfig(filename);
}

export function getGlobalRouter(): Router | undefined {
  return globalRouter;
}

export class Logger {
  static readonly Trace = LEVELS.Trace;
  static readonly Debug = LEVELS.Debug;
  static readonly Info = LEVELS.Info;
  static readonly Warning = LEVELS.Warning;
  static readonly Error = LEVELS.Error;
  static readonly Critical = LEVELS.Critical;
  static readonly LEVELS = ["trace", "debug", "info", "warn", "error", "critical"];
  static readonly METRICS = ["counter", "gauge"];

  formatter: Formatter;
  logLvl: string;
  globals: LogData;
  logWriter: (msg: string) => void;
  logRouter: Router | null;
  asyncLocalStorage: any;

  constructor(
    source: string,
    logLvl: string | null | undefined = process.env.KAYVEE_LOG_LEVEL,
    formatter: Formatter = kv.format,
    output: (msg: string) => void = console.error,
  ) {
    this.formatter = formatter;
    this.logLvl = this._validateLogLvl(logLvl);
    this.globals = {};
    this.globals.source = source;
    this.logWriter = output;
    this.logRouter = null;
    this.asyncLocalStorage = null;

    if (process.env._TEAM_OWNER) this.globals.team = process.env._TEAM_OWNER;
    if (process.env._DEPLOY_ENV) this.globals.deploy_env = process.env._DEPLOY_ENV;
    if (process.env._EXECUTION_NAME) this.globals.wf_id = process.env._EXECUTION_NAME;
    if (process.env._POD_ID) this.globals["pod-id"] = process.env._POD_ID;
    if (process.env._POD_SHORTNAME) this.globals["pod-shortname"] = process.env._POD_SHORTNAME;
    if (process.env._POD_REGION) this.globals["pod-region"] = process.env._POD_REGION;
    if (process.env._POD_ACCOUNT) this.globals["pod-account"] = process.env._POD_ACCOUNT;
  }

  setAsyncLocalStorage(asyncLocalStorage: any): void {
    this.asyncLocalStorage = asyncLocalStorage;
  }

  setRouter(r: Router): void {
    this.logRouter = r;
  }

  setConfig(
    source: string,
    logLvl: string,
    formatter: Formatter,
    output: (msg: string) => void,
  ): (msg: string) => void {
    this.globals.source = source;
    this.logLvl = this._validateLogLvl(logLvl);
    this.formatter = formatter;
    this.logWriter = output;
    return this.logWriter;
  }

  _validateLogLvl(logLvl: string | null | undefined): string {
    if (logLvl == null) return LEVELS.Debug;
    for (const value of Object.values(LEVELS)) {
      if (logLvl.toLowerCase() === value) return value;
    }
    return LEVELS.Debug;
  }

  setLogLevel(logLvl: string): string {
    this.logLvl = this._validateLogLvl(logLvl);
    return this.logLvl;
  }

  setFormatter(formatter: Formatter): Formatter {
    this.formatter = formatter;
    return this.formatter;
  }

  setOutput(output: (msg: string) => void): (msg: string) => void {
    this.logWriter = output;
    return this.logWriter;
  }

  trace(title: string): void {
    this.traceD(title, {});
  }
  debug(title: string): void {
    this.debugD(title, {});
  }
  info(title: string): void {
    this.infoD(title, {});
  }
  warn(title: string): void {
    this.warnD(title, {});
  }
  error(title: string): void {
    this.errorD(title, {});
  }
  critical(title: string): void {
    this.criticalD(title, {});
  }
  counter(title: string): void {
    this.counterD(title, 1, {});
  }
  gauge(title: string, value: number): void {
    this.gaugeD(title, value, {});
  }

  traceD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Trace, { title }, data);
  }
  debugD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Debug, { title }, data);
  }
  infoD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Info, { title }, data);
  }
  warnD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Warning, { title }, data);
  }
  errorD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Error, { title }, data);
  }
  criticalD(title: string, data: LogData): void {
    this._logWithLevel(LEVELS.Critical, { title }, data);
  }
  counterD(title: string, value: number, data: LogData): void {
    this._logWithLevel(LEVELS.Info, { title, value, type: "counter" }, data);
  }
  gaugeD(title: string, value: number, data: LogData): void {
    this._logWithLevel(LEVELS.Info, { title, value, type: "gauge" }, data);
  }

  _logWithLevel(logLvl: string, metadata: LogData, userdata: LogData): void {
    if (LOG_LEVEL_ENUM[logLvl] < LOG_LEVEL_ENUM[this.logLvl]) return;

    const store = this.asyncLocalStorage && this.asyncLocalStorage.getStore();
    const storeData = store || { get: () => ({}) };
    const contextData = storeData.get("context") ? storeData.get("context") : {};
    const plainContextData =
      contextData instanceof Map ? Object.fromEntries(contextData) : contextData;

    const data: LogData = Object.assign(
      { level: logLvl },
      this.globals,
      metadata,
      plainContextData,
      userdata,
    );

    if (this.logRouter) {
      data._kvmeta = this.logRouter.route(data);
    } else if (globalRouter) {
      data._kvmeta = globalRouter.route(data);
    }
    this.logWriter(this.formatter(data));
  }
}

export function mockRouting(cb: (done: () => Record<string, unknown[]>) => void): void {
  const _logWithLevel = Logger.prototype._logWithLevel as any;

  if (_logWithLevel.isMocked) {
    throw Error("Nested kv.mockRouting calls are not supported");
  }

  const ruleMatches: Record<string, unknown[]> = {};

  (Logger.prototype._logWithLevel as any) = function (logLvl: string, metadata: LogData, userdata: LogData) {
    const formatter = this.formatter;
    const logWriter = this.logWriter;

    this.formatter = (msg: any) => msg;
    this.logWriter = (msg: any) => {
      if (!msg._kvmeta) return;
      msg._kvmeta.routes.forEach((route: any) => {
        ruleMatches[route.rule] = (ruleMatches[route.rule] || []).concat(route);
      });
    };

    _logWithLevel.call(this, logLvl, metadata, userdata);

    this.formatter = formatter;
    this.logWriter = logWriter;
  };

  (Logger.prototype._logWithLevel as any).isMocked = true;

  const done = () => {
    Logger.prototype._logWithLevel = _logWithLevel;
    return ruleMatches;
  };

  cb(done);
}

// Expose module-level functions as static members on Logger for backwards compatibility.
// Tests and consumers that do `const { Logger: KV } = require("kayvee/logger")`
// can call `KV.setGlobalRouting(...)` and `KV.mockRouting(...)`.
(Logger as any).setGlobalRouting = setGlobalRouting;
(Logger as any).getGlobalRouter = getGlobalRouter;
(Logger as any).mockRouting = mockRouting;
