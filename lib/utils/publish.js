// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: publish function
//

module.exports = function(config) {

	// constants
	var _SCMA       = config.statics.schema;
	var _STAT       = config.statics.httpStatus;
	var _VER        = config.statics.version;
	var _ACT        = config.statics.actions;
	var _REL        = config.statics.relations;
	
	// modules
	var _           = config.lodash;
	var Bookshelf   = config.bookshelf;
	var knex        = config.knex;
	var promise     = config.promise;
	var utils       = config.utils;
	var u           = utils.util;
	
	// setup function
	return function(opts) {
		
		// function that accepts a transaction
		return function(t) {
			
			// runtime variables
			var models     = global._factoryModels;
			var schema     = models._schema;
			
			// variables
			var _self      = opts._self;
			var tableName  = _self.tableName;
			var idAttr     = utils.schema.getIdAttribute(schema[tableName]) || _SCMA.id;
			var cTableName = schema[tableName]._versioned.model;
			var pModel     = models[tableName];
			var cModel     = models[cTableName];
			var dbType     = Bookshelf.knex.client.config.client;
			
			// set the transaction
			opts.transacting = t;
			
			// loop through each id and attempt to publish
			return promise.map(opts.ids, function(id) {
				
				// variables for each publish
				var where = u.newObj(idAttr, id);
				var current_date, new_start, saveData, saveOpts;
				
				// get the parent model
				return pModel.forge(where).fetch({transacting: t}).then(function(result) {
					
					// check for results
					if (!result) {
						throw 'Resource does not exist';
					}
					
					// update the version
					var current_version = result.attributes.current_version;
					var new_version     = current_version + 1;
					
					// get the system time
					return utils.sql.getTime({transacting: t}).then(function(sysTime) {
						
						// set the current_date variable to the date value returned
						current_date = sysTime.date;

						// get the next start to the date + 1 second
						new_start = sysTime.date + 1;

						
						// get the previous version
						return cModel.forge().query(function(qb) {
							
							// if the current version is the draft version, provide a query that will
							// never be true so that no results are returned to then
							if (current_version === _VER.draft) {
								qb.whereRaw('1 = 2');
							}
							
							// otherwise get current version
							else {
								qb.where({parent_id: id}).andWhere({version: current_version});
							}
						})
						.fetch({transacting: t})
						.then(function(results) {
							
							// set the valid to date of the previously current version to the current date
							if (results) {
								
								saveData = {
									valid_to: current_date
								};
								saveOpts = {
									transacting: t,
									method: _ACT.update,
									patch: true
								};

								// save the previous version with a new valid_to date
								return results.save(saveData, saveOpts);
							}
						})
						.then(function() {
							
							saveOpts = {
								transacting: t,
								method: _ACT.update,
								patch: true
							};
							saveData = {
								current_version: new_version,
							};
							saveData[idAttr] = id;
							
							return pModel.forge().save(saveData, saveOpts);
						})
						.then(function() {
							
							// promote the draft version to the current version
							return cModel.forge().query(function(qb) {
								qb.where({parent_id: id}).andWhere({version: _VER.draft});
							})
							.fetch({
								withRelated: models._relations[cTableName],
								transacting: t
							})
							.then(function(results) {
								
								if (!results) {
									throw 'No draft version was found';
								}
								
								saveData = {
									valid_from: new_start,
									version: new_version,
									published: true
								};
								saveOpts = {
									transacting: t,
									method: _ACT.update,
									patch: true
								};
									
								return results.save(saveData, saveOpts);
							})
							.then(function(results) {
								
								if (!results) {
									throw 'Could not promote the draft version to the current version';
								}
								
								
								// create a new draft by cloning the current
								return cModel.forge()
								.getResource(results.id, {transacting: t, maxDepth: 0})
								.saveResource(null, {transacting: t, clone: true})
								.end();
								
							})
							.then(function(res) {
								return pModel.forge().getResource(res.parent_id, {transacting: t, maxDepth: 0}).end();
							});
							/*
							.then(function(results) {
								
								if (!results) {
									throw 'Could not create a new draft version';
								}
								
								// get the relations
								var relations = results.relations || {};
								
								// now check related models and determine if they should be published
								// as a result of this publish
								return promise.map(Object.keys(relations), function(relation) {
									
									// get the related data
									var related = relations[relation];
									var relData = related.relatedData;
									
									// get any existing has relationships
									if (relData.type === _REL.hasOne || relData.type === _REL.hasMany) {
										
										// first check if there there are any current relations to
										// the current item
										return knex(relData.targetTableName)
										.transacting(t)
										.where(relData.foreignKey, results.id)
										.then(function(curRel) {
											
											var newIds = [];
											
											// get a list of the current relations
											var curIds = _.pluck(curRel, relData.targetIdAttribute);
											
											// get a list of the new relations
											if (relData.type === _REL.hasOne && related.id) {
												newIds = [related.id];
											}
											else if (relData.type === _REL.hasMany &&
													related.length && related.length > 0) {
												newIds = _.pluck(related.models, 'id');
											}
											
																				
											// get the difference of the 2 id arrays
											// these will require a publish
											var pubIds = _.difference(newIds, curIds);
											
											console.log('current ids',curIds);
											console.log('new ids',newIds);
											console.log('publish ids',pubIds);
											
										});
									}
									
								});
							});*/
							//.then(function() {
							//	throw 'testing';
							//});
						});
					});
				});
			});
		};
	};
};