// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// shorten the modules
	var Bookshelf = config.bookshelf;
	var schemer   = config.schemer;
	var Promise   = config.promise;
	var util      = config.util;
	var constants = config.constants;
	var relations = config.relations;
	var _         = config.lodash;
	var STATUS    = constants.statusCodes;
	var models    = global._factoryModels;
	var schema    = models._schema;
	
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {
	
		
		// set defaults and variables
		var where     = {};
		var rels      = [];
		var idAttr    = (Array.isArray(this.idAttribute)) ? this.idAttribute[0] : this.idAttribute;
		var id        = (obj.hasOwnProperty(idAttr)) ? obj[idAttr] : [];
		var method    = constants.methods.save;
		var keep      = this._keep;
		var pretty    = this._pretty;
		var tableName = this.tableName;
		
		
		// set default values
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts || { omitPivot: true };
		
		
		// check if a single id was supplied
		if (!Array.isArray(id)) {
			
			// set the where object and the method to updating
			where[idAttr] = id;
			method        = constants.methods.update;
			
		}

		
		// check payload
		var payload = util.checkPayload(this.tableName, obj, method);
		
		
		// if the payload passed figure out if there are any relations
		// then try to save the payload
		if (payload.passed) {

			console.log(payload.payload);
			
			// look through the payload to see if there are any relation values
			_.forEach(payload.payload, function(value, key) {

				
				// check for the type of relation match
				var relMatch = util.getCommonPropValue(Object.keys(schema[tableName][key]), relations);
				
				
				// if there was a match, remove the relation from the payload and add it to a relation
				// array to be processed later
				if (relMatch !== '') {
					
					rels.push({
						type: relMatch,
						key: key,
						value: payload.payload[key]
					});
					
					delete payload.payload[key];
				}
				
				
				// also delete any ignorable values passed if they are not relations
				else if(schemer.util.ignorable(schema[tableName][key], key)) {

					delete payload.payload[key];
				}
			});


			// try to update the model in a transaction
			return Bookshelf.transaction(function(t) {
				
				
				// forge a model and save it
				return models[tableName]
					.forge(where)
					.save(payload.payload, {transacting: t})
					.tap(function(model) {
					
					
					// try to update any relationships provided
					return Promise.each(rels, function(rel) {
						

						// get the relationship
						var relObj  = model.related(rel.key);
						var relData = relObj.relatedData;
						var where   = {};
						var save    = {};

						
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
										.save(save, {transacting: t});
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
								

								// check that the IDs passed are valid
								return util.verifyEntities(hasOneModel, hasOneIdAttr, hasOneValue)
								.then(function(invalid) {
									
									
									// if it does exist, try to save the model
									if (invalid.length === 0) {
										
										
										return models[relData.targetTableName].forge(where)
										.save(save, {transacting: t});
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
								
								
								// check that the IDs passed are valid
								return util.verifyEntities(hasManyModel, hasManyIdAttr, rel.value)
								.then(function(invalid) {
									
									
									// if it does exist, try to save the model
									if (invalid.length === 0) {
										
										return Promise.each(rel.value, function(id) {
											where[relData.targetIdAttribute]  = id;
											save[relData.foreignKey]          = relData.parentId;
											
											return models[relData.targetTableName].forge(where)
											.save(save, {transacting: t});
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
				});
			})
			.then(function(model) {
				
				
				// check for status only return option
				if (jsonOpts.hasOwnProperty(constants.statusResponse) && jsonOpts[constants.statusResponse]) {
					return util.statusPromise(STATUS.OK);
				}
				else {
					
					
					// check if pretty printing, otherwise return the model
					if (typeof (pretty) === 'object' && pretty.enabled) {
						return model.view(keep).pretty(pretty.spacing).getResource(model.attributes[idAttr]);
					}
					else {
						return model.view(keep).getResource(model.attributes[idAttr]);
					}
				}
			})
			.caught(function(e) {
				return util.statusPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
			});
		}
		else {
			return util.statusPromise(_.merge(STATUS.BAD_REQUEST, {details: payload.details}));
		}
	};
};