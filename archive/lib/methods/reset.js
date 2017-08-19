// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: method to reset the results of an object for use in chaining
//


module.exports = function(config) {
	
	// constants
	var _JTYP     = config.statics.jsTypes;
	
	// modules
	var _         = config.lodash;
	var u         = config.utils.util;
	
	// return the function
	return function(opts) {
		
		var _self        = this;
		opts             = opts || {};
		
		// check if model initialization is required
		if (!_self._var) {
			_self.results = null;
			_self._var    = {};
		}
		
		
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			// get the keys
			var keys = _.keys(_self._var);
			
			// loop through each _var
			for (var i = 0; i < keys.length; i++) {
				var key = keys[i];
				
				// null the var is it is not set to false in the opts
				if (!_.has(opts, key) || opts[key] !== false) {
					_self._var[key] = null;
				}
			}
			
			
			// check for results and process them first
			if (results.results) {
				
				if (typeof(results.results.then) === _JTYP.funct) {
					// set the results for self by resolving the promise
					return results.results.then(function(results) {
						return (opts.results !== false) ? u.wrapPromise(null) : results;
					});
				}
				return (opts.results !== false) ? u.wrapPromise(null) : results;
			}
			else {
				return u.wrapPromise(null);
			}
			
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the reset call',
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
			method: config.statics.methods.reset
		};
		return _self;
	};
};