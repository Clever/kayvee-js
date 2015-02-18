kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings.

Read the [Kayvee spec](https://github.com/Clever/kayvee) to learn more about the goals of Kayvee logging.

## Example

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

- v0.0.1 - Initial release.
- v1.0.2 - Prints stringified JSON, published as Javascript lib to NPM.
- v1.0.3 - Readme cleanup.

## Usage

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
    - "trace"
- `title` (string) - the event that occurred
- `data` (object) - other parameters describing the event
