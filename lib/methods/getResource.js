// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the variables
	var _      = config.lodash;
	var utils  = config.utils;
	var STATUS = config.constants.statusCodes;
	var models = global._factoryModels;
	
	// return the function
	return function(id, fetchOpts, jsonOpts) {
		
		// declare new variables and set defaults
		var _self           = this;
		var where           = {};
		var tableName       = this.tableName;
		var idAttr          = this.idAttribute;
		id                  = id || [];
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts             = fetchOpts            || {};
		jsonOpts              = jsonOpts             || { omitPivot: true, omitForeign: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot   || true;
		jsonOpts.omitForeign  = jsonOpts.omitForeign || true;
		
		
		// check for depth restriction
		if (fetchOpts.hasOwnProperty('maxDepth') &&
				typeof(fetchOpts.maxDepth) === 'number' &&
				fetchOpts.hasOwnProperty('_depth') &&
				typeof(fetchOpts._depth) === 'number') {
			
			if (fetchOpts._depth >= fetchOpts.maxDepth) {
				_self.results = utils.util.wrapPromise(id);
				return _self;
			}
		}
		
		// check for circular references
		if (fetchOpts.hasOwnProperty('_circular') &&
				_.contains(fetchOpts._circular, this.tableName)) {
			_self.results = utils.util.wrapPromise(id);
			return _self;
		}
		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			

			// call the get resources with the where option to get the specific resource
			_self.results = models[this.tableName].forge().query(function(qb) {
				qb.where(tableName + '.' + idAttr, '=', id);
			})
			.getResources(fetchOpts, jsonOpts)
			.end()
			.then(function(results) {
						
				// if there was at least 1 result return the first one with optional pretty printing
				if (Array.isArray(results) && results.length > 0) {
					return results[0];
				}
				// otherwise look for status object
				else if (results && typeof(results) === 'object' && !Array.isArray(results)) {
					return results;
				}
				// otherwise return no content
				else {
					return STATUS.NO_CONTENT;
				}
			});
		}
		else {
			_self.results = utils.util.wrapPromise(STATUS.BAD_REQUEST);
		}
		
		
		return _self;
	};
};