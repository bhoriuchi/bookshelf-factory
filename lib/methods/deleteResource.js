// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//



module.exports = function(config) {

	
	// shorten variable names
	var Bookshelf = config.bookshelf;
	var Promise   = config.promise;
	var _         = config.lodash;
	var utils     = config.utils;
	var constants = config.constants;
	var STATUS    = constants.statusCodes;


	// return the function
	return function(id, opts) {

		var models    = global._factoryModels;
		var where     = {};
		var hasWhere  = {};
		var hasSave   = {};
		var tableName = this.tableName;
		opts          = opts || {};
		var force     = opts.force || false;

		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			
			
			// set the where object
			where[this.idAttribute] = id;

			
			// check that the resource exists and get its relations
			return this.where(where).fetch({
				withRelated: models._relations[this.tableName]
			}).then(function(results) {
				
				
				// check that the results are not null
				if (typeof (results) === 'object' && results !== null) {
					
					//console.log(results.relations);
					var exRef = utils.schema.getRelated(tableName);

					
					// loop through each of the relations and check
					return Bookshelf.transaction(function(t) {
						
						var relations = results.relations || {};
						
						return Promise.each(Object.keys(relations), function(relation) {
						
							
							var related = relations[relation];
							var relData = related.relatedData;
							
							// check for belongs to many and remove all entries in the junction
							if (relData.type === constants.belongsToMany) {
								return related.detach(null, {transacting: t});
							}
							
							
							
							
							
							// check for hasOne and try to update the entry if 
							// the force option is specified
							else if (relData.type === constants.hasOne || relData.type === constants.hasMany) {

								
								// if the force option is set, try to
								// set the foreignKey to null
								if (force) {
									

									hasWhere = {};
									hasSave  = {};
									hasWhere[relData.foreignKey] = id;
									hasSave[relData.foreignKey] = null;
									
									return models[relData.targetTableName].forge()
									.where(hasWhere)
									.fetchAll()
									.then(function(results) {
										
										if (results.length > 0) {
										
											return Promise.each(results.models, function(result) {
												return result.save(hasSave, {transacting: t, method: 'update'});
											});
										}
									});
								}
								else {
									throw 'the table ' + relData.targetTableName +
									' is still referencing this resource, either remove the reference or use { force: true } ' +
									'in the deleteResource options';
								}
							}
						})
						.then(function() {
							// attempt to destroy the resource
							return results.destroy(null, {transacting: t}).then(function() {
								return utils.util.wrapPromise(STATUS.OK);
							})
							.caught(function(e) {
								return utils.util.wrapPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
							});
						})
						.caught(function(e) {
							return utils.util.wrapPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
						});
					});
				}
				else {
					
					
					return utils.util.wrapPromise(STATUS.NOT_FOUND);
				}
			});
		}
		else {
			
			
			return utils.util.wrapPromise(STATUS.BAD_REQUEST);
		}
	};
};