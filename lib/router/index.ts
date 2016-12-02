var fs           = require("fs");
var jsonschema   = require("jsonschema");
var schema       = require("./schema_definitions");
var yaml         = require("js-yaml");
var _            = require("underscore");

var packageJson = require("../../package.json");
const kvVersion = packageJson.version;
const teamName = process.env._TEAM_OWNER || "UNSET";

const reEnvvarTokens = new RegExp("\\$\\{(.+?)\\}", "g");
const reFieldTokens = new RegExp("%\\{(.+?)\\}", "g");

// For performance reason this code is intentionally redundant and not-inlined.
// Removing redundancy and inlining this function some how makes performance worst.
function substituteEnvVars(obj, subber) {
  const rtn = {};
  const replacer = (s) => s.replace(reEnvvarTokens, (__, p1) => subber(p1));

  for (const key in obj) {
    const val = obj[key];

    if (Array.isArray(val)) {
      const updatedVals = Array(val.length);
      for (let i = 0; i < val.length; i++) {
        updatedVals[i] = replacer(val[i]);
      }
      rtn[key] = updatedVals;
    } else {
      rtn[key] = replacer(val);
    }
  }

  return rtn;
}

function deepKey(obj, key) {
  const path = key.split(".");

  let idx = 0;
  let val = obj;
  do {
    val = val[path[idx++]];
  } while (val && idx < path.length);

  return val;
}

function fieldMatches(obj, field, values) {
  const val = obj[field] || deepKey(obj, field);

  if (val == null) {
    return false;
  }

  if (values[0] === "*") {
    return true;
  }

  for (let i = 0; i < values.length; i++) {
    if (values[i] === val) { return true; }
  }

  return false;
}

class Rule {
  name = null;
  matchers = null;
  output = null;

  constructor(name, matchers, output) {
    this.name = name;
    this.matchers = matchers;

    const envMissing = [];
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
          "Wildcard matcher can't co-exist with other matchers."
        );
      }
    });

    this.output.rule = this.name;
  }

  // matches returns true if `msg` matches against this rule
  matches(msg) {
    for (const field in this.matchers) {
      if (!fieldMatches(msg, field, this.matchers[field])) { return false; }
    }

    return true;
  }

  // returns the output with kv substitutions performed
  outputFor(msg) {
    const rtn = {};
    const subst = (__, k) => msg[k] || deepKey(msg, k) || "KEY_NOT_FOUND";
    const replacer = (s) => s.replace(reFieldTokens, subst);

    for (const key in this.output) {
      const val = this.output[key];

      if (Array.isArray(val)) {
        const updatedVals = Array(val.length);
        for (let i = 0; i < val.length; i++) {
          updatedVals[i] = replacer(val[i]);
        }
        rtn[key] = updatedVals;
      } else {
        rtn[key] = replacer(val);
      }
    }

    return rtn;
  }
}

// validateKVConfig ensures that `routes` matches the config schema. We have this
// function instead of just doing a plain jsonschema.validate in order to get
// better error messages for the "output" object (by default jsonschema would
// just tell you that the output block doesn't match any of the known output
// formats, but won't tell you what's wrong because it doesn't let you
// condition on the output.type property).
function validateKVConfig(config) {
  const validator = new jsonschema.Validator();
  const results = validator.validate(config, schema);

  return {
    valid: results.valid,
    errors: results.errors.map((err) => err.stack),
  };
}

// parseConfig parses and validates the configuration passed as a string. It
// returns an object of the form {valid, rules, errors}, where valid is true if
// it was successfully parsed, rules is an array of rules, and errors is an
// array of errors.
function parseConfig(fileString) {
  let config;
  try {
    config = yaml.safeLoad(fileString);
  } catch (e) {
    return {valid: false, rules: [], errors: [e]};
  }
  const validateRes = validateKVConfig(config);
  if (!validateRes.valid) {
    return _.assign(validateRes, {rules: []});
  }
  try {
    const rulesObj = _.mapObject(
      config.routes, (elem, name) => new Rule(name, elem.matchers, elem.output)
    );
    const rules = _.values(rulesObj);
    return {valid: true, rules, errors: []};
  } catch (e) {
    return {valid: false, rules: [], errors: [e]};
  }
}

class Router {
  rules = null;

  constructor(rules) {
    this.rules = rules || [];
  }

  // loadConfig reads in the config located at `filename` and sets the routing
  // rules to what it finds there. It should be a YAML-formatted file with
  // routing rules placed under the `routes` key on the root object.
  loadConfig(filename) {
    const data = fs.readFileSync(filename, "utf8");
    this._loadConfigString(data);
  }

  _loadConfigString(configStr) {
    const parsedRules = parseConfig(configStr);
    if (!parsedRules.valid) {
      throw new Error(parsedRules.errors);
    }
    this.rules = parsedRules.rules;
  }

  // route matches the log line `msg` against all loaded rules and returns a
  // metadata object describing the outputs it should be sent to based on that
  // matching. logger.ts will attach this to log lines under the `_kvmeta`
  // property.
  route(msg) {
    const outputs = [];
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

module.exports = {
  Router,
  Rule,
};
