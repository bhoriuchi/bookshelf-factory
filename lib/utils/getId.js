// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: get function
//

module.exports = function(config) {

	// constants
	var _STAT         = config.statics.httpStatus;
	var _JTYP         = config.statics.jsType;
	
	
	// takes in parameters for the pay-load array
	return function(opts) {

		
		// model variables
		var _self     = opts.model;
		var id        = opts.id;
		var tableName = _self.tableName;
		var idAttr    = _self.idAttribute;
		
		// runtime variables
		var models    = global._factoryModels;

		// options
		var fetchOpts = opts.fetchOpts;
		var jsonOpts  = opts.jsonOpts;

		
		// takes a transaction as its parameter and executes the save
		return function(t) {
			
			// set the transaction
			fetchOpts.transacting = t;
			
			// call the get resources with the where option to get the specific resource
			return models[tableName].forge()
			.transaction(t)
			.query(function(qb) {
				qb.where(tableName + '.' + idAttr, '=', id);
			})
			.getResources(fetchOpts, jsonOpts)
			.end()
			.then(function(results) {
						
				// if there was at least 1 result return the first one
				if (Array.isArray(results) && results.length > 0) {
					return results[0];
				}
				// otherwise look for a status object
				else if (results && typeof(results) === _JTYP.object && !Array.isArray(results)) {
					return results;
				}
				// otherwise return no content
				else {
					return _STAT.NO_CONTENT;
				}
			});
		};
	};
};