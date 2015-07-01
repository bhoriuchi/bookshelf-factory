// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	var util   = config.util;
	var STATUS = config.constants.statusCodes;
	
	
	// return the function
	return function(id, fetchOpts, jsonOpts) {
		
		var pretty     = this._pretty;
		var where      = {};
		id             = id || [];
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts || { omitPivot: true };
		jsonOpts._ugly = true;
		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			
			
			// set the where object
			where[this.idAttribute] = id;
			
			
			// call the get resources with the where option to get the specific resource
			return this.where(where).getResources(fetchOpts, jsonOpts).then(function(results) {
				
				
				// if there was at least 1 result return the first one with optional pretty printing
				if (Array.isArray(results) && results.length > 0) {
					
					if (typeof (pretty) === 'object' && pretty.enabled) {
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
			
			return util.statusPromise(STATUS.BAD_REQUEST);
		}
	};
};