// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the modules
	var Bookshelf  = config.bookshelf;
	var schemer    = config.schemer;
	var Promise    = config.promise;
	var util       = config.util;
	var constants  = config.constants;
	var _          = config.lodash;
	var STATUS     = constants.statusCodes;
	var models     = global._factoryModels;
	var schema     = models._schema;
	
	
	return function(id, publish) {
		
		var dbType       = Bookshelf.knex.client.config.client;
		var idAttr       = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var where        = {};
		var tableName    = this.tableName;
		var current_date = null;
		var new_start    = null;
		var new_end      = null;
		var devPayload   = null;
		var ParentModel  = models[tableName];
		var verTableName = schema[tableName]._versioned.model;
		var ChildModel   = models[verTableName];

		
		// check if only an option was specified, then swap the values of id and opt
		if (typeof(id) === 'boolean') {
			publish = id;
			id      = null;
		}
		
		
		// set id to what was passed or if the object has an id or null
		publish = (publish === false) ? false : true;
		id      = id || this.id || null;

		
		// if id is still null at this point return an error
		if (id === null) {
			return util.statusPromise(_.merge(STATUS.BAD_REQUEST, {details: 'missing id for resource'}));
		}
		
		
		// update the where
		where[idAttr] = id;
		
		
		// get the model
		return ParentModel.forge(where).fetch().then(function(results) {
			
			
			// if the id does not exist, return not found
			if (results === null) {
				return STATUS.NOT_FOUND;
			}

			
			// if publishing
			if (publish) {
				
				
				// update the version
				var current_version = results.attributes.current_version;
				var new_version     = current_version + 1;
				
				
				// first get the current database time to use in the version window
				return util.getTime(Bookshelf.knex)
				.then(function(result) {
					
					
					// validate that a date was returned
					if (typeof(result) === 'object' && result.hasOwnProperty('date')) {
						return result.date.toString().split('GMT')[0] + 'GMT';
					}
					
					
					// if the time was not obtained, throw an error to cancel the transaction
					throw('GetDatabaseTimeException');
				})
				.then(function(nowUTC) {
					
					
					// set the current_date variable
					current_date = new Date(nowUTC);

					
					// get the next start
					new_start = new Date(current_date.getTime());
					new_start.setSeconds(new_start.getSeconds() + 1);
					
					
					// get the next end
					new_end = new Date(new_start.getTime());
					new_end.setFullYear(new_end.getFullYear() + 100);

					
					// format the dates in SQL compatible UTC format
					new_start    = new_start.toISOString().slice(0, 19).replace('T', ' ');
					new_end      = new_end.toISOString().slice(0, 19).replace('T', ' ');
					current_date = current_date.toISOString().slice(0, 19).replace('T', ' ');
					
					
					// create a transaction to update the models
					return Bookshelf.transaction(function(t) {
						

						// get the previous version
						return ChildModel.forge().query(function(qb) {
							
							
							// if the current version is the dev version, provide a query that will
							// never be true so that no results are returned to then
							if (current_version === constants.versioned.dev_version) {
								qb.whereRaw('1 = 2');
							}
							
							// otherwise get current version
							else {
								qb.where({parent_id: id}).andWhere({version: current_version});
							}
						})
						.fetch()
						.then(function(results) {
							
							
							// set the valid to date of the previously current version to the current date
							if (results) {
								
								var saveData = {
									valid_to: current_date
								};
								var saveOpts = {
									transacting: t,
									method: constants.methods.update
								};

								return results.save(saveData, saveOpts);
							}
						})
						.then(function() {
							
							/* all publish operations will go through this set of code */
							
							// promote the DEV version to the current version
							return ChildModel.forge().query(function(qb) {
								qb.where({parent_id: id}).andWhere({version: constants.versioned.dev_version});
							})
							.fetch({
								withRelated: models._relations[verTableName]
							})
							.then(function(results) {
								
								
								if (results) {
									
									var saveData = {
										valid_from: new_start,
										valid_to: new_end,
										version: new_version,
										published: true
									};
									var saveOpts = {
										transacting: t,
										method: constants.methods.update
									};
									
									return results.save(saveData, saveOpts);
								}
								
								
								// if no results then throw a dev version not found error
								throw('DevVersionNotFoundException');
							})
							.then(function(results) {
								
								
								// if there were results, attempt to clone the current object to
								// create a new dev version
								if (results) {
									
									// convert the result to JSON and remove unique values
									devPayload = results.toJSON({omitPivot: true});
									delete devPayload.id;
									delete devPayload.published;
									delete devPayload.version;
									delete devPayload.valid_from;
									delete devPayload.valid_to;
									delete devPayload.change_notes;
									
									
									// now find relationships
									_.forEach(devPayload, function(value, key) {
										
										
										// get the current column in the schema definition
										var colSchema = schema[verTableName][key];

										// replace empty values with nulls
										if (value !== null &&
												Array.isArray(value) &&
												value.length === 0) {
											value = null;
										}
										else if (value !== null &&
												typeof(value) === 'object' &&
												Object.keys(value).length === 0) {
											value = null;
										}
										
										
										// if the value is null, remove it from the payload
										if (value === null) {
											delete devPayload[key];
										}
										else {
											
											var hasRel = _.intersection(config.relations, Object.keys(colSchema))[0] || null;
											
											if (hasRel !== null) {
												var rel_idAttr = util.getIdAttribute(schema[colSchema[hasRel]]);
												
												if (hasRel === constants.belongsToMany || hasRel === constants.hasMany) {
													devPayload[key] = _.pluck(value, rel_idAttr);
												}
												else {
													devPayload[key] = value[rel_idAttr];
												}
											}
										}
									});
									

									// if the devPayload exists, try to save it
									if (typeof (devPayload) === 'object' && devPayload !== null) {
										
										// the following 2 options will allow the saveResource function
										// to return only the save function and bypass the restriction on
										// saving managed models so that we perform a save of a new version
										// in the current transaction
										var saveOpts = {
											_managedCheck: false,
											_returnSave: true
										};

										
										// request only the save function from saveResource so that we
										// can use its code in the current transaction
										return ChildModel.forge().saveResource(devPayload, saveOpts)
										.then(function(save) {
											return save(t);
										});
									}
								}
								
								// if a new DEV version has not been created, throw an error
								throw('DevVersionNotCreatedException');
								
							})
							.then(function() {
								
								var saveData = {
									current_version: new_version
								};
								var saveOpts = {
									transacting: t,
									method: constants.methods.update
								};
								
								// now update the current version in the parent object
								return ParentModel.forge(where).save(saveData, saveOpts);
							});
						});
					});
				})
				.then(function() {
					return ParentModel.forge().getResource(id, {version: new_version});
				})
				.caught(function(e) {
					return util.statusPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
				});
			}
		});
	};
};