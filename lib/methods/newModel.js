// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: return a new model
//


module.exports = function(config) {
	
	// return the function
	return function() {
		
		var _self = this;
		return _self.extend({
			_var: null,
			results: null
		});
	};
};