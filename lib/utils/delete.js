// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: delete function
//

module.exports = function(config) {

	var _           = config.lodash;
	var knex        = config.knex;
	var promise     = config.promise;
	var utils       = config.utils;
	var dev         = config.constants.versioned.dev_version;
	var CONST       = config.constants;
	var METHOD      = config.constants.methods;
	var STATUS      = config.constants.statusCodes;
	var relations   = config.relations;
	var u           = utils.util;
	
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

				console.log('removing ', model.tableName, ' ', id);
				
				// set the where object
				where = u.newObj(model.idAttribute, id);

				// look for the model to delete
				return models[model.tableName].forge().where(where).fetch({
					withRelated: models._relations[model.tableName]
				})
				.then(function(results) {
					
					// check for results
					if (results && typeof(results) === 'object') {
						
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
									if (relData.type === CONST.belongsToMany) {
										return related.detach(null, {transacting: t});
									}
									else if (relData.type === CONST.hasOne || relData.type === CONST.hasMany) {
										
										// remove existing references
										return knex(relData.targetTableName).transacting(t)
										.update(relData.foreignKey, null)
										.where(relData.foreignKey, id);
									}

								}
								else {
									throw 'Unable to remove relationship, use {force: true} option to attempt relationship removal';
								}
							}
						})
						.then(function() {
							
							// check for versioned schema
							if (tableSchema._versioned) {
								
								// get the where statement
								where = u.newObj('parent_id', id);
								
								// get all of the versioned models
								return models[tableSchema._versioned.model].forge()
								.where(where).fetchAll().then(function(results) {
									
									// check for results
									if (results && results.length > 0) {
										return promise.map(results.models, function(version) {
											
											console.log('delete', tableSchema._versioned.model, ':' ,version.id);
											return models[tableSchema._versioned.model].forge()
											.deleteResource(version.id, delOpts.opts);
										});
									}
								});
							}
						})
						.then(function() {
							//throw 'testing';
							return parent.destroy(null, {transacting: t});
						});
					}
				});
			});
		};
	};
};