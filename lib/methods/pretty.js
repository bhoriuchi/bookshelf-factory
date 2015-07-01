// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// return the function
	return function(spacing) {
		spacing = spacing || '  ';
		
		this._pretty = { enabled: true, spacing: spacing };
		return this;
	};
};