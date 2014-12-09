kayvee-js
=========

Package kayvee provides methods to output human and machine parseable strings,
as stringified JSON.

See more about the [goals of the Kayvee logging libraries](github.com/Clever/kayvee).

## Example

Here's an example program that outputs a kayvee formatted string:

```coffee
kayvee = require 'kayvee'

console.log kayvee.format {"hello":"world"}
console.log kayvee.formatLog "test_source", kayvee.INFO, "title", {"foo" : 1, "bar" : "baz"}
## Testing


Run `make test` to execute the tests

## Change log

v0.0.1 - Initial release.

## Usage

#### func  Format

```go
func Format(data map[string]interface{}) string
```
Format converts a map to a string of space-delimited key=val pairs

#### func  FormatLog

```go
func FormatLog(source string, level string, title string, data map[string]interface{}) string
```
FormatLog is similar to Format, but takes additional reserved params to promote
logging best-practices
