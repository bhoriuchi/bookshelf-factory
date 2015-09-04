// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Relation Update Helper function(s)
//



module.exports = function(config) {
	
	// constants
	var _JTYP     = config.statics.jsTypes;
	var _STAT     = config.statics.httpStatus;
	var _SCMA     = config.statics.schema;
	var _REL      = config.statics.relations;
	var _ACT      = config.statics.actions;
	var _SCH      = config.statics.schemer;
	var _VER      = config.statics.version;
	var _ERR      = config.statics.errorCodes;
	
	// modules
	var promise   = config.promise;
	var knex      = config.knex;
	var _         = config.lodash;
	var utils     = config.utils;
	var u         = utils.util;
	var s         = utils.string;
	
	// function to create or update relations
	function syncRelations(relations, model, t) {
				
		// runtime variables
		var models = global._factoryModels;
		
		// look at each relation
		return promise.each(relations, function(relation) {

			// get the related data
			var rel = model.related(relation.field);
			var dat = rel.relatedData;

			// check that the related object exists
			if (rel && typeof (rel) === _JTYP.object) {
				
				// set the variables
				var ids         = [];
				var objs        = [];
				var tableName   = relation.model;
				var tableSchema = models._schema[tableName];
				var foreignKey  = dat.foreignKey;
				var idAttr      = utils.schema.getIdAttribute(tableSchema);
				var where, save, whereSQL;
				
				// determine if the target table is a version table which means
				// that is may have duplicate parent_id values and select the 
				// draft version which is the only save-able version
				var versionSQL  = relation.versioned ? _VER.child.version + ' = ' + _VER.draft : null;
				var Model       = models[tableName];
				var def         = (tableSchema.hasOwnProperty(foreignKey) &&
						          tableSchema[foreignKey].hasOwnProperty(_SCH.options.defaultTo)) ?
						          tableSchema[foreignKey].defaultTo : null;

				// make the value an array if it is not one
				var value       = (Array.isArray(relation.value)) ? relation.value : [relation.value];
				
				// if the relationship is a belongsTo or hasOne, take only 1 value
				if (value.length > 0 &&
						(dat.type === _REL.belongsTo || dat.type === _REL.hasOne)) {
					value = [value[0]];
				}
				
				
				// now make two lists, one for id's and another for objects
				// objects will attempt to be saved/updated and added to the id's
				// list to update the relation on the model				
				_.forEach(value, function(v) {
					if (v && typeof(v) === _JTYP.object) {
						objs.push(v);
					}
					else if (v){
						ids = _.union(ids, [v]);
					}
				});
				
				// update options
				var updateOpts = {
					transacting: t,
					method: _ACT.update,
					patch: true
				};

				// attempt to save each of the relations
				return promise.map(objs, function(obj) {

					// create the model 
					return models[tableName].forge()
					.transaction(t)
					.saveResource(obj, {transacting: t, maxDepth: 0})
					.end()
					.then(function(result) {

						if (!result || u.isErr(result) || u.isStatus(result)) {
							throw  u.newErr(
								_STAT.BAD_REQUEST.code,
								_ERR.BAD_REQUEST_BODY.message,
								_ERR.BAD_REQUEST_BODY.code,
								[tableName + ' contained invalid data']
							);
						}
						else {
							return result[idAttr];
						}
					});
				})
				.then(function(saved) {

					// check that the IDs passed are valid
					return utils.validate.verifyEntities(tableName, ids, t).then(function(invalid) {

						// if there are no invalid IDs
						if (invalid.length === 0) {

							// update the IDs with the newly updated ones. we do this after the
							// verifyEntities because it is already known that the saved id's exist
							ids = _.union(ids, saved);
							
							// check if there is a belongs to many relationship to update. this will only
							// be available if the user specified a value in their save for the relationship
							if (dat.type === _REL.belongsToMany) {

								// drop the existing relationships and add the new ones
								// to clear relationships an empty array should be specified
								return rel.detach(null, {transacting: t}).then(function() {
									return rel.attach(ids, {transacting: t});
								});
							}
							else if (dat.type === _REL.belongsTo) {

								// populate the save and where with the relationship data
								where = u.newObj(dat.parentIdAttribute, dat.parentId);
								save  = u.newObj(foreignKey, ids[0]);
								
								// save the model
								return models[dat.parentTableName].forge(where)
								.save(save, updateOpts);
							}
							else if (dat.type === _REL.hasOne || dat.type === _REL.hasMany) {

								// create a save object
								save = u.newObj(foreignKey, dat.parentId);
								
								// remove existing references
								return knex(tableName).transacting(t)
								.update(foreignKey, def)
								.where(foreignKey, dat.parentId)
								.andWhereRaw(versionSQL)
								.then(function(results) {

									// loop through each id and update the model, for a hasOne, we
									// have already limited the ids to a single id
									return promise.each(ids, function(id) {
										
										// get the where SQL for temporal and regular models
										if (relation.versioned) {
											whereSQL = s.parse('`%s`.`%s` = \'%s\' and `%s`.`%s` = \'%s\'',
												tableName,
												_VER.child.version,
												_VER.draft,
												tableName,
												_VER.child.parent_id,
												id
											);
										}
										else {
											whereSQL = s.parse('`%s`.`%s` = \'%s\'',
												tableName,
												idAttr,
												id
											);
										}
										
										
										// update the relationship
										return models[tableName].forge()
										.query(function(qb) {
											qb.whereRaw(whereSQL);
										})
										.save(save, updateOpts);
									});
								});
							}
						}
						else {
							
							throw  u.newErr(
								_STAT.BAD_REQUEST.code,
								_ERR.BAD_REQUEST_BODY.detail,
								_ERR.BAD_REQUEST_BODY.code,
								['the ' + relation.field + ' field has one or more invalid values. ' + idAttr +
									' ' + JSON.stringify(invalid) + ' does not exist in the ' + tableName + ' table']
							);
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

		type = type || _VER.type.relation;
		
		// clone the fetch opts and remove fields
		var relFetchOpts = _.clone(fetchOpts, true);
		
		// check for saving
		if (relFetchOpts._saving) {
			
			if (type === _VER.type.relation) {
				delete relFetchOpts.version;
			}
			else if (type === _VER.type.child) {
				relFetchOpts.version = 0;
			}

		}
		// check for transacting
		if (fetchOpts.transacting) {
			relFetchOpts.transacting = fetchOpts.transacting;
		}
		
		// remove saving and withRelated so that the relation
		// query will get the current relation with all of its
		// relations
		if (type === _VER.type.relation) {
			relFetchOpts._reqPub = true;
			delete relFetchOpts.withRelated;
			delete relFetchOpts._saving;
		}
		
		// return the new fetchOpts
		return relFetchOpts;
	}
	
	
	// function to get a relations list
	function getRelations(result, rels) {
		
		var models = global._factoryModels;
		
		// get the relations. if there are none, set the variable to an
		// empty object so we can run result.save() once at the end regardless
		var relations = result.relations || {};

		// loop through each relation and check for ones that need to be published
		return promise.map(Object.keys(relations), function(relName) {
			
			// get the relation and its data
			var relation  = relations[relName];
			var relData   = relation.relatedData;
			var tgtTable  = models._schema[relData.targetTableName];
			var versioned = tgtTable.hasOwnProperty(_SCMA._managed);
			var pubTable  = versioned ? tgtTable._managed.model : relData.targetTableName;
			var rel;
			
			// check for has relations
			if (relData.type === _REL.hasOne && relation.id) {
				
				rel = {
					pubTable: pubTable,
					pubId: versioned ? relation.attributes.parent_id : relation.id
				};
				if (!_.find(rels, rel)) {
					rels.push(rel);
				}
			}
			else if (relData.type === _REL.hasMany && relation.length > 0) {
				_.forEach(relation.models, function(model) {

					rel = {
						pubTable: pubTable,
						pubId: versioned ? model.attributes.parent_id : model.id
					};
					if (!_.find(rels, rel)) {
						rels.push(rel);
					}
				});
			}
		})
		.then(function() {
			return rels;
		});
	}
	
	
	// return public functions
	return {
		getRelations: getRelations,
		syncRelations: syncRelations,
		relationFetchOpts: relationFetchOpts
	};
};