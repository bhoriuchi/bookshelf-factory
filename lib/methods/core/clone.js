// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: delete function
//

module.exports = function(config) {
	
	// modules
	var _               = config.lodash;
	var promise         = config.promise;

	
	// initialize function
	return function(opts) {

		// options
		var ids         = opts.ids;
		var model       = opts.model;
		var models      = opts.models;
		var multi       = opts.multi;
		var fetchOpts   = opts.fetchOpts;
		
		// takes a transaction as its parameter and executes the delete
		return function(t) {
			
			// delete each
			return promise.map(ids, function(id) {
				
				// create a new fetchOpts object
				var newFetchOpts   = _.clone(fetchOpts, true);
				newFetchOpts.clone = true;

				// forge a new model, get the id with a maxDepth of 0 so that only
				// relation IDs are returned and save the model using the clone option
				return models[model.tableName].forge()
				.transaction(t)
				.getResource(id, {transacting: t, maxDepth: 0})
				.saveResource(null, newFetchOpts)
				.end();
			})
			.then(function(results) {
				
				// if there is only one clone taking place, return a single object
				if (!multi && results && Array.isArray(results) && results.length > 0) {
					return results[0];
				}
				
				// otherwise return everything
				return results;
			});
		};
	};
};