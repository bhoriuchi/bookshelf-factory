// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	var util   = config.util;
	var models = global._factoryModels;
	
	
	// return the function
	return function(view) {
		view = view || '';
		
		// set the keep property
		this._keep = (Array.isArray(view)) ? view : util.compileViewFilter(view, this.tableName, models._schema, '');
		return this;
	};
};