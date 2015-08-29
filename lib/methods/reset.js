// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: method to reset the results of an object for use in chaining
//


module.exports = function(config) {
	
	var _JTYP     = config.statics.jsTypes;
	
	// return the function
	return function(view) {
		
		var _self = this;
		
		// if there are currently no results, or the results are not a
		// promise, set the results to a promise that resolves null
		if (!_self.results || typeof (_self.results.then) !== _JTYP.funct) {
			_self.results = config.utils.util.wrapPromise(null);
		}
		
		// otherwise, there are results so resolve them and then set
		// the results to a promise that resolves null
		else {
			_self.results = _self.results.then(function(results) {
				return config.utils.util.wrapPromise(null);
			});
		}
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.reset
		};
		return _self;
	};
};