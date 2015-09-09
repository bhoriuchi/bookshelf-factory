// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: set limit
//


module.exports = function(config) {
	
	// return the function
	return function(limit) {
		
		var _self = this;
		_self._limit = !isNaN(limit) ? parseInt(limit, 10) : null;
		_self._limit = _self._limit > 0 ? _self._limit : 1;

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.limit
		};

		return _self;
	};
};