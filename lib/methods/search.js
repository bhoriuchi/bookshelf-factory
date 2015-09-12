// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Search function
//



module.exports = function(config) {
	
	// constants
	var _JTYP      = config.statics.jsTypes;
	var _SCMA      = config.statics.schema;
	var _SRCH      = config.statics.search;
	
	// modules
	var _          = config.lodash;
	var methodcore = config.methodcore;
	var utils      = config.utils;
	var u          = utils.util;
	
	// return the function
	return function(search, searchable) {
		
		// set up an sql object
		var _self = this;
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			// call the search function
			methodcore.search(search, searchable, _self);

			// return the result
			return results.results;
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the search call',
				e.code,
				e.message,
				e.stack
			);
			
			// check if the error was thrown by factory or knex/bookshelf
			err = u.isErr(e) ? e : err;
			
			// check if errors should be thrown. usually used for
			// a chained transaction				
			if (_self._var.throwErrors) {
				throw err;
			}
			
			// return the error
			return u.wrapPromise(err);
		});
		
		

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.search
		};
		return _self;
	};
};