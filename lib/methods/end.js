// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// return the function
	return function() {
		
		if (this.results) {
		
			return this.results.then(function(results) {
				return results;
			});
		}
		else {
			return config.utils.util
			.wrapPromise(config.statics.httpStatus.NO_CONTENT);
		}
	};
};