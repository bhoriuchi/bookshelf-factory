// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// return the function
	return function(spacing) {
		
		
		// set the default spacing
		spacing = spacing || '  ';
		
		// set the _pretty value to an object and return the model
		this._pretty = { enabled: true, spacing: spacing };
		return this;
	};
};