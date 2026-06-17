import fs from "fs";
import path from "path";
import { parse as parseUrl } from "url";
import morgan from "morgan";
import qs from "qs";
import { format as kvFormat } from "./kayvee";
import { Logger, getGlobalRouter } from "./logger/logger";
import type { Request, Response, NextFunction } from "express";

function walkDirSync(dir: string, files: string[] = []): string[] {
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const f = path.join(dir, file);
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      walkDirSync(f, files);
    } else {
      files.push(f);
    }
  });
  return files.map((f) => path.relative(dir, f));
}

function skip_path(dir: string, base_path = "/"): (req: Request, res: Response) => boolean {
  let files = walkDirSync(dir);
  files = files.map((file) => path.join(base_path, file));
  console.error(
    `KayveeMiddleware: Skipping successful requests for files in ${dir} at ${base_path}`,
  );
  return (req: Request, res: Response) => files.includes(req.path) && res.statusCode < 400;
}

function getBaseUrl(req: Request): string | null {
  const url = req.originalUrl || req.url;
  const parsed = parseUrl(url, true);
  return parsed.pathname ?? null;
}

function getQueryParams(req: Request): string {
  const url = req.originalUrl || req.url;
  const parsed = parseUrl(url, true);
  const parsedQueryString = qs.parse(parsed.search ?? "", {
    allowPrototypes: false,
    ignoreQueryPrefix: true,
  });
  return `?${qs.stringify(parsedQueryString)}`;
}

function getResponseSize(res: Response): number | undefined {
  const headers = res.getHeaders ? res.getHeaders() : (res as any)._headers;
  if (headers && headers["content-length"]) {
    return Number(headers["content-length"]);
  } else if ((res as any).data) {
    return (res as any).data.length;
  }
  return undefined;
}

function getResponseTimeNs(req: Request, res: Response): number | undefined {
  if (!(req as any)._startAt || !(res as any)._startAt) {
    return undefined;
  }
  const ns =
    ((res as any)._startAt[0] - (req as any)._startAt[0]) * 1e9 +
    ((res as any)._startAt[1] - (req as any)._startAt[1]);
  return ns;
}

function getIp(req: Request): string | undefined {
  const remoteAddress = (req as any).connection ? (req as any).connection.remoteAddress : undefined;
  return req.ip || remoteAddress;
}

function getLogLevel(req: Request, res: Response): string {
  const statusCode = res.statusCode;
  if (statusCode >= 499) {
    return Logger.Error;
  }
  return Logger.Info;
}

type Handler = (req: Request, res?: Response) => Record<string, unknown>;

const defaultHandlers: Handler[] = [
  (req) => ({ method: req.method }),
  (req) => ({ path: getBaseUrl(req) }),
  (req) => ({ params: getQueryParams(req) }),
  (req, res) => ({ "response-size": getResponseSize(res!) }),
  (req, res) => ({ "response-time": getResponseTimeNs(req, res!) }),
  (req, res) => ({ "status-code": res!.statusCode }),
  (req) => ({ ip: getIp(req) }),
  () => ({ via: "kayvee-middleware" }),
  (req, res) => ({ level: getLogLevel(req, res!) }),
  () => ({ title: "request-finished" }),
];

const defaultContextHandlers: Handler[] = [];

function handlerData(handlers: Handler[], req: Request, res?: Response): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  handlers.forEach((h) => {
    try {
      const handler_data = h(req, res);
      if (handler_data !== null && typeof handler_data === "object" && !Array.isArray(handler_data)) {
        Object.assign(data, handler_data);
      }
    } catch (e) {
      // swallow invalid handler
    }
  });
  return data;
}

export class ContextLogger {
  logger: any;
  handlers: Handler[];
  req: Request;
  res?: Response;

  constructor(logger: any, handlers: Handler[], req: Request, res?: Response) {
    this.logger = logger;
    this.handlers = handlers;
    this.req = req;
    this.res = res;
  }

  _contextualData(data: Record<string, unknown>): Record<string, unknown> {
    return Object.assign(handlerData(this.handlers, this.req, this.res), data);
  }
}

for (const func of Logger.LEVELS) {
  (ContextLogger.prototype as any)[func] = function (title: string) {
    this[`${func}D`](title, {});
  };
  (ContextLogger.prototype as any)[`${func}D`] = function (
    title: string,
    data: Record<string, unknown>,
  ) {
    this.logger[`${func}D`](title, this._contextualData(data));
  };
}

for (const func of Logger.METRICS) {
  (ContextLogger.prototype as any)[func] = function (title: string, value: number) {
    this[`${func}D`](title, value, {});
  };
  (ContextLogger.prototype as any)[`${func}D`] = function (
    title: string,
    value: number,
    data: Record<string, unknown>,
  ) {
    this.logger[`${func}D`](title, value, this._contextualData(data));
  };
}

export interface MiddlewareOptions {
  source: string;
  headers?: string[];
  handlers?: Handler[];
  base_handlers?: Handler[];
  ignore_dir?: { directory: string; path: string };
}

const formatLine = (options_arg: MiddlewareOptions) => {
  const options: MiddlewareOptions = options_arg || ({} as MiddlewareOptions);

  if (!options.source) {
    throw Error("Missing required config for 'source' in Kayvee middleware 'options'");
  }

  const router = getGlobalRouter();

  return (_tokens: any, req: Request, res: Response) => {
    const data: Record<string, unknown> = {};

    const custom_headers = options.headers || [];
    const header_data: Record<string, unknown> = {};
    custom_headers.forEach((h) => {
      const lc = h.toLowerCase();
      header_data[lc] = req.headers[lc];
    });
    Object.assign(data, header_data);

    const custom_handlers = options.handlers || [];
    let base_handlers = options.base_handlers || defaultHandlers;
    base_handlers = base_handlers.concat([() => ({ source: options.source })]);

    const all_handlers = custom_handlers.concat(base_handlers);
    Object.assign(data, handlerData(all_handlers, req, res));

    if (router) {
      data._kvmeta = router.route(data);
    }

    return kvFormat(data);
  };
};

const defaultContextLoggerOpts = {
  enabled: true,
  handlers: defaultContextHandlers,
};

export function middleware(
  clever_options: MiddlewareOptions,
  secondOpt?: any,
): (req: Request, res: Response, next: NextFunction) => void {
  if (process.env.NODE_ENV === "test") {
    const morgan_options = secondOpt || { skip: null };
    if (clever_options.ignore_dir) {
      morgan_options.skip = skip_path(
        clever_options.ignore_dir.directory,
        clever_options.ignore_dir.path,
      );
    }
    return morgan(formatLine(clever_options), morgan_options) as any;
  }

  if (!clever_options.source) {
    throw new Error("Missing required config for 'source' in Kayvee middleware 'options'");
  }
  const context_logger_options = secondOpt || defaultContextLoggerOpts;
  const logger = new Logger(clever_options.source);
  const morgan_options: any = {
    stream: process.stderr,
    skip: null,
  };
  if (clever_options.ignore_dir) {
    morgan_options.skip = skip_path(
      clever_options.ignore_dir.directory,
      clever_options.ignore_dir.path,
    );
  }
  const morgan_logger = morgan(formatLine(clever_options), morgan_options) as any;
  return (req: Request, res: Response, next: NextFunction) => {
    if (context_logger_options.enabled) {
      (req as any).log = new ContextLogger(logger, context_logger_options.handlers, req);
    }
    morgan_logger(req, res, next);
  };
}
