module.exports = function(env) {
	
	// create the utils object
	env.utils = env.utils || {};
	
	// add modules in dependency order
	env.utils.connect = require('./connect');
	
	
	// return the module
	return env.utils;
};