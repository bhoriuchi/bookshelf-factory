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
		
		// set the results if they don't exist
		_self.results = _self.results || u.wrapPromise(config.statics.httpStatus.NO_CONTENT);
		
		// print and return the results as a promise
		_self.results = _self.results.then(function(results) {
			
			// check for wrap text
			if (opts.wrapText) {
				console.log(opts.wrapText);
			}
			
			
			// check for pretty print
			if (opts.pretty) {
				console.log(JSON.stringify(results, null, '  '));
			}
			else {
				console.log(results);
			}
			
			
			// check for wrap text
			if (opts.wrapText) {
				console.log(opts.wrapText);
			}
			
			// return the results
			return results;
		});
		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.print
		};
		return _self;
	};
};