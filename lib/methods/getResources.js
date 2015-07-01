// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var dotprune = config.dotprune;
	var models   = global._factoryModels;
	
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts = fetchOpts || {};
		jsonOpts  = jsonOpts || { omitPivot: true };
		
		
		// set the bypass for pretty print. this is used for the getResource function
		// since it needs to return a single resource and not an array with a single resource
		var ugly  = (jsonOpts.hasOwnProperty('_ugly') && jsonOpts._ugly) ? true : false;
		
		
		// set the relation for fetch. the user can optinally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
				fetchOpts.withReltated : models._relations[this.tableName];
		
		
		// get the view properties as a local variable
		var keep   = this._keep;
		var pretty = this._pretty;
		
		
		// get the results. use a user defined function to plug into knex for filtering
		// and also prune the results if a view is specified
		return this.fetchAll(fetchOpts).then(function(results) {
			
			
			// filter the object to return only the requested fields
			var resultObject = dotprune.prune(results.toJSON(jsonOpts), keep);
			
			
			// optionally pretty print the object
			if (typeof (pretty) === 'object' && pretty.enabled && !ugly) {
				return JSON.stringify(resultObject, null, pretty.spacing);
			}
			else {
				return resultObject;
			}
		});
	};
};