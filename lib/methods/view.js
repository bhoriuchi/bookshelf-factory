// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the variables
	var util   = config.util;
	var models = global._factoryModels;
	
	
	// return the function
	return function(view) {
		
		
		// set the default view to nothing
		view = view || '';
		
		// set the keep property
		this._keep = (Array.isArray(view)) ? view : util.compileViewFilter(view, this.tableName, models._schema, '');
		return this;
	};
};