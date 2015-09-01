// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: method to reset the results of an object for use in chaining
//


module.exports = function(config) {
	
	var _JTYP     = config.statics.jsTypes;
	
	// return the function
	return function(opts) {
		
		var _self        = this;
		
		// options
		opts             = opts             || {};
		opts.results     = (opts.results === false) ? false : true;
		opts.transaction = (opts.transaction === false) ? false : true;
		
		
		// check for results and process them first
		if (_self.results) {
			
			// set the results for self by resolving the promise
			_self.results = _self.results.then(function(results) {
				
				// set transaction
				_self.transaction = opts.transaction ? null : _self.transaction;
				return opts.results ? config.utils.util.wrapPromise(null) : results;
				
			});
		}
		else {
			_self.results = config.utils.util.wrapPromise(null);
		}

		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.reset
		};
		return _self;
	};
};