var assert = require("assert");
var router = require("../lib/router");

describe("router.Router", () => {
  describe("constructor", () => {
    it("parses well formatted configs", () => {
      process.env.SCHOOL = "Hogwarts";
      const conf = `
routes:
  rule-one:
    matchers:
      title: ["authorize-app"]
    output:
      type: "notifications"
      channel: "#team"
      icon: ":rocket:"
      message: "authorized %{foo.bar} in \${SCHOOL}"
      user: "@fishman"
  rule-two:
    matchers:
      foo.bar: ["multiple", "matches"]
      baz: ["whatever"]
    output:
      type: "alerts"
      series: "other-series"
      dimensions: ["baz"]
      stat_type: "gauge"
  rule-three:
    matchers:
      foo.bar: ["multiple", "matches"]
      baz: ["whatever"]
    output:
      type: "alerts"
      series: "other-series"
      dimensions: ["baz"]
      stat_type: "gauge"
      value_field: "hello"
`;
      const expected = [
        new router.Rule("rule-one", {title: ["authorize-app"]}, {
          type: "notifications",
          channel: "#team",
          icon: ":rocket:",
          message: "authorized %{foo.bar} in Hogwarts",
          user: "@fishman",
        }),
        new router.Rule("rule-two", {"foo.bar": ["multiple", "matches"], baz: ["whatever"]}, {
          type: "alerts",
          series: "other-series",
          dimensions: ["baz"],
          stat_type: "gauge",
          value_field: "value",
        }),
        new router.Rule("rule-three", {"foo.bar": ["multiple", "matches"], baz: ["whatever"]}, {
          type: "alerts",
          series: "other-series",
          dimensions: ["baz"],
          stat_type: "gauge",
          value_field: "hello",
        }),
      ];
      const actual = new router.Router();
      actual._loadConfigString(conf);
      assert.deepEqual(actual.rules, expected);
    });

    it("rejects specials in matchers", () => {
      const confTmpl = (v) => `
routes:
  non-string-values:
    matchers:
      no-numbers: [${v}]
    output:
      type: "analytics"
      series: "fun"
`;

      // Make sure the template works
      const conf = confTmpl("\"valid\"");
      const actual = new router.Router();
      assert.doesNotThrow(() => actual._loadConfigString(conf));

      for (const invalidVal of ["5", "true", "[]", "{}"]) {
        const invalidConf = confTmpl(invalidVal);
        assert.throws(() => actual._loadConfigString(invalidConf));
      }
      assert.throws(() => actual._loadConfigString(confTmpl("\"\"")));
      return;
    });


    it("rejects duplicates in matchers", () => {
      const confTmpl = (v) => `
routes:
  sloppy:
    matchers:
      title: [${v}]
    output:
      type: "analytics"
      series: "fun"
`;

      const actual = new router.Router();
      const validConf = confTmpl("\"non-repeated\", \"name\"");
      assert.doesNotThrow(() => actual._loadConfigString(validConf));

      const invalidConf = confTmpl("\"repeated\", \"repeated\", \"name\"");
      assert.throws(() => actual._loadConfigString(invalidConf));
    });

    it("requires correct types in outputs", () => {
      const confTmpl = (series, dimensions) => `
routes:
  wrong:
    matchers:
      title: ["test"]
    output:
      type: "alerts"
      series: ${series}
      dimensions: ${dimensions}
      value_field: "hihi"
      stat_type: "gauge"
`;

      const actual = new router.Router();
      const validConf = confTmpl("\"my-series\"", "[\"dim1\", \"dim2\"]");
      assert.doesNotThrow(() => actual._loadConfigString(validConf));

      const invalidConf0 = confTmpl("[\"my-series\"]", "[\"dim1\", \"dim2\"]");
      assert.throws(() => actual._loadConfigString(invalidConf0));

      const invalidConf1 = confTmpl("\"my-series\"", "\"dim1\"");
      assert.throws(() => actual._loadConfigString(invalidConf1));
    });

    it("requires all keys in outputs", () => {
      const confTmpl = (v) => `
routes:
  wrong:
    matchers:
      title: ["test"]
    output:
      type: "alerts"${v}
      dimensions: ["dim1", "dim2"]
      stat_type: "gauge"
`;

      const actual = new router.Router();
      const validConf = confTmpl(`
      series: "whatever"`);
      assert.doesNotThrow(() => actual._loadConfigString(validConf));

      const invalidConf = confTmpl("");
      assert.throws(() => actual._loadConfigString(invalidConf));
    });

    it("doesn't allow extra keys", () => {
      const confTmpl = (v) => `
routes:
  wrong:
    matchers:
      title: ["test"]
    output:
      type: "metrics"${v}
      dimensions: ["dim1", "dim2"]
`;

      const actual = new router.Router();
      const validConf = confTmpl(`
      series: "whatever"`);
      assert.doesNotThrow(() => actual._loadConfigString(validConf));

      const invalidConf = confTmpl(`
      series: "whatever"
      something-else: "hi there"`);
      assert.throws(() => actual._loadConfigString(invalidConf));
    });

    it("errors on type-os", () => {
      const actual = new router.Router();
      let config;

      config = `
route: # Should be routes (plural)
  string-values:
    matchers:
      errors: [ "type-o" ]
    output:
      type: "analytics"
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));

      config = `
routes:
  string-values:
    matcher: # Should be matchers (plural)
      errors: [ "type-o" ]
    output:
      type: "analytics"
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));

      config = `
routes:
  string-values:
    matchers:
      errors: [ "type-o" ]
    outputs: # Should be output (signular)
      type: "analytics"
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));

      config = `
routes:
  $invalid-string-values: # Invalid rule name
    matchers:
      errors: [ "type-o" ]
    output:
      type: "analytics"
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));

      config = `
routes:
  string-values:
    matchers:
      errors: [ "type-o" ]
    output:
      type: "analytic" # Should be analytics (plural)p
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));

      config = `
routes:
  string-values:
    matchers:
      errors: [ "*", "type-o" ] # A wildcard cannot exist with other matchers
    output:
      type: "analytics"
      series: "fun"
`;
      assert.throws(() => actual._loadConfigString(config));
    });
  });

  describe("route", () => {
    it("matches one or more rule and returns appropriate outputs", () => {
      const r = new router.Router([
        new router.Rule(
          "rule-one",
          {title: ["hello", "hi"], foo: ["bar", "baz"]},
          {channel: "#-%{foo}-", dimensions: ["-%{foo}-"]}
        ),
        new router.Rule(
          "rule-two",
          {"bing.bong": ["buzz"]},
          {series: "x"}
        ),
      ]);

      const msg0 = {
        title: "hi",
        foo:   "bar",
      };
      const expected0 = [{
        rule:       "rule-one",
        channel:    "#-bar-",
        dimensions: ["-bar-"],
      }];
      const actual0 = r.route(msg0).routes;
      assert.deepEqual(expected0, actual0);

      const msg1 = {
        title: "hi",
        bing: {
          bong: "buzz",
        },
      };
      const expected1 = [{
        rule:   "rule-two",
        series: "x",
      }];
      const actual1 = r.route(msg1).routes;
      assert.deepEqual(expected1, actual1);

      const msg2 = {
        title: "hello",
        foo:   "baz",
        bing: {
          bong: "buzz",
        },
      };
      const expected2 = [
        {
          rule:       "rule-one",
          channel:    "#-baz-",
          dimensions: ["-baz-"],
        },
        {
          rule:   "rule-two",
          series: "x",
        },
      ];
      const actual2 = r.route(msg2).routes;
      assert.deepEqual(expected2, actual2);
    });
  });
});

describe("router.Rule", () => {
  describe("matches", () => {
    it("works on simple cases", () => {
      const r = new router.Rule("test-rule", {title: ["hello", "hi"], foo: ["bar"]}, {});
      assert(r.matches({
        title: "hello",
        foo:   "bar",
      }));
      assert(r.matches({
        title: "hi",
        foo:   "bar",
      }));
      assert(!r.matches({
        title: "hi",
        foo:   "fighters",
      }));
      assert(!r.matches({
        title: "howdy",
        foo:   "bar",
      }));
      assert(!r.matches({
        "missing-stuff": "indeed",
      }));
    });

    it("works on nested messages", () => {
      const r = new router.Rule("test-rule", {"foo.bar": ["hello", "hi"]}, {});
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
    it("wild card matching", () => {
      const r = new router.Rule("test-rule", {any: ["*"]}, {});
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
    it("bool matching", () => {
      const r = new router.Rule("test-rule", {bull: [true]}, {});
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

  describe("outputFor", () => {
    it("substitutes kv entries", () => {
      const r = new router.Rule("myrule", {}, {
        channel:    "#-%{foo}-",
        dimensions: ["-%{foo}-", "-%{bar.baz}-"],
      });
      const msg = {
        title: "greeting",
        foo:   "partner",
        bar: {
          baz: "nest egg",
        },
      };
      const expected = {
        rule:       "myrule",
        channel:    "#-partner-",
        dimensions: ["-partner-", "-nest egg-"],
      };
      const actual = r.outputFor(msg);
      assert.deepEqual(expected, actual);
    });
  });
});
