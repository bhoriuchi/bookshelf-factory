// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {

	// return the function
	return function() {
		
		// get model
		var _self = this;
		var models = config.models(_self.version);
		
		// return relations
		return models._relations[_self.tableName];
	};
};