import * as kv from "../lib/kayvee";
import assert from "assert";
import fs from "node:fs";

describe("kayvee", () => {
  const tests = JSON.parse(fs.readFileSync("test/tests.json"));
  describe(".format", () => {
    tests.format.forEach((spec) => {
      it(spec.title, () => {
        const actual = kv.format(spec.input.data);
        const expected = spec.output;
        assert.deepEqual(
          JSON.parse(actual),
          Object.assign({ deploy_env: "testing", wf_id: "abc" }, JSON.parse(expected)),
        );
      });
    });
  });

  describe(".format with Errors", () => {
    it("encodes Error objects", () => {
      const actual = kv.format({ err: Error("An Error Message") });
      const expected = {
        deploy_env: "testing",
        wf_id: "abc",
        err: "Error: An Error Message",
      };
      assert.deepEqual(JSON.parse(actual), expected);
    });
  });

  describe(".formatLog", () => {
    tests.formatLog.forEach((spec) => {
      it(spec.title, () => {
        const actual = kv.formatLog(
          spec.input.source,
          spec.input.level,
          spec.input.title,
          spec.input.data,
        );
        const expected = spec.output;
        assert.deepEqual(
          JSON.parse(actual),
          Object.assign({ deploy_env: "testing", wf_id: "abc" }, JSON.parse(expected)),
        );
      });
    });
  });
});
