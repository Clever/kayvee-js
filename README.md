kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings.

Read the [Kayvee spec](https://github.com/Clever/kayvee) to learn more about the goals of Kayvee logging.

## Example: kayvee/logger

Initialization:

```coffee
logger = require "kayvee/logger"

log = logger("logger-source")
```

Use it to write metrics:

```coffee
log.gaugeD "gauge-title", 3, {user_id: "value", scope: "scope_system"}
log.gauge "gauge-simple", 18
```
and structured logs:

```coffee
log.infoD "non-metric-log", {"msg": "this is my info", user: "user-id", group: "group-id"}
log.error "really. this is an error with no more structured metadata"
```

## Example: Kayvee Internals

Here's are two examples snippets that log a kayvee formatted string:

```coffee
console.error kayvee.format {"hello":"world"}
# {"hello":"world"}
```

```coffee
console.error kayvee.formatLog "test_source", kayvee.INFO, "title", {"foo" : 1, "bar" : "baz"}
# {"foo":1,"bar":"baz","source":"test_source","level":"info","title":"title"}
```

## Testing

Run `make test` to execute the tests

## Change log

- v2.0.0 - Implement `logger` functionality along with support for `gauge` and `counter` metrics
- v1.0.3 - Readme cleanup.
- v1.0.2 - Prints stringified JSON, published as Javascript lib to NPM.
- v0.0.1 - Initial release.

## Usage

#### kayvee/logger constructor

```coffee
# only source is required
logger source, logLvl=null, @formatter=kv.format, output=console.error
```

An environment variable named `KAYVEE_LOG_LEVEL` can be used instead of setting `logLvl` in the application.

#### kayvee/logger setConfig

```coffee
logger.setConfig source, logLvl, formatter, output
```

You can also individually set the `config` using: 

* `setLogLevel`: defaults to `LOG_LEVELS.Debug`
* `setFormatter`: defaults to `kv.format`
* `setOutput`: defaults to `console.error`

#### kayvee/logger logging

Titles only:

* `log.debug "title"`
* `log.info "title"`
* `log.warn "title"`
* `log.error "title"`
* `log.critical "title"`

Title + Metadata:

* `log.debugD "title" {key1: "value", key2: "val"}`
* `log.infoD "title" {key1: "value", key2: "val"}`
* `log.warnD "title" {key1: "value", key2: "val"}`
* `log.errorD "title" {key1: "value", key2: "val"}`
* `log.criticalD "title" {key1: "value", key2: "val"}`

#### kayvee/logger metrics

* `log.counter "counter-name"` defaults to value of `1`
* `log.gauge "gauge-name", 100`

* `log.counterD "counter-with-data", 2, {extra: "info"}`
* `log.gaugeD "gauge-with-data", 2, {extra: "info"}`

#### format

```coffee
kayvee.format data
```
Format converts a map to stringified json output

#### formatLog

```coffee
kayvee.formatLog source, level, title, data
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
