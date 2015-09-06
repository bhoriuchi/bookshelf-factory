// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: publish function
//

// TODO need to update code to handle items that are unpublished

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
			var jsonOpts   = opts.jsonOpts;
			var ids        = opts.ids;
			var publishing = opts.publishing;
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
				if (_.find(publishing, {table: tableName, id: id})) {
					return;
				}
				
				// add the current resource to the publishing list
				publishing = publishing || [];
				publishing.push({
					table: tableName,
					id: id
				});
				
				
				// variables for each publish
				var where = u.newObj(idAttr, id);
				var current_date, new_start, saveData;
				var rels  = [];
				
				// get the parent model
				return pModel.forge(where).fetch({transacting: t}).then(function(result) {
					
					
					// check for results
					if (!result) {
						throw u.newErr(
							_STAT.NOT_FOUND.code,
							_ERR.NOT_FOUND.detail,
							_ERR.NOT_FOUND.code,
							[tableName + ' with ID ' + id + ' was not found',
							 'thrown from publish']
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
								['Could not update the current_version field on ' +
								 tableName + ' with ID ' + id, 'thrown from publish']
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
							.fetch({
								withRelated: models._relations[cTableName],
								transacting: t
							})
							.then(function(result) {
								
								// set the valid to date of the previously current version to the current date
								// and add the relations to check
								if (result) {

									// get the relations of the draft and add them to the rels array
									return utils.relation.getRelations(result, rels)
									.then(function(updatedRels) {
										
										// set the updated relations
										rels = updatedRels;
										
										// save the previous version with a new valid_to date
										return result.save({ valid_to: current_date }, saveOpts);
									});
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
											['A draft version for ' + tableName + ' with ID ' + id +
											 ' was not found', 'thrown from publish']
										);
									}

									// get the relations of the draft and add them to the rels array
									return utils.relation.getRelations(result, rels)
									.then(function(rels) {

										// analyze and publish each required relation
										return promise.map(rels, function(rel) {

											return utils.model.isDraftDiff(rel, t)
											.then(function(diff) {
												
												// check for a difference
												if (diff) {

													// if there is a difference check for force, if force is not
													// enabled, then throw an error
													if (!fetchOpts.force) {
														throw u.newErr(
															_STAT.CONFLICT.code,
															_ERR.COULD_NOT_PUBLISH_RELATION.detail,
															_ERR.COULD_NOT_PUBLISH_RELATION.code,
															['The relationship ' + rel.pubTable + ' with ID ' +
															 rel.pubId + ' also requires publishing but the ' +
															 '{force: true} option has not been specified',
															 'thrown from publish']
														);
													}
													
													// clone the fetch opts and add a note
													var relPubFetchOpts = _.clone(fetchOpts, true);
													relPubFetchOpts._autopublished = '{' + tableName + ':' + id + '}';
													
													// if force has been set, publish the relation
													return models[rel.pubTable].forge()
													.transaction(t)
													.publish(
														rel.pubId,
														relPubFetchOpts,
														jsonOpts,
														publishing
													)
													.end();
												}
											});
										});
									})
									.then(function() {
										
										// return the result instead of the map
										return result;
									});
								})
								.then(function(result) {

									// create a new draft by cloning the current
									return cModel.forge()
									.transaction(t)
									.cloneResource(result.id, {transacting: t, maxDepth: 0})
									.end()
									.then(function() {
										
										// get the change notes
										var change_notes = result.change_notes;
										
										// identified auto-published relations in the change notes
										if (fetchOpts._autopublished) {
											change_notes = (change_notes) ? ' - ' + change_notes : '';
											change_notes = 'AUTO-PUBLISHED from PUBLISH ' + fetchOpts._autopublished + change_notes;
										}
										
										// save the new current version
										return result.save({
											valid_from: new_start,
											version: new_version,
											change_notes: change_notes,
											published: true
										}, saveOpts);
									});
									
								})
								.then(function(result) {

									// check that the draft was successfully promoted
									if (!result) {
										throw u.newErr(
											_STAT.CONFLICT.code,
											_ERR.COULD_NOT_PROMOTE.detail,
											_ERR.COULD_NOT_PROMOTE.code,
											['The draft for ' + tableName + ' with ID ' + id +
											 ' was not promoted', 'thrown from publish']
										);
									}
									
									// finally get the parent
									return pModel.forge()
									.transaction(t)
									.getResource(result.attributes.parent_id, fetchOpts, jsonOpts)
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