// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the variables
	var models = global._factoryModels;
	
	
	// return the function
	return function() {
		return models._relations[this.tableName];
	};
};