// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: delete function
//

module.exports = function(config) {

	// constants
	var _STAT        = config.statics.httpStatus;
	var _REL         = config.statics.relations;
	var _ERR         = config.statics.errorCodes;
	var _JTYP        = config.statics.jsTypes;
	var _VER         = config.statics.version;
	
	// modules
	var _           = config.lodash;
	var knex        = config.knex;
	var promise     = config.promise;
	var u           = config.utils.util;
	
	// initialize function
	return function(delOpts) {

		// takes a transaction as its parameter and executes the delete
		return function(t) {

			var ids         = delOpts.ids;
			var model       = delOpts.model;
			var models      = delOpts.models;
			var schema      = models._schema;
			var tableSchema = schema[model.tableName];
			var force       = delOpts.opts.force || false;
			var where, r, parent;
			
			// set the transaction
			delOpts.opts.transacting = t;
			
			// delete each
			return promise.map(ids, function(id) {

				// set the where object
				where = u.newObj(model.idAttribute, id);

				// look for the model to delete
				return models[model.tableName].forge().where(where).fetch({
					withRelated: model.getRelations()
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
							if (related.length > 0) {
								
								// check that force is set
								if (force) {
									// check for belongs to many and remove all entries in the junction
									if (relData.type === _REL.belongsToMany) {
										return related.detach(null, {transacting: t});
									}
									else if (relData.type === _REL.hasOne || relData.type === _REL.hasMany) {
										
										// remove existing references. wrap knex in a promise to use caught
										// instead of catch for ECMAScript errors
										return u.wrapPromise(
											knex(relData.targetTableName)
											.transacting(t)
											.update(relData.foreignKey, null)
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
							
							// check for versioned schema
							if (tableSchema._versioned) {
								
								// get the where statement
								where = u.newObj(_VER.child.parent_id, id);
								
								// get all of the versioned models
								return models[tableSchema._versioned.model].forge()
								.where(where).fetchAll().then(function(results) {
									
									// check for results
									if (results && results.length > 0) {
										return promise.map(results.models, function(version) {
											
											// delete each version using the deleteResource method recursively
											return models[tableSchema._versioned.model].forge()
											.deleteResource(version.id, delOpts.opts)
											.end();
										});
									}
								});
							}
						})
						.then(function() {
							
							// remove the parent item
							return parent.destroy(null, {transacting: t});
						});
					}
				});
			})
			.then(function() {
				return _STAT.OK;
			});
		};
	};
};