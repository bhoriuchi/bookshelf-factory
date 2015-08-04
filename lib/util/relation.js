// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//



module.exports = function(config) {
	
	var Promise   = config.promise;
	var constants = config.constants;
	var util      = config.util;
	
	var updateRelations = function(relations, model, t) {
		
		// shorten the models variable
		var models = global._factoryModels;
		
		// try to update any relationships provided
		return Promise.each(relations, function(rel) {

			
			// get the relationship
			var relObj   = model.related(rel.key);
			var relData  = relObj.relatedData;
			var where    = {};
			var save     = {};
			var curWhere = {};
			var curSave  = {};

			
			// check that the related object exists
			if (typeof (relObj) === 'object' && relObj !== null) {

				
				// check if there is a belongs to many relationship to update. this will only
				// be available if the user specified a value in their save for the relationship
				if (rel.type === constants.belongsToMany) {

					
					// get the model and target id
					var btmModel  = models[relData.targetTableName];
					var btmIdAttr = relData.targetIdAttribute;
					
					
					// check that the IDs passed are valid
					return util.verifyEntities(btmModel, btmIdAttr, rel.value).then(function(invalid) {
						
						
						if (invalid.length === 0) {

							
							// drop the existing relationships and add the new ones
							// to clear relationships an empty array should be specified
							return relObj.detach(null, {transacting: t}).then(function() {
								return relObj.attach(rel.value, {transacting: t});
							});
						}
						else {

							
							throw 'the ' + rel.key +
							' field has one or more invalid values. ' +
							relData.targetIdAttribute +
							' ' +
							JSON.stringify(invalid) +
							' do not exist in the ' +
							relData.targetTableName +
							' table';
						}
					});
				}

				
				//  check for a belongsTo relationship
				else if (rel.type === constants.belongsTo) {
					
					// create some empty object for save and where methods
					var btModel  = models[relData.targetTableName];
					var btIdAttr = relData.targetIdAttribute;
					var btValue  = (Array.isArray(rel.value)) ? rel.value : [rel.value];

					
					// populate the save and where with the relationship data
					where = {};
					save  = {};
					where[relData.parentIdAttribute]  = relData.parentId;
					save[relData.foreignKey]          = rel.value;
				
					// check that the IDs passed are valid
					return util.verifyEntities(btModel, btIdAttr, btValue)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {
							
							
							return models[relData.parentTableName].forge(where)
							.save(save, {transacting: t, method: 'update', patch: true});
						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							
							
							throw 'the ' +
							rel.key +
							' field has an invalid value. ' +
							relData.targetIdAttribute +
							' ' +
							rel.value +
							' does not exist in the ' +
							relData.targetTableName +
							' table';
						}
					});
				}


				// check for a hasOne relationship and update the related models value
				else if (rel.type === constants.hasOne) {
					
					
					// create some empty object for save and where methods
					var hasOneModel  = models[relData.targetTableName];
					var hasOneIdAttr = relData.targetIdAttribute;
					var hasOneValue  = (Array.isArray(rel.value)) ? rel.value : [rel.value];

					
					// populate the save and where with the relationship data
					where = {};
					save  = {};
					where[relData.targetIdAttribute]  = rel.value;
					save[relData.foreignKey]          = relData.parentId;
				
					// data for existing rows to overwrite
					curWhere = {};
					curSave  = {};
					curWhere[relData.foreignKey] = relData.parentId;
					curSave[relData.foreignKey]  = models._schema[relData.targetTableName][relData.foreignKey].defaultTo || null;
					

					// check that the IDs passed are valid
					return util.verifyEntities(hasOneModel, hasOneIdAttr, hasOneValue)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {
							
							return models[relData.targetTableName].forge()
							.query(function(qb) {
								qb.where(curWhere);
							})
							.fetchAll()
							.then(function(results) {

								if (results.length > 0) {
									
									return Promise.each(results.models, function(result) {
										return result.save(curSave, {
											transacting: t,
											method: 'update',
											patch: true
										});
									});
								}
							})
							.then(function() {
								return models[relData.targetTableName].forge(where)
								.save(save, {
									transacting: t,
									method: 'update',
									patch: true
								});
							});
						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							
							
							throw 'the ' +
							rel.key +
							' field has an invalid value. ' +
							relData.targetIdAttribute +
							' ' +
							rel.value +
							' does not exist in the ' +
							relData.targetTableName +
							' table';
						}
					});
				}


				// check for hasMany relationship and update all models
				else if (rel.type === constants.hasMany) {
					
					
					where = {};
					save  = {};
					var hasManyModel  = models[relData.targetTableName];
					var hasManyIdAttr = relData.targetIdAttribute;
					
					
					// data for existing rows to overwrite
					curWhere = {};
					curSave  = {};
					curWhere[relData.foreignKey] = relData.parentId;
					curSave[relData.foreignKey]  = models._schema[relData.targetTableName][relData.foreignKey].defaultTo || null;
					
					
					// check that the IDs passed are valid
					return util.verifyEntities(hasManyModel, hasManyIdAttr, rel.value)
					.then(function(invalid) {
						
						
						// if it does exist, try to save the model
						if (invalid.length === 0) {
							
							
							return models[relData.targetTableName].forge()
							.query(function(qb) {
								qb.where(curWhere);
							})
							.fetchAll()
							.then(function(results) {

								if (results.length > 0) {
									
									return Promise.each(results.models, function(result) {
										return result.save(curSave, {
											transacting: t,
											method: 'update',
											patch: true
										});
									});
								}
							})
							.then (function() {
								return Promise.each(rel.value, function(id) {
									where[relData.targetIdAttribute]  = id;
									save[relData.foreignKey]          = relData.parentId;
									
									return models[relData.targetTableName].forge(where)
									.save(save, {transacting: t, method: 'update', patch: true});
								});
							});

						}
						
						// otherwise throw an exception that the model doesn't exist
						else {
							
							
							throw 'the ' + rel.key +
							' field has one or more invalid values. ' +
							relData.targetIdAttribute +
							' ' +
							JSON.stringify(invalid) +
							' do not exist in the ' +
							relData.targetTableName +
							' table';
						}
					});
				}
			}
		})
		.then(function() {
			
			
			// finally return the model
			return model;
		});
	};
	
	
	return {
		updateRelations: updateRelations
	};
};