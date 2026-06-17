import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { Validator } from "jsonschema";
import { load } from "js-yaml";

const require = createRequire(import.meta.url);
const schema = require("./schema_definitions.json");
const packageJson = require("../../package.json");

const kvVersion: string = packageJson.version;
const teamName = process.env._TEAM_OWNER || "UNSET";

const reEnvvarTokens = new RegExp("\\$\\{(.+?)\\}", "g");
const reFieldTokens = new RegExp("%\\{(.+?)\\}", "g");

// For performance reason this code is intentionally redundant and not-inlined.
// Removing redundancy and inlining this function somehow makes performance worst.
function substituteEnvVars(
  obj: Record<string, unknown>,
  subber: (k: string) => string | undefined,
): Record<string, unknown> {
  const rtn: Record<string, unknown> = {};
  const replacer = (s: string) => s.replace(reEnvvarTokens, (__, p1) => subber(p1) ?? "");

  for (const key in obj) {
    const val = obj[key];

    if (Array.isArray(val)) {
      const updatedVals = Array(val.length);
      for (let i = 0; i < val.length; i++) {
        updatedVals[i] = replacer(val[i]);
      }
      rtn[key] = updatedVals;
    } else {
      rtn[key] = replacer(val as string);
    }
  }

  return rtn;
}

function deepKey(obj: Record<string, unknown>, key: string): unknown {
  const path = key.split(".");

  let idx = 0;
  let val: unknown = obj;
  do {
    val = (val as Record<string, unknown>)[path[idx++]];
  } while (val && idx < path.length);

  return val;
}

function fieldMatches(obj: Record<string, unknown>, field: string, values: string[]): boolean {
  const val = obj[field] || deepKey(obj, field);

  if (val == null || val === "") {
    return false;
  }

  if (values[0] === "*") {
    return true;
  }

  for (let i = 0; i < values.length; i++) {
    if (values[i] === val) {
      return true;
    }
  }

  return false;
}

export class Rule {
  name: string;
  matchers: Record<string, string[]>;
  output: Record<string, unknown>;

  constructor(name: string, matchers: Record<string, string[]>, output: Record<string, unknown>) {
    this.name = name;
    this.matchers = matchers;

    const envMissing: string[] = [];
    this.output = substituteEnvVars(output, (k) => {
      const val = process.env[k];
      if (val == null) {
        envMissing.push(k);
      }
      return val;
    });

    if (envMissing.length > 0) {
      throw new Error(`Missing env var(s): ${envMissing.join(", ")}`);
    }

    Object.keys(matchers).forEach((field) => {
      const fieldVals = matchers[field];
      if (fieldVals.indexOf("*") !== -1 && fieldVals.length > 1) {
        throw new Error(
          `Invalid matcher values in ${name}.${field}.\n` +
            "Wildcard matcher can't co-exist with other matchers.",
        );
      }
    });

    if (this.output.type === "alerts" || this.output.type === "metrics") {
      this.output.value_field = this.output.value_field || "value";
    }

    this.output.rule = this.name;
  }

  matches(msg: Record<string, unknown>): boolean {
    for (const field in this.matchers) {
      if (!fieldMatches(msg, field, this.matchers[field])) {
        return false;
      }
    }
    return true;
  }

  outputFor(msg: Record<string, unknown>): Record<string, unknown> {
    const rtn: Record<string, unknown> = {};
    const subst = (__: string, k: string) =>
      (msg[k] as string) || (deepKey(msg, k) as string) || "KEY_NOT_FOUND";
    const replacer = (s: string) => s.replace(reFieldTokens, subst);

    for (const key in this.output) {
      const val = this.output[key];

      if (Array.isArray(val)) {
        const updatedVals = Array(val.length);
        for (let i = 0; i < val.length; i++) {
          updatedVals[i] = replacer(val[i]);
        }
        rtn[key] = updatedVals;
      } else {
        rtn[key] = replacer(val as string);
      }
    }

    return rtn;
  }
}

interface ValidateResult {
  valid: boolean;
  errors: string[];
}

function validateKVConfig(config: unknown): ValidateResult {
  const validator = new Validator();
  const results = validator.validate(config, schema as any);

  return {
    valid: results.valid,
    errors: results.errors.map((err) => err.stack ?? ""),
  };
}

interface ParseResult {
  valid: boolean;
  rules: Rule[];
  errors: unknown[];
}

function parseConfig(fileString: string): ParseResult {
  let config: any;
  try {
    config = load(fileString);
  } catch (e) {
    return { valid: false, rules: [], errors: [e] };
  }
  const validateRes = validateKVConfig(config);
  if (!validateRes.valid) {
    return Object.assign(validateRes, { rules: [] });
  }
  try {
    const rules = Object.entries(config.routes).map(
      ([name, elem]: [string, any]) => new Rule(name, elem.matchers, elem.output),
    );
    return { valid: true, rules, errors: [] };
  } catch (e) {
    return { valid: false, rules: [], errors: [e] };
  }
}

interface RouteResult {
  team: string;
  kv_version: string;
  kv_language: string;
  routes: Record<string, unknown>[];
}

export class Router {
  rules: Rule[];

  constructor(rules?: Rule[]) {
    this.rules = rules || [];
  }

  loadConfig(filename: string): void {
    const data = fs.readFileSync(filename, "utf8");
    this._loadConfigString(data);
  }

  _loadConfigString(configStr: string): void {
    const parsedRules = parseConfig(configStr);
    if (!parsedRules.valid) {
      throw new Error(String(parsedRules.errors));
    }
    this.rules = parsedRules.rules;
  }

  route(msg: Record<string, unknown>): RouteResult {
    const outputs: Record<string, unknown>[] = [];
    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (rule.matches(msg)) {
        outputs.push(rule.outputFor(msg));
      }
    }

    return {
      team: teamName,
      kv_version: kvVersion,
      kv_language: "js",
      routes: outputs,
    };
  }
}
