// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: set the href attribute


module.exports = function(config) {
	
	// constants
	var _JTYP       = config.statics.jsTypes;
	
	// modules
	var utils       = config.utils;
	var u           = utils.util;
	
	// return the function
	return function(href) {
		
		var _self     = this;
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			// check for a string value
			if (href && typeof(href) === _JTYP.string && href.length > 0) {
				
				// set the HREF prefix and make sure it ends with a /
				_self._href = (href.slice(-1) === '/') ? href.substring(0, href.length - 1) : href;
			}
			else {
				_self._href = null;
			}
			
			// return any results
			return results.results;
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the href call',
				e.code,
				e.message,
				e.stack
			);
			
			// check if the error was thrown by factory or knex/bookshelf
			err = u.isErr(e) ? e : err;
			
			// check if errors should be thrown. usually used for
			// a chained transaction				
			if (_self.throwErrors) {
				throw err;
			}
			
			// return the error
			return u.wrapPromise(err);
		});
		

		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.href
		};
		return _self;
	};
};