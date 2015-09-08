// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: set the href attribute


module.exports = function(config) {
	
	// constants
	var _JTYP       = config.statics.jsTypes;
	
	// modules
	var utils       = config.utils;
	var u           = utils.util;
	
	// return the function
	return function(href) {
		
		var _self     = this;
		
		
		// check for a string value
		if (href && typeof(href) === _JTYP.string) {
			
			// set the HREF prefix and make sure it ends with a /
			_self._href = (href.length > 0 && href.slice(-1) !== '/') ? href + '/' : href;
		}
		else {
			_self._href = null;
		}
		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.href
		};
		return _self;
	};
};