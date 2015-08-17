// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	var _     = config.lodash;
	var util  = config.util;
	var utils = config.utils;
	
	// return the function
	return function(search) {
		
		// look for search
		search = search || null;
		search = (typeof(search) === 'string') ? [search] : search;
		
		// set up the search object that will hold
		// the fields and types of searches to perform
		var s  = {};
		
		// get the schema for the current table
		var schema = global._factoryModels._schema[this.tableName];

		// determine if multiple fields will be searched
		if (Array.isArray(search)) {
			
			// loop through each field
			_.forEach(search, function(sobj) {
				
				// check for a simple string. this is an all search
				if (typeof(sobj) === 'string') {
					s.all             = {};
					s.all.type        = 'basic';
					s.all.search      = sobj;
				}
				
				// otherwise check for an object that has a search parameter
				else if (typeof(sobj) === 'object' &&
						_.has(sobj, 'search') &&
						typeof(sobj.search) === 'string') {
					
					// if the object has no field parameter, it is the all fields
					// search. because a field can be named anything the field name
					// is omitted for all fields so that you can use column names like
					// all or any other variable that might be used to identify all fields					
					if (!_.has(sobj, 'field')) {
						s.all         = {};
						s.all.type    = utils.search.searchType(sobj.type);
						s.all.search  = sobj.search;
					}
					
					// otherwise check for an object that has a field parameter that
					// is a valid column name
					else if (_.has(sobj, 'field') &&
							typeof(sobj.field) === 'string' &&
							_.has(util.getColumns(schema), sobj.field)) {
						s[sobj.field] = {};
						s[sobj.field] = utils.search.searchType(sobj.type);
						s[sobj.field] = sobj.search;
					}
				}
			});
		}
		
		// set the _pretty value to an object and return the model
		this._searchSQL = 'ssql';
		return this;
	};
};