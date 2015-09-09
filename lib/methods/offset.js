// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: set limit
//


module.exports = function(config) {
	
	// return the function
	return function(offset) {
		
		var _self = this;
		_self._offset = !isNaN(offset) ? parseInt(offset, 10) : null;
		_self._offset = _self._offset > -1 ? _self._offset : 0;

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.offset
		};

		return _self;
	};
};