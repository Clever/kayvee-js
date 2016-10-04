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
      type: "notification"
      channel: "#team"
      icon: ":rocket:"
      message: "authorized %{foo.bar} in \${SCHOOL}"
      user: "@fishman"
  rule-two:
    matchers:
      foo.bar: ["multiple", "matches"]
      baz: ["whatever"]
    output:
      type: "alert"
      series: "other-series"
      dimensions: ["baz"]
      stat_type: "gauge"
`;
      const expected = [
        new router.Rule("rule-one", {title: ["authorize-app"]}, {
          type: "notification",
          channel: "#team",
          icon: ":rocket:",
          message: "authorized %{foo.bar} in Hogwarts",
          user: "@fishman",
        }),
        new router.Rule("rule-two", {"foo.bar": ["multiple", "matches"], baz: ["whatever"]}, {
          type: "alert",
          series: "other-series",
          dimensions: ["baz"],
          stat_type: "gauge",
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
      actual._loadConfigString(conf);

      for (const invalidVal of ["5", "true", "[]", "{}", "\"\""]) {
        const invalidConf = confTmpl(invalidVal);
        assert.throws(() => actual._loadConfigString(invalidConf));
      }
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
      actual._loadConfigString(validConf);

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
      type: "alert"
      series: ${series}
      dimensions: ${dimensions}
      stat_type: "gauge"
`;

      const actual = new router.Router();
      const validConf = confTmpl("\"my-series\"", "[\"dim1\", \"dim2\"]");
      actual._loadConfigString(validConf);

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
      type: "alert"${v}
      dimensions: ["dim1", "dim2"]
      stat_type: "gauge"
`;

      const actual = new router.Router();
      const validConf = confTmpl(`
      series: "whatever"`);
      actual._loadConfigString(validConf);

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
      type: "alert"${v}
      dimensions: ["dim1", "dim2"]
      stat_type: "gauge"
`;

      const actual = new router.Router();
      const validConf = confTmpl(`
      series: "whatever"`);
      actual._loadConfigString(validConf);

      const invalidConf = confTmpl(`
      series: "whatever"
      something-else: "hi there"`);
      assert.throws(() => actual._loadConfigString(invalidConf));
    });
  });

  describe("route", () => {
    it("works", () => {
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
      const msg0 = {
        title: "hello",
        foo:   "bar",
      };
      const msg1 = {
        title: "hi",
        foo:   "bar",
      };
      const msg2 = {
        title: "hi",
        foo:   "fighters",
      };
      const msg3 = {
        title: "howdy",
        foo:   "bar",
      };
      const msg4 = {
        "missing-stuff": "indeed",
      };
      assert(r.matches(msg0));
      assert(r.matches(msg1));
      assert(!r.matches(msg2));
      assert(!r.matches(msg3));
      assert(!r.matches(msg4));
    });

    it("works on nested messages", () => {
      const r = new router.Rule("test-rule", {"foo.bar": ["hello", "hi"]}, {});
      const msg0 = {
        title: "greeting",
        foo: {
          bar: "hello",
        },
      };
      const msg1 = {
        title: "greeting",
        foo: {
          bar: "hi",
        },
      };
      const msg2 = {
        title: "greeting",
        foo: {
          bar: "howdy",
        },
      };
      const msg3 = {
        title: "greeting",
        foo: {
          baz: "howdy",
        },
      };
      const msg4 = {
        title: "greeting",
        boo: {
          bar: "howdy",
        },
      };
      assert(r.matches(msg0));
      assert(r.matches(msg1));
      assert(!r.matches(msg2));
      assert(!r.matches(msg3));
      assert(!r.matches(msg4));
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
