// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var dotprune  = config.dotprune;
	var models    = global._factoryModels;
	var util      = config.util;
	var _         = config.lodash;
	var TYPE      = config.schemer.constants.type;
	var promise   = config.promise;
	var Bookshelf = config.bookshelf;
	
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts             = fetchOpts || {};
		jsonOpts              = jsonOpts || { omitPivot: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot || true;
		
		
		// update the current depth
		fetchOpts._depth      = fetchOpts.hasOwnProperty('_depth') ? 
				(fetchOpts._depth + 1) : 0;
				
		
		// update the circular references
		fetchOpts._circular   = fetchOpts.hasOwnProperty('_circular') ? 
				_.union(fetchOpts._circular, [this.tableName]) : [this.tableName];

		
		// set the bypass for pretty print. this is used for the getResource function
		// since it needs to return a single resource and not an array with a single resource
		var ugly              = (jsonOpts.hasOwnProperty('_ugly') && jsonOpts._ugly) ? true : false;
		
		
		// set the relation for fetch. the user can optinally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
				fetchOpts.withRelated : models._relations[this.tableName];
		
		
		// get the view properties as a local variable
		var dbType            = Bookshelf.knex.client.config.client;
		var tableName         = this.tableName;
		var keep              = this._keep;
		var pretty            = this._pretty;
		var idAttr            = this.idAttribute;
		var schema            = models._schema[this.tableName];
		var rid               = '_RID_DELETE_THIS_OBJECT_ASDFJKL';

		
		// get the results. use a user defined function to plug into knex for filtering
		// and also prune the results if a view is specified
		return this.fetchAll(fetchOpts).then(function(results) {
			
			// check for results
			if (results.length > 0) {
				
				// store the model
				var model = results.model;
				
				
				// look through each result
				return promise.map(results.models, function(result) {
					
					// create a new object with the non-related results
					var res = _.merge({}, result.attributes);

					
					// look through each relation
					return promise.each(_.keys(result.relations), function(relField) {
						
						var relObj  = result.relations[relField];
						var relData = relObj.relatedData;
						
						//console.log('RELOBJSTART', relObj, 'RELOBJEND');
						
						if (relObj.relatedData.type === 'hasOne' || relObj.relatedData.type === 'belongsTo') {
							
							if (!relObj.hasOwnProperty('id')) {
								res[relField] = null;
							}
							else {
								
								return models[relData.targetTableName].forge()
								.getResource(
									relObj.id,
									_.omit(fetchOpts, 'withRelated'),
									_.merge({_unformatted: true}, jsonOpts)
								)
								.then(function(result) {
									res[relField] = result;
								});
							}
						}
						else if (relObj.relatedData.type === 'hasMany' || relObj.relatedData.type === 'belongsToMany') {
							
							res[relField] = [];
							
							if (relObj.length > 0) {
								
								return promise.each(relObj.models, function(relModel) {

									return models[relData.targetTableName].forge()
									.getResource(
										relModel.id,
										_.omit(fetchOpts, 'withRelated'),
										_.merge({_unformatted: true}, jsonOpts)
									)
									.then(function(result) {
										if (result) {
											res[relField].push(result);
										}
									});
								});
							}
						}
					})
					.then(function() {
						
						// check for a temporal object
						if (schema.hasOwnProperty('_versioned')) {
							

							// remove the version parameter if use_current is set
							// and we are not performing a save
							// this will force the else condition in the query to
							// look for objects valid now
							if (res.hasOwnProperty('use_current') && res.use_current === 1 &&
									(!fetchOpts.hasOwnProperty('_saving') || !fetchOpts._saving)) {
								delete fetchOpts.version;
							}
							
							// get the current database time
							return util.getTime().then(function(sysTime) {
								
								// convert the database time to utc for comparison
								var ts = config.moment.utc(sysTime.date).format('YYYY-MM:DD HH:mm:ss z');
								
								// get the specific version
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
										.andWhereRaw("valid_from <= '" + ts + "'")
										.andWhereRaw("valid_to >= '" + ts + "'");
									}
								})
								.getResources({withRelated: models._relations[schema._versioned.model]})
								.then(function(ver) {
									
									if (ver.length > 0) {
										ver = ver[0];
										
										delete ver.id;
										delete ver.published;
										delete ver.parent_id;
										delete ver.valid_from;
										delete ver.valid_to;
										
										_.merge(res, ver);
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
					})
					.then(function() {
						return res;
					});
				});
			}
			
			// if no results return an empty array
			return [];
		})
		
		// post processing includes removal of invalid version results
		// field filtering, and pretty printing
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