var fs           = require("fs");
var jsonschema   = require("jsonschema");
var schemaDefs   = require("./schema_definitions");
var yaml         = require("js-yaml");
var _            = require("underscore");

var packageJson = require("../../package.json");
const kvVersion = packageJson.version;
const appName = process.env._APP_NAME || "UNSET";
const teamName = process.env._TEAM_OWNER || "UNSET";

const reEnvvarTokens = new RegExp("\\$\\{(.+?)\\}", "g");
const reFieldTokens = new RegExp("%\\{(.+?)\\}", "g");

function substituteEnvVars(obj, subber) {
  const rtn = {};
  const replacer = (s) => s.replace(reEnvvarTokens, (__, p1) => subber(p1));

  for (const key in obj) {
    const val = obj[key];

    if (Array.isArray(val)) {
      rtn[key] = val.map(replacer);
    } else {
      rtn[key] = replacer(val);
    }
  }

  return rtn;
}

function substituteFields(obj, subber) {
  const rtn = {};
  const replacer = (s) => s.replace(reFieldTokens, (__, p1) => subber(p1));

  for (const key in obj) {
    const val = obj[key];

    if (Array.isArray(val)) {
      rtn[key] = val.map(replacer);
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
  const val = (field.includes(".") ? deepKey(obj, field) : obj[field]);
  return values.some(poss => val === poss);
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
    this.output.rule = this.name;
  }

  // matches returns true if `msg` matches against this rule
  matches(msg) {
    const matches = _.map(this.matchers, (values, field) => fieldMatches(msg, field, values));
    return _.all(matches);
  }

  // returns the output with kv substitutions performed
  outputFor(msg) {
    return substituteFields(
      this.output, (k) => (k.includes(".") ? deepKey(msg, k) : msg[k]) || "KEY_NOT_FOUND"
    );
  }
}

// transformValidation transforms a result from jsonschema.validate to prefix
// all errors with `name`.
function transformValidation(res, name) {
  return {
    valid: res.valid,
    errors: res.errors.map((err) => `${name}: ${err.stack}`),
  };
}

// validateRoutes ensures that `routes` matches the config schema. We have this
// function instead of just doing a plain jsonschema.validate in order to get
// better error messages for the "output" object (by default jsonschema would
// just tell you that the output block doesn't match any of the known output
// formats, but won't tell you what's wrong because it doesn't let you
// condition on the output.type property).
function validateRoutes(routes) {
  const validator = new jsonschema.Validator();
  validator.addSchema({definitions: schemaDefs}, "/config");
  const results = _.mapObject(routes, (rule, name) => {
    // validate that the rule has the appropriate structure
    const structureVal = validator.validate(rule, {
      type: "object",
      additionalProperties: false,
      required: ["matchers", "output"],
      properties: {
        matchers: {
          type: "object",
        },
        output: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["metrics", "alerts", "analytics", "notifications"],
            },
          },
        },
      },
    });
    if (!structureVal.valid) {
      return transformValidation(structureVal, `Rule "${name}"`);
    }
    const matchersVal = transformValidation(
      validator.validate(rule.matchers, {$ref: "/config#/definitions/matchers"}),
      `Rule "${name}" matchers`
    );
    const outputVal = transformValidation(
      validator.validate(rule.output, {$ref: `/config#/definitions/${rule.output.type}Output`}),
      `Rule "${name}" output`
    );
    return {
      valid: matchersVal.valid && outputVal.valid,
      errors: matchersVal.errors.concat(outputVal.errors),
    };
  });
  return _.reduce(results, (acc, res) => ({
    valid: acc.valid && res.valid,
    errors: acc.errors.concat(res.errors),
  }));
}

// parseConfig parses and validates the configuration passed as a string. It
// returns an object of the form {valid, rules, errors}, where valid is true if
// it was successfully parsed, rules is an array of rules, and errors is an
// array of errors.
function parseConfig(fileString) {
  let routes;
  try {
    routes = yaml.safeLoad(fileString).routes;
  } catch (e) {
    return {valid: false, rules: [], errors: [e]};
  }
  const validateRes = validateRoutes(routes);
  if (!validateRes.valid) {
    return _.assign(validateRes, {rules: []});
  }
  try {
    const rulesObj = _.mapObject(routes, (elem, name) => new Rule(name, elem.matchers, elem.output));
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
    const matched_rules = this.rules.filter(r => r.matches(msg));
    const outputs = matched_rules.map(r => r.outputFor(msg));
    return {
      app: appName,
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
