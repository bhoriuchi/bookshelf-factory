// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// functions
	var clean = config.utils.model.clean;
	
	// return the function
	return function(opts) {
		
		var _self = this;
		var out;
		
		// set default options
		opts = opts || {};
		opts.returnModel = (opts.returnModel === true) ? true : false;
		
		// look for the return model option, resolve the promise and return the model
		if (opts.returnModel) {
			out = _self.results.then(function(results) {
				
				// wrap the results in a promise since the next method will
				// expect that the results are wrapped in a promise
				_self.results = config.utils.util.wrapPromise(results);

				// clean the model
				clean(_self._var);
				
				// set _var to null
				_self._var = null;
				
				// return the model
				return _self;
			});
		}
		else {
			
			// by default, resolve the promise and return the results
			out = _self.results.then(function(results) {
				
				// clean the model
				clean(_self._var);
				
				// set _var to null
				_self._var = null;
				
				// return the results
				return _self.results;
			});
		}
		
		
		// check for results and return them otherwise return no content
		if (_self.results) {
			
			return out;
		}
		else {
			return config.utils.util
			.wrapPromise(config.statics.httpStatus.NO_CONTENT);
		}
	};
};