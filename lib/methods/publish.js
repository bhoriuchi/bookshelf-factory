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
		
		
		var idAttr       = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var where        = {};
		var tableName    = this.tableName;
		var current_date = null;
		var new_start    = null;
		var new_end      = null;
		var ParentModel  = models[tableName];
		var verTableName = schema[tableName]._versioned.model;
		var ChildModel   = models[verTableName];
		var devPayload   = null;
		
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
				
				var current_version = results.attributes.current_version;
				var new_version     = current_version + 1;
				
				
				// first get the current database time to use in the version window
				return Bookshelf.knex.raw('select now() as now_time').then(function(result) {
					var now = _.pluck(result[0], 'now_time')[0];
					return (new Date(now)).toUTCString();
				})
				.then(function(nowUTC) {
					
					// set the current_date variable
					current_date = nowUTC;

					// get the next start
					new_start = new Date(current_date);
					new_start.setSeconds(new_start.getSeconds() + 1);
					new_start = new_start.toISOString().slice(0, 19).replace('T', ' ');
					
					// get the next end
					new_end = new Date(new_start);
					new_end.setFullYear(new_end.getFullYear() + 100);
					new_end = new_end.toISOString().slice(0, 19).replace('T', ' ');
					
					// format current date for sql
					current_date = (new Date(current_date)).toISOString().slice(0, 19).replace('T', ' ');
					
					console.log('current date', current_date);
					console.log('new start', new_start);
					console.log('new end', new_end);
					
					
					
					// create a transaction to update the models
					return Bookshelf.transaction(function(t) {
						

						// get the previous version
						return ChildModel.forge().query(function(qb) {
							
							
							// if the current version is the dev version
							if (current_version === constants.versioned.dev_version) {
								qb.where({parent_id: -1});
							}
							else {
								qb.where({parent_id: id}).andWhere({version: current_version});
							}
						})
						.fetch()
						.then(function(results) {
							
							// set the valid to date of the previously current version to the current date
							if (results) {
								return results.save({
									valid_to: current_date
								}, {
									transacting: t,
									method: constants.methods.update
								});
							}
							
						})
						.then(function() {
							
							// all publish operations will go through this set of code
							
							// promote the DEV version to the current version
							return ChildModel.forge().query(function(qb) {
								qb.where({parent_id: id}).andWhere({version: constants.versioned.dev_version});
							})
							.fetch({withRelated: models._relations[verTableName]})
							.then(function(results) {
								
								if (results) {
									return results.save({
										valid_from: new_start,
										valid_to: new_end,
										version: new_version,
										published: true
									}, {
										transacting: t,
										method: constants.methods.update
									});
								}
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
										
										if (schema[verTableName][key].hasOwnProperty(constants.belongsToMany)) {
											var btm_idAttr = util.getIdAttribute(schema[schema[verTableName][key].belongsToMany]);
											devPayload[key] = _.pluck(devPayload[key], btm_idAttr);
										}
										
									});
								}
							})
							.then(function() {
								
								// now update the current version in the parent object
								return ParentModel.forge(where).save({
									current_version: new_version
								}, {
									transacting: t,
									method: constants.methods.update
								});
							});
						});
					})
					.then(function() {
						
						if (typeof (devPayload) === 'object' && devPayload !== null) {
							return ChildModel.forge().saveResource(devPayload, {_skipPayloadCheck: true});
						}
						
					});
				});
			}
		});
	};
};