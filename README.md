kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings.

Read the [Kayvee spec](https://github.com/Clever/kayvee) to learn more about the goals of Kayvee logging.

## Example: kayvee/logger

Initialization:

```js
var kayvee = require("kayvee");

var log = new kayvee.Logger("logger-source");
```

Use it to write metrics:

```js
log.gauge("gauge-simple", 18)
log.gaugeD("gauge-with-extra-data", 3, {user_id: "value", scope: "scope_system"})
```
and structured logs:

```js
log.infoD("non-metric-log", {"msg": "this is my info", user: "user-id", group: "group-id"})
log.error("this is an error with no extra structured metadata")
```

## Example: Kayvee Internals

Here's are two examples snippets that log a kayvee formatted string:

```js
console.error(kayvee.format({"hello":"world"}));
# {"hello":"world"}
```

```js
console.error(kayvee.formatLog("test_source", kayvee.INFO, "title", {"foo" : 1, "bar" : "baz"}));
# {"foo":1,"bar":"baz","source":"test_source","level":"info","title":"title"}
```

## Testing

Run `make test` to execute the tests

## Change log

- v2.4.0 - Add middleware.
- v2.3.0 - Convert CoffeeScript to ES6 / Typescript.
- v2.0.0 - Implement `logger` functionality along with support for `gauge` and `counter` metrics
- v1.0.3 - Readme cleanup.
- v1.0.2 - Prints stringified JSON, published as Javascript lib to NPM.
- v0.0.1 - Initial release.

## Usage

### Logger

#### kayvee/logger constructor

```js
# only source is required
var log = new kayvee.Logger(source, logLvl = process.env.KAYVEE_LOG_LEVEL, formatter = kv.format, output = console.error)
```

An environment variable named `KAYVEE_LOG_LEVEL` can be used instead of setting `logLvl` in the application.

#### kayvee/logger setConfig

```js
log.setConfig(source, logLvl, formatter, output)
```

You can also individually set the `config` using:

* `setLogLevel`: defaults to `LOG_LEVELS.Debug`
* `setFormatter`: defaults to `kv.format`
* `setOutput`: defaults to `console.error`

#### kayvee/logger logging

Titles only:

* `log.debug("title")`
* `log.info("title")`
* `log.warn("title")`
* `log.error("title")`
* `log.critical("title")`

Title + Metadata:

* `log.debugD("title" {key1: "value", key2: "val"})`
* `log.infoD("title" {key1: "value", key2: "val"})`
* `log.warnD("title" {key1: "value", key2: "val"})`
* `log.errorD("title" {key1: "value", key2: "val"})`
* `log.criticalD("title" {key1: "value", key2: "val"})`

#### kayvee/logger metrics

* `log.counter("counter-name")` defaults to value of `1`
* `log.gauge("gauge-name", 100)`

* `log.counterD("counter-with-data", 2, {extra: "info"})`
* `log.gaugeD("gauge-with-data", 2, {extra: "info"})`

### Formatters

#### format

```js
kayvee.format(data)
```
Format converts a map to stringified json output

#### formatLog

```js
kayvee.formatLog(source, level, title, data)
```
`formatLog` is similar to `format`, but takes additional reserved params to promote
logging best-practices

- `source` (string) - locality of the log; an application name or part of an application
- `level` (string) - available levels are
    - "unknown
    - "critical
    - "error"
    - "warning"
    - "info"
- `title` (string) - the event that occurred
- `data` (object) - other parameters describing the event

### Middleware

Kayvee includes logging middleware, compatible with expressJS.

The middleware can be added most simply via

```js
var kayvee = require('kayvee');

var app = express();
app.use(kayvee.middleware({"source":"my-app"));
```

It also supports additional user configuration via an `options` object.
It prints the values of the headers or the results of the handlers.
If a value is `undefined`, the key will not be printed.

- `headers`
    - type: array of strings
    - each of these strings is a request header, e.g. `X-Request-Id`
- `handlers`
    - type: an array of functions that return dicts of key-val pairs to be added to the logger's output.
        These functions have the interface `(request, response) => { "key": "val" }`.

For example, the below snippet causes the `X-Request-Id` request header and a param called `some_id` to be logged.


```js
var kayvee = require('kayvee');

var app = express();
var options = {
    source: "my-app",
    headers: ["x-request-id"],
    handlers: [
        (request, response) => {"some_id": request.params.some_id});
    ],
};
app.use(kayvee.middleware(options));
```
