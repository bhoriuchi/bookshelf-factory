// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: publish function
//

module.exports = function(config) {

	// constants
	var _SCMA       = config.statics.schema;
	var _FOPT       = config.statics.fetchOpts;
	var _STAT       = config.statics.httpStatus;
	var _VER        = config.statics.version;
	var _ACT        = config.statics.actions;
	var _REL        = config.statics.relations;
	var _ERR        = config.statics.errorCodes;
	
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
			var fetchOpts  = opts.fetchOpts;
			var ids        = opts.ids;
			var tableName  = _self.tableName;
			var idAttr     = utils.schema.getIdAttribute(schema[tableName]) || _SCMA.id;
			var cTableName = schema[tableName]._versioned.model;
			var pModel     = models[tableName];
			var cModel     = models[cTableName];
			var dbType     = Bookshelf.knex.client.config.client;
			
			// set the transaction
			fetchOpts.transacting = t;
			
			// set up the save options
			var saveOpts = {
					transacting: t,
					method: _ACT.update,
					patch: true
			};
			
			
			// loop through each id and attempt to publish
			return promise.map(ids, function(id) {
				
				
				// check for a publish list
				if (fetchOpts.hasOwnProperty(_FOPT._publishing) &&
						_.find(fetchOpts._publishing, {table: tableName, id: id})) {
					
					console.log('already publishing', tableName, id);
					return [];
				}
				
				// add the current resource to the publishing list
				fetchOpts._publishing = fetchOpts._publishing || [];
				fetchOpts._publishing.push({
					table: tableName,
					id: id
				});
				
				
				// variables for each publish
				var where = u.newObj(idAttr, id);
				var current_date, new_start, saveData;
				
				// get the parent model
				return pModel.forge(where).fetch({transacting: t}).then(function(result) {
					
					
					// check for results
					if (!result) {
						throw u.newErr(
							_STAT.NOT_FOUND.code,
							_ERR.NOT_FOUND.detail,
							_ERR.NOT_FOUND.code,
							[tableName + ' with ID ' + id + ' was not found', 'thrown from publish']
						);
					}
					
					// calculate the new version
					var current_version = result.attributes.current_version;
					var new_version     = current_version + 1;
					
					
					// update the version
					return result.save({ current_version: new_version }, saveOpts).then(function(result) {
						
						// check that the result was updated
						if (!result) {
							throw u.newErr(
								_STAT.CONFLICT.code,
								_ERR.COULD_NOT_UPDATE.detail,
								_ERR.COULD_NOT_UPDATE.code,
								['Could not update the current_version field on ' + tableName + ' with ID ' + id, 'thrown from publish']
							);
						}
						
						
						// get the system time
						return utils.sql.getTime({transacting: t}).then(function(sysTime) {
							
							// set the current_date variable to the date value returned
							current_date = sysTime.date;

							// get the next start to the date + 1 second
							new_start = sysTime.date + 1;

							
							// get the current version
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
							.then(function(result) {
								
								// set the valid to date of the previously current version to the current date
								if (result) {

									// save the previous version with a new valid_to date
									return result.save({ valid_to: current_date }, saveOpts);
								}
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
								.then(function(result) {
									
									// if the draft version was not found, throw an error
									if (!result) {
										throw u.newErr(
											_STAT.NOT_FOUND.code,
											_ERR.NOT_FOUND.detail,
											_ERR.NOT_FOUND.code,
											['A draft version for ' + tableName + ' with ID ' + id + ' was not found', 'thrown from publish']
										);
									}

									// set the data on the new current version
									saveData = {
										valid_from: new_start,
										version: new_version,
										published: true
									};
									
									
									// get the relations. if there are none, set the variable to an
									// empty object so we can run result.save() once at the end regardless
									var relations = result.relations || {};
				
									// loop through each relation and check for ones that need to be published
									return promise.map(Object.keys(relations), function(relName) {
										
										// get the relation and its data
										var relation  = relations[relName];
										var relData   = relation.relatedData;
										var rels      = [];
										var tgtTable  = models._schema[relData.targetTableName];
										var versioned = tgtTable.hasOwnProperty(_SCMA._managed);
										var pubTable  = versioned ? tgtTable._managed.model : relData.targetTableName;

										
										// check for has relations
										if (relData.type === _REL.hasOne && relation.id) {
											
											rels.push({
												table: relData.targetTableName,
												obj: relation,
												pubTable: pubTable,
												pubId: versioned ? relation.attributes.parent_id : relation.id
											});
										}
										else if (relData.type === _REL.hasMany && relation.length > 0) {
											_.forEach(relation.models, function(model) {

												rels.push({
													table: relData.targetTableName,
													obj: model,
													pubTable: pubTable,
													pubId: versioned ? model.attributes.parent_id : model.id
												});
											});
										}
										
										
										// analyze and publish each required relation
										return promise.map(rels, function(rel) {
											return utils.model.isDraftDiff(rel, t)
											.then(function(diff) {
												
												if (diff) {
												
													console.log('publishing relation!', rel.pubTable, rel.pubId);
													return models[rel.pubTable].forge()
													.transaction(t)
													.publish(rel.pubId, fetchOpts)
													.end();
													
												}
											});
										});
									})
									.then(function() {
										
										// save the new current version
										return result.save(saveData, saveOpts);
									});
								})
								.then(function(results) {
									
									// check that the draft was successfully promoted
									if (!results) {
										throw u.newErr(
											_STAT.CONFLICT.code,
											_ERR.COULD_NOT_PROMOTE.detail,
											_ERR.COULD_NOT_PROMOTE.code,
											['The draft for ' + tableName + ' with ID ' + id + ' was not promoted', 'thrown from publish']
										);
									}
									
									// create a new draft by cloning the current
									return cModel.forge()
									.transaction(t)
									.cloneResource(results.id, {transacting: t, maxDepth: 0})
									.end();
									
								})
								.then(function(res) {

									return pModel.forge()
									.transaction(t)
									.getResource(res.parent_id, fetchOpts)
									.end();
								});
							});
						});
					});
				});
			});
		};
	};
};