kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings.

Read the [Kayvee spec](https://github.com/Clever/kayvee) to learn more about the goals of Kayvee logging.

## Installation

```
npm install kayvee
```

## Usage

### Logger

```ts
import * as kv from "kayvee";

const log = new kv.Logger("my-app");

// Title only
log.info("server-started");
log.warn("high-memory");
log.error("db-connection-failed");
log.critical("out-of-disk");

// Title + structured data
log.infoD("request-handled", { method: "GET", path: "/api/users", duration_ms: 42 });
log.errorD("db-query-failed", { table: "users", error: err.message });
```

The constructor signature is:

```ts
new kv.Logger(source, logLevel?, formatter?, output?)
```

- `source` (required) — identifies the application or component emitting the log
- `logLevel` — defaults to `process.env.KAYVEE_LOG_LEVEL` or `"debug"`
- `formatter` — defaults to `kv.format`
- `output` — defaults to `console.error`

You can also configure after construction:

```ts
log.setLogLevel("warning");
log.setFormatter(kv.format);
log.setOutput(console.error);
```

#### Logging methods

Title only:

- `log.debug("title")`
- `log.info("title")`
- `log.warn("title")`
- `log.error("title")`
- `log.critical("title")`

Title + metadata:

- `log.debugD("title", { key: "value" })`
- `log.infoD("title", { key: "value" })`
- `log.warnD("title", { key: "value" })`
- `log.errorD("title", { key: "value" })`
- `log.criticalD("title", { key: "value" })`

#### Metrics

```ts
log.counter("counter-name")              // defaults to value 1
log.counterD("counter-name", 5, { extra: "info" })
log.gauge("gauge-name", 100)
log.gaugeD("gauge-name", 100, { extra: "info" })
```

### Formatters

#### `kv.format(data)`

Converts a map to stringified JSON, automatically injecting Clever deploy environment variables (`_DEPLOY_ENV`, `_POD_ID`, etc.) when present.

```ts
console.error(kv.format({ hello: "world" }));
// {"hello":"world"}
```

#### `kv.formatLog(source, level, title, data)`

Like `format`, but takes reserved logging params:

```ts
console.error(kv.formatLog("my-app", kv.INFO, "request-handled", { duration_ms: 42 }));
// {"duration_ms":42,"source":"my-app","level":"info","title":"request-handled"}
```

### Log Routing

Log routing defines where log lines go once they enter Clever's logging pipeline. Routes are defined in `kvconfig.yml`.

```ts
// main.ts
import * as kv from "kayvee";

kv.setGlobalRouting("./kvconfig.yml");

const log = new kv.Logger("my-app");

log.infoD("DataResults", { key: "value" }); // triggers the route below
```

```yml
# kvconfig.yml
routes:
  key-val:
    matchers:
      title: ["DataResults"]
      key: ["value"]
    output:
      type: "notifications"
      channel: "#my-channel"
      icon: ":rocket:"
      message: "%{key}"
      user: "My App"
```

#### Testing log routing

Use `mockRouting` to verify routes in tests:

```ts
import * as kv from "kayvee";
import { main } from "./main";

kv.setGlobalRouting("./kvconfig.yml");

kv.mockRouting(done => {
  main(err => {
    const ruleMatches = done();
    assert.equal(ruleMatches["key-val"].length, 1);
  });
});
```

For more information see https://clever.atlassian.net/wiki/spaces/ENG/pages/90570917/Application+Log+Routing

### Middleware

Kayvee includes Express-compatible logging middleware. Because it depends on
express types, it is exported from the `kayvee/middleware` subpath rather than
the package root — so consumers that only use the logger (e.g. generated API
clients) don't need express installed:

```ts
import express from "express";
import { middleware } from "kayvee/middleware";

const app = express();
app.use(middleware({ source: "my-app" }));
```

Additional options:

- `headers` — array of request header names to log (e.g. `["x-request-id"]`)
- `handlers` — array of `(req, res) => Record<string, string>` functions for custom fields
- `ignore_dir` — suppress `2xx` logs for static file requests; object with `directory` (absolute path) and `path` (express mount point, defaults to `/`)

```ts
app.use(middleware({
  source: "my-app",
  headers: ["x-request-id"],
  handlers: [
    (req, res) => ({ user_id: req.user?.id }),
  ],
}));
```

Log within a request handler using `req.log`:

```ts
app.get("/things/:id", (req, res) => {
  doTheThing((err, data) => {
    if (err) {
      req.log.errorD("do_the_thing_error", { error: err.message });
      return res.sendStatus(500);
    }
    req.log.infoD("do_the_thing_success", { id: req.params.id });
    res.json(data);
  });
});
```

## Development

```
make build   # compile TypeScript to dist/
make test    # run tests
make lint    # lint
```

## Change log

- v4.0.0 - Rewritten in TypeScript with ESM source, CommonJS dist output; `dist/` replaces `build/`
- v3.3.0 - Middleware log lines are now routable
- v3.2.0 - Exposed support for overriding the value field on metrics and alerts outputs
- v3.1.0 - Added support for matching on booleans and a wildcard ("*")
- v3.0.0 - Introduced log-routing
- v2.4.0 - Add middleware
- v2.3.0 - Convert CoffeeScript to ES6 / Typescript
- v2.0.0 - Implement `logger` functionality along with support for `gauge` and `counter` metrics
- v1.0.2 - Prints stringified JSON, published as Javascript lib to NPM
- v0.0.1 - Initial release
