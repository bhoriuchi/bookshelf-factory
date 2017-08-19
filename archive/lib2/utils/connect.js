module.exports = function(env) {
	
	var _ = env.lodash;
	
	function connect(config) {

		// set up variables for modules that can be passed in the config
		var knex;

		
		// validate the configuration is an object
		if (typeof (config) !== 'object') {
			return null;
		}
		
		// check for knex instance
		if (_.has(config, 'knex')) {
			knex = config.knex;
		}
		
		// if no knex, check for bookshelf
		else if (_.has(config, 'bookshelf')) {
			knex = config.bookshelf.knex;
		}
		
		// check for a database config key
		else if (_.has(config, 'database')) {
			knex = require('knex')(config.database);
		}
		
		// if no bookshelf, check for a db config
		else if (_.has(config, 'client') && _.has(config, 'connection')) {
			knex = require('knex')(config);
		}
		
		// if no knex or bookshelf or db config, return null
		else {
			throw 'Error: Could not find knex, bookshelf, or database config object';
		}
		
		// set bookshelf and schemer instance
		env.knex      = knex;
		env.bookshelf = config.bookshelf || require('bookshelf')(knex);
		env.schemer   = config.schemer   || require('knex-schemer')(knex);
		
	}
	
	return connect;
	
};