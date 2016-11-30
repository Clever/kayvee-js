module.exports = require("./build/lib/kayvee");
module.exports.logger = require("./build/lib/logger/logger");
module.exports.router = require("./build/lib/router");
module.exports.middleware = require('./build/lib/middleware')
module.exports.setGlobalRouting = module.exports.logger.setGlobalRouting;
module.exports.mockRouting = module.exports.logger.mockRouting;
