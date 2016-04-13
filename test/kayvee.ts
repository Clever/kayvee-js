var kv  = require("../lib/kayvee");
var assert = require("assert");
var _ = require("underscore");
_.mixin = require("underscore.deep");
var fs = require("fs");

describe("kayvee", () => {
  const tests = JSON.parse(fs.readFileSync("test/tests.json"));
  describe(".format", () => {
    _.each(tests.format, (spec) => {
      it(spec.title, () => {
        const actual = kv.format(spec.input.data);
        const expected = spec.output;
        assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
      });
    });
  });

  describe(".formatLog", () => {
    _.each(tests.formatLog, (spec) => {
      it(spec.title, () => {
        const actual = kv.formatLog(spec.input.source, spec.input.level, spec.input.title, spec.input.data);
        const expected = spec.output;
        assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
      });
    });
  });
});
