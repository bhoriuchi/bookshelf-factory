// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: delete function
//

module.exports = function(config) {

	// constants
	var _STAT               = config.statics.httpStatus;
	var _REL                = config.statics.relations;
	var _ERR                = config.statics.errorCodes;
	var _JTYP               = config.statics.jsTypes;
	var _VER                = config.statics.version;
	
	// modules
	var _                   = config.lodash;
	var knex                = config.knex;
	var promise             = config.promise;
	var u                   = config.utils.util;
	
	// initialize function
	return function(opts) {

		var fetchOpts       = opts.fetchOpts;
		
		// takes a transaction as its parameter and executes the delete
		return function(t) {

			var ids         = opts.ids;
			var model       = opts.model;
			var models      = opts.models;
			var schema      = models._schema;
			var tableSchema = schema[model.tableName];
			var force       = opts.fetchOpts.force      || false;
			var useDefault  = opts.fetchOpts.useDefault || true;
			
			var where, r, parent;
			
			// set the transaction
			fetchOpts.transacting = t;
			
			
			// delete each
			return promise.map(ids, function(id) {
				
				// set the where object
				where = u.newObj(model.idAttribute, id);

				// look for the model to delete
				return models[model.tableName].forge()
				.where(where)
				.fetch({
					withRelated: model.getRelations(),
					transacting: t
				})
				.then(function(results) {

					// check for results
					if (results && typeof(results) === _JTYP.object) {

						// store a reference to the parent
						parent = results;
						
						// get the relations
						var relations = results.relations || {};
						
						// look at each relation
						return promise.map(Object.keys(relations), function(relation) {
							
							// get the related data
							var related = relations[relation];
							var relData = related.relatedData;
							

							// check if there are any relations
							if ((related.length && related.length > 0) || related.id) {
								
								// check that force is set
								if (force) {
									
									// check for belongs to many and remove all entries in the junction
									if (relData.type === _REL.belongsToMany) {
										return related.detach(null, {transacting: t});
									}
									else if (relData.type === _REL.hasOne || relData.type === _REL.hasMany) {
										
										// fill default if specified and available
										var defaultTo = null;
										
										if (useDefault) {
											defaultTo = schema[relData.targetTableName][relData.foreignKey].defaultTo || null;
										}
										

										// remove existing references. wrap knex in a promise to use caught
										// instead of catch for ECMAScript errors
										return u.wrapPromise(
											knex(relData.targetTableName)
											.transacting(t)
											.update(relData.foreignKey, defaultTo)
											.where(relData.foreignKey, id)
										)
										.caught(function(err) {
											
											throw u.newErr(
													_STAT.CONFLICT.code,
													'Unable to remove dependencies',
													err.code,
													'table: ' + relData.targetTableName + ', column: ' + relData.foreignKey
											);
										});
									}
								}
								else {
									throw u.newErr(
										_STAT.CONFLICT.code,
										'The resource is still being referenced',
										_ERR.RESOURCE_REFERENCED.code,
										_ERR.RESOURCE_REFERENCED.detail
									);
								}
							}
						})
						.then(function() {
							
							// check for temporal schema
							if (tableSchema._versioned) {
								
								// get the where statement
								where = u.newObj(_VER.child.parent_id, id);
								
								// get all of the temporal models
								return models[tableSchema._versioned.model].forge()
								.where(where)
								.fetchAll({transacting: t})
								.then(function(results) {
									
									// check for results
									if (results && results.length > 0) {
										return promise.map(results.models, function(version) {
											
											// delete each version using the deleteResource method recursively
											return models[tableSchema._versioned.model].forge()
											.transaction(t)
											.deleteResource(version.id, {transacting: t, force: force})
											.end();
										});
									}
								});
							}
						})
						.then(function() {
							
							if (parent) {

								// remove the parent item
								return parent.destroy(null, {transacting: t});
							}
						});
					}
					else {
						throw u.newErr(
							_STAT.NOT_FOUND.code,
							_STAT.NOT_FOUND.message,
							_ERR.NOT_FOUND.code,
							['The ' + model.tableName + ' with ID ' + id + ' was not found']
						);
					}
				});
			})
			.then(function() {
				
				return _STAT.OK;
			});
		};
	};
};