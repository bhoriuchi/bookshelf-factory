// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var models = config.models;
	
	
	// return the function
	return function() {
		return global._factoryModels._relations[this.tableName];
	};
};