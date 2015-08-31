// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// return the function
	return function() {
		
		var _self = this;
		
		
		// check for results
		if (_self.results) {
		
			return _self.results.then(function(results) {
				return results;
			});
		}
		else {
			return config.utils.util
			.wrapPromise(config.statics.httpStatus.NO_CONTENT);
		}
	};
};