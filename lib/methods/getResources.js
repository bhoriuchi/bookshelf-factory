// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	var dotprune  = config.dotprune;
	var models    = global._factoryModels;
	var util      = config.util;
	var _         = config.lodash;
	var TYPE      = config.schemer.constants.type;
	var Promise   = config.promise;
	var Bookshelf = config.bookshelf;
	
	
	// return the function
	return function(fetchOpts, jsonOpts) {
		
		
		// set an object for fetch opts if it wasnt provided
		fetchOpts             = fetchOpts || {};
		fetchOpts._circular   = fetchOpts._circular || [];
		jsonOpts              = jsonOpts || { omitPivot: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot || true;
		
		
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

		
		// keep track of what objects we have referenced to handle any circular references
		if (!_.contains(fetchOpts._circular, tableName)) {
			fetchOpts._circular.push(tableName);
		}
		//console.log('*****', tableName,fetchOpts, '******');
		
		
		// get the results. use a user defined function to plug into knex for filtering
		// and also prune the results if a view is specified
		return this.fetchAll(fetchOpts).then(function(results) {

			
			// convert the result to JSON
			results = results.toJSON(jsonOpts);

			
			// check for versioned objects. if the object is version, attempt to 
			// pull the versioned copy of the object and merge it with the parent object
			if (schema.hasOwnProperty('_versioned')) {

				// remove the version parameter if use_current is set
				// and we are not performing a save
				// this will force the else condition in the query to
				// look for objects valid now
				if (results.length > 0 && results[0].use_current === 1 &&
						(!fetchOpts.hasOwnProperty('_saving') || !fetchOpts._saving)) {
					delete fetchOpts.version;
				}

				
				// get the current database time
				return util.getTime().then(function(sysTime) {
					
					
					// convert the database time to utc for comparison
					var ts = config.moment.utc(sysTime.date).format('YYYY-MM:DD HH:mm:ss z');

					
					// loop through each result
					return Promise.map(results, function(result) {
						
						
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
						// get the version with its relationships
						.fetchAll({withRelated: models._relations[schema._versioned.model]})
						.then(function(ver) {

							
							// verify that there is a version
							if (ver !== null) {
								
								
								// convert the results to JSON and pick the first result
								ver = ver.toJSON(jsonOpts);
								ver = ver[0];

								
								// loop through each relation defined and get its temporal version object
								return Promise.map(models._relations[schema._versioned.model], function(rel) {
									
									// determine the current relation type
									var verFetchOpts = _.merge({}, fetchOpts);
									var many    = null;
									var curRel  = models._schema[schema._versioned.model][rel];
									var relType = _.intersection(_.keys(curRel), ['hasOne', 'hasMany']);
									
									

									
									
									// if the current relation is hasMany and the relation is versioned
									if (relType.length > 0 &&
											curRel.hasOwnProperty('versioned') &&
											curRel.versioned) {

										
										// get the parent model name of the relation
										var parentModel = models._schema[curRel[relType[0]]]._managed;
										verFetchOpts.withRelated = models._relations[parentModel.model];


										// check for circular references before attemptying to get them
										if (!_.contains(verFetchOpts._circular, parentModel.model)) {
											
											if (relType[0] === 'hasMany') {
												// for each relation in the version
												many = Promise.map(ver[rel], function(relObj) {


													// get the model using getResource which will return the temporal version model
													// combination
													return models[parentModel.model].forge().getResource(relObj.parent_id, verFetchOpts, jsonOpts)
													.then(function(res) {
														return res;
													});
												});
											}
											else if (relType[0] === 'hasOne') {
												many = models[parentModel.model].forge().getResource(ver[rel].parent_id, verFetchOpts, jsonOpts)
												.then(function(res) {
													return res;
												});
											}
										}
										else {
											console.log('^^^^^^^^^^^^circular ref found');
											many = new Promise(function(resolve) {
												resolve('[Circular]');
											});
										}
										
										
										// then update the parent model relationship with the temporal version
										// objects
										return many.then(function(res) {

											// set the relationship to the mapped value
											ver[rel] = res;
											
											// finally return the output object
											return ver;
										});
									}
								})
								.then(function() {
									return ver;
								});
							}
						})
						.then(function(verObj) {

							
							// if there is an out object
							if (verObj) {
								

								// remove fields that should not be displayed
								delete verObj.id;
								delete verObj.published;
								delete verObj.parent_id;
								delete verObj.valid_from;
								delete verObj.valid_to;

								
								// merge the version with the parent
								_.merge(result, verObj);

							}
							else {
								
								// to work around not being able to remove elements from
								// an array while in a loop, add a unique parameter to the
								// result object and remove any objects from the result that
								// have it after the loop completes
								result[rid] = rid;
							}
							
							return result;
						});
					});
				});
			}

			
			
			
			// if not versioned, return the result
			else {
				return results;
			}
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