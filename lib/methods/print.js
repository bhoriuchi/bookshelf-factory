// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: print current results and return


module.exports = function(config) {
	
	var utils       = config.utils;
	var u           = utils.util;
	
	// return the function
	return function(opts) {
		
		var _self     = this;
		
		// printing options
		opts          = opts || {};
		opts.pretty   = opts.pretty || false;
		
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			// check for wrap text
			if (opts.wrapText) {
				console.log(opts.wrapText);
			}
			
			
			// check for pretty print
			if (opts.pretty) {
				console.log(JSON.stringify(results, null, '  '));
			}
			else {
				console.log(results.results);
			}
			
			
			// check for wrap text
			if (opts.wrapText) {
				console.log(opts.wrapText);
			}
			
			
			return results.results;
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the print call',
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
			method: config.statics.methods.print
		};
		return _self;
	};
};