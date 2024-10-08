var assert = require("assert");
var router = require("../lib/router");
describe("router.Router", function () {
    describe("constructor", function () {
        it("parses well formatted configs", function () {
            process.env.SCHOOL = "Hogwarts";
            var conf = "\nroutes:\n  rule-one:\n    matchers:\n      title: [\"authorize-app\"]\n    output:\n      type: \"notifications\"\n      channel: \"%{foo.bar}\"\n      icon: \":rocket:\"\n      message: \"authorized %{foo.bar} in ${SCHOOL}\"\n      user: \"@fishman\"\n  rule-two:\n    matchers:\n      foo.bar: [\"multiple\", \"matches\"]\n      baz: [\"whatever\"]\n    output:\n      type: \"alerts\"\n      series: \"other-series\"\n      dimensions: [\"baz\"]\n      stat_type: \"gauge\"\n  rule-three:\n    matchers:\n      foo.bar: [\"multiple\", \"matches\"]\n      baz: [\"whatever\"]\n    output:\n      type: \"alerts\"\n      series: \"other-series\"\n      dimensions: [\"baz\"]\n      stat_type: \"gauge\"\n      value_field: \"hello\"\n  rule-four:\n    matchers:\n      foo.bar: [\"multiple\", \"matches\"]\n      baz: [\"whatever\"]\n    output:\n      type: \"alerts\"\n      series: \"other-series\"\n      dimensions: []\n      stat_type: \"gauge\"\n  rule-five:\n    matchers:\n      foo.bar: [true]\n      baz: [false]\n    output:\n      type: \"alerts\"\n      series: \"other-series\"\n      dimensions: []\n      stat_type: \"gauge\"\n";
            var expected = [
                new router.Rule("rule-one", { title: ["authorize-app"] }, {
                    type: "notifications",
                    channel: "%{foo.bar}",
                    icon: ":rocket:",
                    message: "authorized %{foo.bar} in Hogwarts",
                    user: "@fishman",
                }),
                new router.Rule("rule-two", { "foo.bar": ["multiple", "matches"], baz: ["whatever"] }, {
                    type: "alerts",
                    series: "other-series",
                    dimensions: ["baz"],
                    stat_type: "gauge",
                    value_field: "value",
                }),
                new router.Rule("rule-three", { "foo.bar": ["multiple", "matches"], baz: ["whatever"] }, {
                    type: "alerts",
                    series: "other-series",
                    dimensions: ["baz"],
                    stat_type: "gauge",
                    value_field: "hello",
                }),
                new router.Rule("rule-four", { "foo.bar": ["multiple", "matches"], baz: ["whatever"] }, {
                    type: "alerts",
                    series: "other-series",
                    dimensions: [],
                    stat_type: "gauge",
                    value_field: "value",
                }),
                new router.Rule("rule-five", { "foo.bar": [true], baz: [false] }, {
                    type: "alerts",
                    series: "other-series",
                    dimensions: [],
                    stat_type: "gauge",
                    value_field: "value",
                }),
            ];
            var actual = new router.Router();
            actual._loadConfigString(conf);
            assert.deepEqual(actual.rules, expected);
        });
        it("rejects specials in matchers", function () {
            var confTmpl = function (v) { return "\nroutes:\n  non-string-values:\n    matchers:\n      no-numbers: [" + v + "]\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n"; };
            // Make sure the template works
            var conf = confTmpl('"valid"');
            var actual = new router.Router();
            assert.doesNotThrow(function () { return actual._loadConfigString(conf); });
            var _loop_1 = function (invalidVal) {
                var invalidConf = confTmpl(invalidVal);
                assert.throws(function () { return actual._loadConfigString(invalidConf); });
            };
            for (var _i = 0, _a = ["5", "[]", "{}"]; _i < _a.length; _i++) {
                var invalidVal = _a[_i];
                _loop_1(invalidVal);
            }
            assert.throws(function () { return actual._loadConfigString(confTmpl('""')); });
            return;
        });
        it("rejects duplicates in matchers", function () {
            var confTmpl = function (v) { return "\nroutes:\n  sloppy:\n    matchers:\n      title: [" + v + "]\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n"; };
            var actual = new router.Router();
            var validConf = confTmpl('"non-repeated", "name"');
            assert.doesNotThrow(function () { return actual._loadConfigString(validConf); });
            var invalidConf = confTmpl('"repeated", "repeated", "name"');
            assert.throws(function () { return actual._loadConfigString(invalidConf); });
        });
        it("requires correct types in outputs", function () {
            var confTmpl = function (series, dimensions) { return "\nroutes:\n  wrong:\n    matchers:\n      title: [\"test\"]\n    output:\n      type: \"alerts\"\n      series: " + series + "\n      dimensions: " + dimensions + "\n      value_field: \"hihi\"\n      stat_type: \"gauge\"\n"; };
            var actual = new router.Router();
            var validConf = confTmpl('"my-series"', '["dim1", "dim2"]');
            assert.doesNotThrow(function () { return actual._loadConfigString(validConf); });
            var invalidConf0 = confTmpl('["my-series"]', '["dim1", "dim2"]');
            assert.throws(function () { return actual._loadConfigString(invalidConf0); });
            var invalidConf1 = confTmpl('"my-series"', '"dim1"');
            assert.throws(function () { return actual._loadConfigString(invalidConf1); });
        });
        it("requires all keys in outputs", function () {
            var confTmpl = function (v) { return "\nroutes:\n  wrong:\n    matchers:\n      title: [\"test\"]\n    output:\n      type: \"alerts\"" + v + "\n      dimensions: [\"dim1\", \"dim2\"]\n      stat_type: \"gauge\"\n"; };
            var actual = new router.Router();
            var validConf = confTmpl("\n      series: \"whatever\"");
            assert.doesNotThrow(function () { return actual._loadConfigString(validConf); });
            var invalidConf = confTmpl("");
            assert.throws(function () { return actual._loadConfigString(invalidConf); });
        });
        it("doesn't allow extra keys", function () {
            var confTmpl = function (v) { return "\nroutes:\n  wrong:\n    matchers:\n      title: [\"test\"]\n    output:\n      type: \"metrics\"" + v + "\n      dimensions: [\"dim1\", \"dim2\"]\n"; };
            var actual = new router.Router();
            var validConf = confTmpl("\n      series: \"whatever\"");
            assert.doesNotThrow(function () { return actual._loadConfigString(validConf); });
            var invalidConf = confTmpl("\n      series: \"whatever\"\n      something-else: \"hi there\"");
            assert.throws(function () { return actual._loadConfigString(invalidConf); });
        });
        it("errors on type-os", function () {
            var actual = new router.Router();
            var config;
            config = "\nroute: # Should be routes (plural)\n  string-values:\n    matchers:\n      errors: [ \"type-o\" ]\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
            config = "\nroutes:\n  string-values:\n    matcher: # Should be matchers (plural)\n      errors: [ \"type-o\" ]\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
            config = "\nroutes:\n  string-values:\n    matchers:\n      errors: [ \"type-o\" ]\n    outputs: # Should be output (signular)\n      type: \"analytics\"\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
            config = "\nroutes:\n  $invalid-string-values: # Invalid rule name\n    matchers:\n      errors: [ \"type-o\" ]\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
            config = "\nroutes:\n  string-values:\n    matchers:\n      errors: [ \"type-o\" ]\n    output:\n      type: \"analytic\" # Should be analytics (plural)p\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
            config = "\nroutes:\n  string-values:\n    matchers:\n      errors: [ \"*\", \"type-o\" ] # A wildcard cannot exist with other matchers\n    output:\n      type: \"analytics\"\n      series: \"fun\"\n";
            assert.throws(function () { return actual._loadConfigString(config); });
        });
    });
    describe("route", function () {
        it("matches one or more rule and returns appropriate outputs", function () {
            var r = new router.Router([
                new router.Rule("rule-one", { title: ["hello", "hi"], foo: ["bar", "baz"] }, { channel: "#-%{foo}-", dimensions: ["-%{foo}-"] }),
                new router.Rule("rule-two", { "bing.bong": ["buzz"] }, { series: "x" }),
            ]);
            var msg0 = {
                title: "hi",
                foo: "bar",
            };
            var expected0 = [
                {
                    rule: "rule-one",
                    channel: "#-bar-",
                    dimensions: ["-bar-"],
                },
            ];
            var actual0 = r.route(msg0).routes;
            assert.deepEqual(expected0, actual0);
            var msg1 = {
                title: "hi",
                bing: {
                    bong: "buzz",
                },
            };
            var expected1 = [
                {
                    rule: "rule-two",
                    series: "x",
                },
            ];
            var actual1 = r.route(msg1).routes;
            assert.deepEqual(expected1, actual1);
            var msg2 = {
                title: "hello",
                foo: "baz",
                bing: {
                    bong: "buzz",
                },
            };
            var expected2 = [
                {
                    rule: "rule-one",
                    channel: "#-baz-",
                    dimensions: ["-baz-"],
                },
                {
                    rule: "rule-two",
                    series: "x",
                },
            ];
            var actual2 = r.route(msg2).routes;
            assert.deepEqual(expected2, actual2);
        });
    });
});
describe("router.Rule", function () {
    describe("matches", function () {
        it("works on simple cases", function () {
            var r = new router.Rule("test-rule", { title: ["hello", "hi"], foo: ["bar"] }, {});
            assert(r.matches({
                title: "hello",
                foo: "bar",
            }));
            assert(r.matches({
                title: "hi",
                foo: "bar",
            }));
            assert(!r.matches({
                title: "hi",
                foo: "fighters",
            }));
            assert(!r.matches({
                title: "howdy",
                foo: "bar",
            }));
            assert(!r.matches({
                "missing-stuff": "indeed",
            }));
        });
        it("works on nested messages", function () {
            var r = new router.Rule("test-rule", { "foo.bar": ["hello", "hi"] }, {});
            assert(r.matches({
                title: "greeting",
                foo: {
                    bar: "hello",
                },
            }));
            assert(r.matches({
                title: "greeting",
                foo: {
                    bar: "hi",
                },
            }));
            assert(!r.matches({
                title: "greeting",
                foo: {
                    bar: "howdy",
                },
            }));
            assert(!r.matches({
                title: "greeting",
                foo: {
                    baz: "howdy",
                },
            }));
            assert(!r.matches({
                title: "greeting",
                boo: {
                    bar: "howdy",
                },
            }));
            assert(!r.matches({
                title: "greeting",
                foo: "hi",
            }));
        });
        it("wild card matching", function () {
            var r = new router.Rule("test-rule", { any: ["*"] }, {});
            assert(r.matches({
                any: false,
            }));
            assert(r.matches({
                any: 5,
            }));
            assert(r.matches({
                any: "hello",
            }));
            assert(r.matches({
                any: {
                    bar: "hi",
                },
            }));
            assert(!r.matches({
                any: "",
            }));
            assert(!r.matches({
                any: null,
            }));
            assert(!r.matches({
                any: undefined,
            }));
            assert(!r.matches({
                title: "greeting",
                foo: {
                    bar: "howdy",
                },
            }));
        });
        it("bool matching", function () {
            var r = new router.Rule("test-rule", { bull: [true] }, {});
            assert(r.matches({
                bull: true,
            }));
            assert(r.matches({
                any: false,
                bull: true,
            }));
            assert(!r.matches({
                bull: false,
            }));
            assert(!r.matches({
                bull: "false",
            }));
            assert(!r.matches({
                title: "greeting",
                foo: {
                    bar: "howdy",
                },
            }));
        });
    });
    describe("outputFor", function () {
        it("substitutes kv entries", function () {
            var r = new router.Rule("myrule", {}, {
                channel: "#-%{foo}-",
                dimensions: ["-%{foo}-", "-%{bar.baz}-"],
            });
            var msg = {
                title: "greeting",
                foo: "partner",
                bar: {
                    baz: "nest egg",
                },
            };
            var expected = {
                rule: "myrule",
                channel: "#-partner-",
                dimensions: ["-partner-", "-nest egg-"],
            };
            var actual = r.outputFor(msg);
            assert.deepEqual(expected, actual);
        });
    });
});
