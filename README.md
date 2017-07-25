kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings.

Read the [Kayvee spec](https://github.com/Clever/kayvee) to learn more about the goals of Kayvee logging.

## Example: kayvee/logger

Initialization:

```js
var kayvee = require("kayvee");

var log = new kayvee.logger("logger-source");
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

## Example: Kayvee Log Routing

Log routing is a mechanism for defining where log lines should go once they've entered Clever's logging pipeline.   Routes are defined in a yaml file called kvconfig.yml.  Here's an example of a log routing rule that sends a slack message:

```js
// main.js
const kv = require("../kayvee-js");
kv.setGlobalRouting("./kvconfig.yml");

const log = new kv.logger("myApp");

module.exports = (cb) => {
    // Simple debugging
    log.debug("Service has started");

    // Do something async
    setImmediate(() => {
        // Output structured data
        log.infoD("DataResults", {"key": "value"}); // Sends slack message

        // You can use an object to send arbitrary key value pairs
        log.infoD("DataResults", {"shorter": "line"}); // will NOT send a slack message

        cb(null);
    });
};
```

```yml
# kvconfig.yml
routes:
  key-val:
    matchers:
      title: [ "DataResults", "QueryResults" ]
      key: [ "value" ]
    output:
      type: "notifications"
      channel: "#distribution"
      icon: ":rocket:"
      message: "%{key}"
      user: "Flight Tracker"
```

### Testing

To ensure that your log-routing rules are correct, use `mockRouting` to temporarily mock out kayvee.  The mock kayvee will record which rules and how often they were matched.


```js
// main-test.js
const assert = require("assert");

const kv = require("../kayvee-js");
kv.setGlobalRouting("./kvconfig.yml");

const main = require("./main");

kv.mockRouting(kvdone => { // Don't nest kv.mockRouting calls!!
    main(err => {
        assert.ifError(err);

        let ruleMatches = kvdone();
        assert.equal(ruleMatches["key-val"].length, 1);
    });
});
```

For more information on log routing see https://clever.atlassian.net/wiki/display/ENG/Log+Routing

## Testing

Run `make test` to execute the tests

## Change log

- v3.3.0 - Middleware log lines are now routable
- v3.2.0 - Exposed support for overriding the value field on metrics and alerts outputs
- v3.1.0 - Added support for matching on booleans and a wildcard ("*")
- v3.0.0 - Introduced log-routing
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
app.use(kayvee.middleware({"source":"my-app"}));
```

Note that `source` is a required field, since it clarifies which application is emitting the logs.

The middleware also supports further user configuration via the `options` object.
It prints the values of `headers` or the results of `handlers`.
If a value is `undefined`, the key will not be printed.

- `headers`
    - type: array of strings
    - each of these strings is a request header, e.g. `X-Request-Id`
- `handlers`
    - type: an array of functions that return dicts of key-val pairs to be added to the logger's output.
        These functions have the interface `(request, response) => { "key": "val" }`.
- `ignore_dir`
    - type: object containing the keys `directory` and `path`
        - `directory` is the absolute file path of the directory that contains static files. This is the path passed to `express.static`
        - `path` is the express mount point for these files. Defaults to `/`.
        This will ignore all requests with `statusCode < 400` to `path`/`file/path/in/dir`

For example, the below snippet causes the `X-Request-Id` request header and a param called `some_id` to be logged.


```js
var kayvee = require('kayvee');

var app = express();
var options = {
    source: "my-app",
    headers: ["x-request-id"],
    handlers: [
        (req, res) => { return {"some_id": req.params.some_id}; }
    ],
};
app.use(kayvee.middleware(options));
```

You can also log with the request context using `req.log`. For example:

```js
myRouteHandler(req, res) {
    doTheThing((err, data) => {
        if (err) {
            req.log.errorD("do_the_thing_error", {error: err.message});
            res.send(500);
        }
        req.log.infoD("do_the_thing_success", {response: data});
        res.send(200);
    });
}
```
