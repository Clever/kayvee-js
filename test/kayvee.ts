var kv  = require("../lib/kayvee");
var assert = require("assert");
var _ = require("underscore");
var fs = require("fs");

describe("kayvee", () => {
  const tests = JSON.parse(fs.readFileSync("test/tests.json"));
  describe(".format", () => {
    _.each(tests.format, (spec) => {
      it(spec.title, () => {
        const actual = kv.format(spec.input.data);
        const expected = spec.output;
        assert.deepEqual(JSON.parse(actual), _.extend({deploy_env: "testing", workflow_id: "abc"},
                                                      JSON.parse(expected)));
      });
    });
  });

  describe(".format with Errors", () => {
    it("encodes Error objects", () => {
      const actual = kv.format({err: Error("An Error Message")});
      const expected = {
        deploy_env: "testing",
        workflow_id: "abc",
        err: "Error: An Error Message",
      };
      assert.deepEqual(JSON.parse(actual), expected);
    });
  });

  describe(".formatLog", () => {
    _.each(tests.formatLog, (spec) => {
      it(spec.title, () => {
        const actual = kv.formatLog(spec.input.source, spec.input.level, spec.input.title, spec.input.data);
        const expected = spec.output;
        assert.deepEqual(JSON.parse(actual), _.extend({deploy_env: "testing", workflow_id: "abc"},
                                                      JSON.parse(expected)));
      });
    });
  });
});
