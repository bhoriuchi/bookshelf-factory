// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the variables
	var _      = config.lodash;
	var util   = config.util;
	var STATUS = config.constants.statusCodes;
	
	
	// return the function
	return function(id, fetchOpts, jsonOpts) {

		
		// declare new variables and set defaults
		var pretty          = this._pretty;
		var where           = {};
		id                  = id || [];
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts           = fetchOpts || {};
		jsonOpts            = jsonOpts || { omitPivot: true };
		jsonOpts._ugly      = true;
		
		
		var unformatted     = jsonOpts._unformatted || false;		
		
		
		// check for depth restriction
		if (fetchOpts.hasOwnProperty('maxDepth') &&
				typeof(fetchOpts.maxDepth) === 'number' &&
				fetchOpts.hasOwnProperty('_depth') &&
				typeof(fetchOpts._depth) === 'number') {
			
			if (fetchOpts._depth >= fetchOpts.maxDepth) {
				return util.statusPromise(id);
			}
			
		}
		
		// check for circular references
		if (fetchOpts.hasOwnProperty('_circular') &&
				_.contains(fetchOpts._circular, this.tableName)) {
			return util.statusPromise(id);
		}
		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			
			
			// set the where object
			where[this.idAttribute] = id;
			
			
			// call the get resources with the where option to get the specific resource
			return this.where(where).getResources(fetchOpts, jsonOpts).then(function(results) {
				
				
				// if there was at least 1 result return the first one with optional pretty printing
				if (Array.isArray(results) && results.length > 0) {
					
					
					// check if pretty print was chained, otherwise output the object
					if (typeof (pretty) === 'object' && pretty.enabled && !unformatted) {
						return JSON.stringify(results[0], null, pretty.spacing);
					}
					else {
						return results[0];
					}
				}
				else {
					return STATUS.NO_CONTENT;
				}
			});
		}
		else {
			console.log(id);
			return util.statusPromise(STATUS.BAD_REQUEST);
		}
	};
};