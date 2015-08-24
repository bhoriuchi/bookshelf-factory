// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Relation Update Helper function(s)
//



module.exports = function(config) {
	
	var Promise   = config.promise;
	var promise   = config.promise;
	var constants = config.constants;
	var utils     = config.utils;
	var knex      = config.knex;
	var _         = config.lodash;
	
	
	// function to create or update relations
	function syncRelations(relations, model, t) {
		
		// shorten the models variable
		var models = global._factoryModels;
		
		return promise.each(relations, function(relation) {
			
			var rel = model.related(relation.field);
			var dat = rel.relatedData;

			// check that the related object exists
			if (typeof (rel) === 'object' && rel !== null) {
				
				var ids         = [];
				var objs        = [];
				var where       = {};
				var save        = {};
				var tableName   = relation.model;//dat.targetTableName;
				var tableSchema = models._schema[tableName];
				var foreignKey  = dat.foreignKey;
				var idAttr      = utils.schema.getIdAttribute(tableSchema); //dat.targetIdAttribute;
				
				// determine if the target table is a version table which means
				// that is may have duplicate parent_id values and select the 
				// dev version which is the only save-able version
				var versionSQL  = relation.versioned ? 'version = 0' : null;
				var Model       = models[tableName];
				var def         = (tableSchema.hasOwnProperty(foreignKey) &&
						          tableSchema[foreignKey].hasOwnProperty('defaultTo')) ?
						          tableSchema[foreignKey].defaultTo : null;

				// make the value an array if it is not one
				var value       = (Array.isArray(relation.value)) ? relation.value : [relation.value];
				
				// if the relationship is a belongsTo or hasOne, take only 1 value
				if (value.length > 0 &&
						(dat.type === constants.belongsTo || dat.type === constants.hasOne)) {
					value = [value[0]];
				}
				
				
				// now make two lists, one for id's and another for objects
				// objects will attempt to be saved/updated and added to the id's
				// list to update the relation on the model				
				_.forEach(value, function(v) {
					if (v && typeof(v) === 'object') {
						objs.push(v);
					}
					else if (v){
						ids = _.union(ids, [v]);
					}
				});

				
				// update options
				var updateOpts = {
					transacting: t,
					method: constants.methods.update,
					patch: true
				};
			
				
				// attempt to save each of the relations
				return promise.map(objs, function(obj) {

					// create the model 
					return models[tableName].forge()
					.saveResource(obj, {transacting: t, maxDepth: 0})
					.then(function(result) {
						
						if (!result || result.hasOwnProperty('_code')) {
							throw {message: 'bad payload data for ' + tableName, details: result};
						}
						else {
							return result[idAttr];
						}
					});
				})
				.then(function(saved) {

					// check that the IDs passed are valid
					return utils.validate.verifyEntities(Model, idAttr, ids, t).then(function(invalid) {
						
						// if there are no invalid ids
						if (invalid.length === 0) {
							
							// clear out save and where so the last iterations data
							// does not make it to this iteration
							save  = {};
							where = {};
							
							// update the ids with the newly updated ones. we do this after the
							// verifyEntities because it is already known that the saved id's exist
							ids = _.union(ids, saved);
							
							// check if there is a belongs to many relationship to update. this will only
							// be available if the user specified a value in their save for the relationship
							if (dat.type === constants.belongsToMany) {
								
								// drop the existing relationships and add the new ones
								// to clear relationships an empty array should be specified
								return rel.detach(null, {transacting: t}).then(function() {
									return rel.attach(ids, {transacting: t});
								});
							}
							else if (dat.type === constants.belongsTo) {
								
								// populate the save and where with the relationship data
								where[dat.parentIdAttribute] = dat.parentId;
								save[foreignKey]             = ids;
								
								// save the model
								return models[dat.parentTableName].forge(where)
								.save(save, updateOpts);
							}
							else if (dat.type === constants.hasOne || dat.type === constants.hasMany) {
								
								// create a save object
								save[foreignKey]     = dat.parentId;
								
								// remove existing references
								return knex(tableName).transacting(t)
								.update(foreignKey, def)
								.where(foreignKey, dat.parentId)
								.andWhereRaw(versionSQL)
								.then(function(results) {
									
									// loop through each id and update the model, for a hasOne, we
									// have already limited the ids to a single id
									return Promise.each(ids, function(id) {
										where[idAttr]  = id;
										
										
										//console.log('where', tableName, where);
										//console.log('save', tableName, save);
										return models[tableName].forge(where)
										.save(save, updateOpts);
										
									});
								});
							}
						}
						else {
							throw 'the ' + relation.field + ' field has one or more invalid values. ' + idAttr +
							' ' + JSON.stringify(invalid) + ' do not exist in the ' + tableName + ' table';
						}
					});
				});
			}
		})
		.then(function() {
			
			// return the original model
			return model;
		});
	}
	
	
	
	
	// function to get new fetch opts for a relation
	function relationFetchOpts(fetchOpts, type) {
		
		type = type || 'relation';
		
		// clone the fetch opts and remove fields
		var relFetchOpts = _.clone(fetchOpts);
		
		// check for saving
		if (relFetchOpts._saving) {
			
			if (type === 'relation') {
				delete relFetchOpts.version;
			}
			else if (type === 'child') {
				relFetchOpts.version = 0;
			}

		}
		// check for transacting
		if (fetchOpts.transacting) {
			relFetchOpts.transacting = fetchOpts.transacting;
		}
		
		// remove saving and withrelated so that the relation
		// query will get the current relation with all of its
		// relations
		if (type === 'relation') {
			delete relFetchOpts.withRelated;
			delete relFetchOpts._saving;
		}
		
		// return the new fetchOpts
		return relFetchOpts;
	}
	
	
	// return public functions
	return {
		syncRelations: syncRelations,
		relationFetchOpts: relationFetchOpts
	};
};