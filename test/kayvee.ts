var kv  = require("../lib/kayvee");
var assert = require("assert");
var _ = require("underscore");
_.mixin = require("underscore.deep");
var fs = require("fs");

describe("kayvee", () => {
  const tests = JSON.parse(fs.readFileSync("test/tests.json"));
  describe(".format", () => {
    describe("without deploy_env", () => {
      _.each(tests.format, (spec) => {
        it(spec.title, () => {
          const actual = kv.format(spec.input.data);
          const expected = spec.output;
          assert.deepEqual(JSON.parse(actual), JSON.parse(expected));
        });
      });
    });
    describe("with deploy_env", () => {
      before(() => {
        process.env._DEPLOY_ENV = "testing";
      });
      after(() => {
        delete process.env._DEPLOY_ENV;
      });
      _.each(tests.format, (spec) => {
        it(spec.title, () => {
          const actual = kv.format(spec.input.data);
          const expected = spec.output;
          assert.deepEqual(JSON.parse(actual), _.extend({deploy_env: "testing"},
                                                        JSON.parse(expected)));
        });
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
