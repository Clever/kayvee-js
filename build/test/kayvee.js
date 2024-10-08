var kv = require("../lib/kayvee");
var assert = require("assert");
var _ = require("underscore");
var fs = require("fs");
describe("kayvee", function () {
    var tests = JSON.parse(fs.readFileSync("test/tests.json"));
    describe(".format", function () {
        _.each(tests.format, function (spec) {
            it(spec.title, function () {
                var actual = kv.format(spec.input.data);
                var expected = spec.output;
                assert.deepEqual(JSON.parse(actual), _.extend({ deploy_env: "testing", wf_id: "abc" }, JSON.parse(expected)));
            });
        });
    });
    describe(".format with Errors", function () {
        it("encodes Error objects", function () {
            var actual = kv.format({ err: Error("An Error Message") });
            var expected = {
                deploy_env: "testing",
                wf_id: "abc",
                err: "Error: An Error Message",
            };
            assert.deepEqual(JSON.parse(actual), expected);
        });
    });
    describe(".formatLog", function () {
        _.each(tests.formatLog, function (spec) {
            it(spec.title, function () {
                var actual = kv.formatLog(spec.input.source, spec.input.level, spec.input.title, spec.input.data);
                var expected = spec.output;
                assert.deepEqual(JSON.parse(actual), _.extend({ deploy_env: "testing", wf_id: "abc" }, JSON.parse(expected)));
            });
        });
    });
});
