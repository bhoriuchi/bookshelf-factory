// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var dotprune = config.dotprune;
	var models   = global._factoryModels;
	var util     = config.util;
	var _        = config.lodash;
	var TYPE     = config.schemer.constants.type;
	var Promise  = config.promise;
	
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts          = fetchOpts || {};
		jsonOpts           = jsonOpts || { omitPivot: true };
		jsonOpts.omitPivot = jsonOpts.omitPivot || true;
		
		
		// set the bypass for pretty print. this is used for the getResource function
		// since it needs to return a single resource and not an array with a single resource
		var ugly  = (jsonOpts.hasOwnProperty('_ugly') && jsonOpts._ugly) ? true : false;
		
		
		// set the relation for fetch. the user can optinally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
				fetchOpts.withRelated : models._relations[this.tableName];
		
		
		// get the view properties as a local variable
		var keep    = this._keep;
		var pretty  = this._pretty;
		var idAttr  = this.idAttribute;
		var schema  = models._schema[this.tableName];
		var rid     = '_RID_DELETE_THIS_OBJECT_ASDFJKL';
		
		
		// get the results. use a user defined function to plug into knex for filtering
		// and also prune the results if a view is specified
		return this.fetchAll(fetchOpts).then(function(results) {

			
			// convert the result to JSON
			var res = results.toJSON(jsonOpts);
			
			
			// check for versioned objects
			if (schema.hasOwnProperty('_versioned')) {
				
				
				// remove the version parameter if use_current is set
				// this will force the else condition in the query to
				// look for objects valid now
				if (res.length > 0 && res[0].use_current === 1) {
					delete fetchOpts.version;
				}

				
				return Promise.each(res, function(result) {
					return models[schema._versioned.model].query(function(qb) {

						
						// check for datetime
						if (fetchOpts.hasOwnProperty('version') &&
								util.validValue(TYPE.dateTime, fetchOpts.version) &&
								fetchOpts.version.toString().match(/\D/) !== null) {

							qb.where('parent_id', '=', result[idAttr])
							.andWhere('valid_from', '<=', fetchOpts.version)
							.andWhere('valid_to', '>=', fetchOpts.version);
						}
						
						// check for integer
						else if(fetchOpts.hasOwnProperty('version') &&
								util.validValue(TYPE.integer, fetchOpts.version)) {

							qb.where('parent_id', '=', result[idAttr])
							.andWhere('version', '=', fetchOpts.version);
						}
						

						// default to current version
						else {

							qb.where('parent_id', '=', result[idAttr])
							.andWhereRaw('valid_from <= now()')
							.andWhereRaw('valid_to >= now()');
						}

					})
					.fetchAll({withRelated: models._relations[schema._versioned.model]})
					.then(function(ver) {
						
						// convert the version object to json
						var verObj = ver.toJSON(jsonOpts);
					
						
						if (verObj.length > 0) {
							// remove fields that should not be displayed
							delete verObj[0].id;
							delete verObj[0].published;
							delete verObj[0].parent_id;

							
							// merge the version with the parent
							_.merge(result, verObj[0]);
						}
						else {
							// to work around not being able to remove elements from
							// an array while in a loop, add a unique parameter to the
							// result object and remove any objects from the result that
							// have it after the loop completes
							result[rid] = rid;
						}
					});
				});
			}
			else {
				return res;
			}
		})
		.then(function(results) {

			// remove any results that have the generated rid parameter
			var filtered = _.remove(results, function(o){
				return !o.hasOwnProperty(rid);
			});
			

			// filter the object to return only the requested fields
			var resultObject = dotprune.prune(filtered, keep);
			
			
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