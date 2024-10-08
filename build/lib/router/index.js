var fs = require("fs");
var jsonschema = require("jsonschema");
var schema = require("./schema_definitions");
var yaml = require("js-yaml");
var _ = require("underscore");
var packageJson = require("../../package.json");
var kvVersion = packageJson.version;
var teamName = process.env._TEAM_OWNER || "UNSET";
var reEnvvarTokens = new RegExp("\\$\\{(.+?)\\}", "g");
var reFieldTokens = new RegExp("%\\{(.+?)\\}", "g");
// For performance reason this code is intentionally redundant and not-inlined.
// Removing redundancy and inlining this function some how makes performance worst.
function substituteEnvVars(obj, subber) {
    var rtn = {};
    var replacer = function (s) { return s.replace(reEnvvarTokens, function (__, p1) { return subber(p1); }); };
    for (var key in obj) {
        var val = obj[key];
        if (Array.isArray(val)) {
            var updatedVals = Array(val.length);
            for (var i = 0; i < val.length; i++) {
                updatedVals[i] = replacer(val[i]);
            }
            rtn[key] = updatedVals;
        }
        else {
            rtn[key] = replacer(val);
        }
    }
    return rtn;
}
function deepKey(obj, key) {
    var path = key.split(".");
    var idx = 0;
    var val = obj;
    do {
        val = val[path[idx++]];
    } while (val && idx < path.length);
    return val;
}
function fieldMatches(obj, field, values) {
    var val = obj[field] || deepKey(obj, field);
    if (val == null || val === "") {
        return false;
    }
    if (values[0] === "*") {
        return true;
    }
    for (var i = 0; i < values.length; i++) {
        if (values[i] === val) {
            return true;
        }
    }
    return false;
}
var Rule = /** @class */ (function () {
    function Rule(name, matchers, output) {
        this.name = null;
        this.matchers = null;
        this.output = null;
        this.name = name;
        this.matchers = matchers;
        var envMissing = [];
        this.output = substituteEnvVars(output, function (k) {
            var val = process.env[k];
            if (val == null) {
                envMissing.push(k);
            }
            return val;
        });
        if (envMissing.length > 0) {
            throw new Error("Missing env var(s): " + envMissing.join(", "));
        }
        Object.keys(matchers).forEach(function (field) {
            var fieldVals = matchers[field];
            if (fieldVals.indexOf("*") !== -1 && fieldVals.length > 1) {
                throw new Error("Invalid matcher values in " + name + "." + field + ".\n" +
                    "Wildcard matcher can't co-exist with other matchers.");
            }
        });
        if (this.output.type === "alerts" || this.output.type === "metrics") {
            this.output.value_field = this.output.value_field || "value";
        }
        this.output.rule = this.name;
    }
    // matches returns true if `msg` matches against this rule
    Rule.prototype.matches = function (msg) {
        for (var field in this.matchers) {
            if (!fieldMatches(msg, field, this.matchers[field])) {
                return false;
            }
        }
        return true;
    };
    // returns the output with kv substitutions performed
    Rule.prototype.outputFor = function (msg) {
        var rtn = {};
        var subst = function (__, k) { return msg[k] || deepKey(msg, k) || "KEY_NOT_FOUND"; };
        var replacer = function (s) { return s.replace(reFieldTokens, subst); };
        for (var key in this.output) {
            var val = this.output[key];
            if (Array.isArray(val)) {
                var updatedVals = Array(val.length);
                for (var i = 0; i < val.length; i++) {
                    updatedVals[i] = replacer(val[i]);
                }
                rtn[key] = updatedVals;
            }
            else {
                rtn[key] = replacer(val);
            }
        }
        return rtn;
    };
    return Rule;
}());
// validateKVConfig ensures that `routes` matches the config schema. We have this
// function instead of just doing a plain jsonschema.validate in order to get
// better error messages for the "output" object (by default jsonschema would
// just tell you that the output block doesn't match any of the known output
// formats, but won't tell you what's wrong because it doesn't let you
// condition on the output.type property).
function validateKVConfig(config) {
    var validator = new jsonschema.Validator();
    var results = validator.validate(config, schema);
    return {
        valid: results.valid,
        errors: results.errors.map(function (err) { return err.stack; }),
    };
}
// parseConfig parses and validates the configuration passed as a string. It
// returns an object of the form {valid, rules, errors}, where valid is true if
// it was successfully parsed, rules is an array of rules, and errors is an
// array of errors.
function parseConfig(fileString) {
    var config;
    try {
        config = yaml.safeLoad(fileString);
    }
    catch (e) {
        return { valid: false, rules: [], errors: [e] };
    }
    var validateRes = validateKVConfig(config);
    if (!validateRes.valid) {
        return _.assign(validateRes, { rules: [] });
    }
    try {
        var rulesObj = _.mapObject(config.routes, function (elem, name) { return new Rule(name, elem.matchers, elem.output); });
        var rules = _.values(rulesObj);
        return { valid: true, rules: rules, errors: [] };
    }
    catch (e) {
        return { valid: false, rules: [], errors: [e] };
    }
}
var Router = /** @class */ (function () {
    function Router(rules) {
        this.rules = null;
        this.rules = rules || [];
    }
    // loadConfig reads in the config located at `filename` and sets the routing
    // rules to what it finds there. It should be a YAML-formatted file with
    // routing rules placed under the `routes` key on the root object.
    Router.prototype.loadConfig = function (filename) {
        var data = fs.readFileSync(filename, "utf8");
        this._loadConfigString(data);
    };
    Router.prototype._loadConfigString = function (configStr) {
        var parsedRules = parseConfig(configStr);
        if (!parsedRules.valid) {
            throw new Error(parsedRules.errors);
        }
        this.rules = parsedRules.rules;
    };
    // route matches the log line `msg` against all loaded rules and returns a
    // metadata object describing the outputs it should be sent to based on that
    // matching. logger.ts will attach this to log lines under the `_kvmeta`
    // property.
    Router.prototype.route = function (msg) {
        var outputs = [];
        for (var i = 0; i < this.rules.length; i++) {
            var rule = this.rules[i];
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
    };
    return Router;
}());
module.exports = {
    Router: Router,
    Rule: Rule,
};
