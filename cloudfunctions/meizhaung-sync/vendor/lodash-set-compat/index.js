// Static dependency replacement for CloudBase realtime; no runtime or node_modules mutation.
// The enclosing function pins the maintained official lodash package.
module.exports = require('lodash/set');
