// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Relation Update Helper function(s)
//



module.exports = function(config) {
	
	var Promise   = config.promise;
	var constants = config.constants;
	var utils     = config.utils;
	var knex      = config.knex;
	
	
	// function to create or update relations
	function syncRelations(relations, model, t) {
		
		
		
		return model;
	}
	
	
	
	
	
	
	
	var updateRelations = function(relations, model, t) {
		
		// shorten the models variable
		var models = global._factoryModels;

		
		// try to update any relationships provided
		return Promise.each(relations, function(rel) {

			
			// get the relationship
			var relObj         = model.related(rel.key);
			var relData        = relObj.relatedData;
			var where          = {};
			var save           = {};
			var curWhere       = {};
			var curSave        = {};

			
			// check that the related object exists
			if (typeof (relObj) === 'object' && relObj !== null) {
				
				var idAttr      = relData.targetIdAttribute;
				var tableName   = relData.targetTableName;
				var foreignKey  = relData.foreignKey;
				var tableSchema = models._schema[tableName];
				var versioned   = tableSchema.hasOwnProperty(foreignKey) ? false : true;
				var Model       = models[tableName];
				var value       = (Array.isArray(rel.value)) ? rel.value : [rel.value];
				
				
				// update options
				var updateOpts = {
					transacting: t,
					method: constants.methods.update,
					patch: true
				};

				
				// check if there is a belongs to many relationship to update. this will only
				// be available if the user specified a value in their save for the relationship
				if (rel.type === constants.belongsToMany) {

					
					// check that the IDs passed are valid
					return utils.validate.verifyEntities(Model, idAttr, value).then(function(invalid) {
						
						
						if (invalid.length === 0) {

							
							// drop the existing relationships and add the new ones
							// to clear relationships an empty array should be specified
							return relObj.detach(null, {transacting: t}).then(function() {
								return relObj.attach(value, {transacting: t});
							});
						}
						else {
							throw 'the ' + rel.key + ' field has one or more invalid values. ' + idAttr +
							' ' + JSON.stringify(invalid) + ' do not exist in the ' + tableName + ' table';
						}
					});
				}

				
				//  check for a belongsTo relationship
				else if (rel.type === constants.belongsTo) {
					
					
					// populate the save and where with the relationship data
					where[relData.parentIdAttribute]  = relData.parentId;
					save[foreignKey]                  = value;
				
					// check that the IDs passed are valid
					return utils.validate.verifyEntities(Model, idAttr, value)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {

							
							return models[relData.parentTableName].forge(where)
							.save(save, updateOpts);
						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							throw 'the ' + rel.key + ' field has an invalid value. ' + idAttr + ' ' +
							value + ' does not exist in the ' + tableName + ' table';
						}
					});
				}


				// check for a hasOne relationship and update the related models value
				else if (rel.type === constants.hasOne) {

					
					// modify the table name if a temporal version
					tableName = (versioned) ? tableName + 'version' : tableName;
					
					
					// populate the save and where with the relationship data
					where[idAttr]        = value;
					save[foreignKey]     = relData.parentId;
				
					
					// data for existing rows to overwrite
					curWhere[foreignKey] = relData.parentId;
					curSave[foreignKey]  = tableSchema[foreignKey].defaultTo || null;

					
					if (versioned) {
						curWhere.version = 0;
					}
					
					
					// check that the IDs passed are valid
					return utils.validate.verifyEntities(Model, idAttr, value)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {

							
							return models[tableName].forge()
							.query(function(qb) {
								qb.where(curWhere);
							})
							.fetchAll()
							.then(function(results) {

								if (results.length > 0) {
									
									return Promise.each(results.models, function(result) {
										return result.save(curSave, updateOpts);
									});
								}
							})
							.then(function() {
								return models[tableName].forge(where)
								.save(save, updateOpts);
							});
						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							throw 'the ' + rel.key + ' field has an invalid value. ' + idAttr +
							' ' + rel.value + ' does not exist in the ' + tableName + ' table';
						}
					});
				}


				// check for hasMany relationship and update all models
				else if (rel.type === constants.hasMany) {

					
					// modify the table name if a temporal version
					tableName = (versioned) ? tableName + 'version' : tableName;

					
					// data for existing rows to overwrite
					curWhere[foreignKey] = relData.parentId;
					
					if (versioned) {
						curWhere.version = 0;
					}
					
					curSave[foreignKey]  = tableSchema[foreignKey].defaultTo || null;
					
					
					// check that the IDs passed are valid
					return utils.validate.verifyEntities(Model, idAttr, value)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {
							
							
							return models[tableName].forge()
							.query(function(qb) {
								qb.where(curWhere);
							})
							.fetchAll()
							.then(function(results) {

								if (results.length > 0) {
									
									return Promise.each(results.models, function(result) {
										return result.save(curSave, updateOpts);
									});
								}
							})
							.then (function() {
								return Promise.each(rel.value, function(id) {
									where[idAttr]            = id;
									save[foreignKey] = relData.parentId;
									
									return models[tableName].forge(where)
									.save(save, updateOpts);
								});
							});

						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							throw 'the ' + rel.key + ' field has one or more invalid values. ' + idAttr +
							' ' + JSON.stringify(invalid) + ' do not exist in the ' + tableName + ' table';
						}
					});
				}
			}
		})
		.then(function() {
			return model;
		});
	};
	
	
	return {
		updateRelations: updateRelations,
		syncRelations: syncRelations
	};
};