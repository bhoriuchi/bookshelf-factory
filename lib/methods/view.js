// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the variables
	var utils  = config.utils;
	var models = global._factoryModels;
	var _      = config.lodash;
	
	
	// return the function
	return function(view) {
		
		var _self     = this;
		var tableName = _self.tableName;
		
		// set the default view to nothing
		view = view || '';
		
		// initialize the keep array
		_self._keep = [];
		
		// get the schema fields
		var fields = Object.keys(models._schema[this.tableName]);
		
		// set the keep property
		var keep   = (Array.isArray(view)) ?
				     view : utils.view.filter(view, tableName, models._schema, '');
		
		// analyze the properties and make sure they are valid for the current model
		_.forEach(keep, function(path) {
			if (_.contains(fields, path.replace('!', '').split('.')[0])) {
				_self._keep.push(path);
			}
		});

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.view
		};
		return _self;
	};
};