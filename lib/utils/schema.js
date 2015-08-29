// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//



module.exports = function(config) {
	
	//constants
	var _SCMR     = config.statics.schemer;
	var _SCMA     = config.statics.schema;
	var _JTYP     = config.statics.jsTypes;
	var _VER      = config.statics.version;
	var _REL      = config.statics.relations;
	var relations = Object.keys(_REL);
	
	// modules
	var _         = config.lodash;
	var utils     = config.utils;
	var schemer   = config.schemer;


	// function used to get the type and related values for
	// a column schema
	function getPrimarySchema(col) {
		
		var schema = {};
		
		if (col.hasOwnProperty(_SCMR.options.type)) {
			schema[_SCMR.options.type] = col[_SCMR.options.type];
		}
		
		if (col.hasOwnProperty(_SCMR.options.size)) {
			schema[_SCMR.options.size] = col[_SCMR.options.size];
		}
		
		return schema;
	}
	
	
	// function to get the temporal model
	function getVersionedModel(schema, allSchema) {
		return _.has(schema, _SCMA._versioned + '.' + _SCMA.model) &&
		_.has(allSchema, schema._versioned.model) ?
				schema._versioned.model : null;
	}
	
	
	// get columns that are temporal
	function getVersionedColumns(tableSchema) {
		
		return _.omit(_.mapKeys(tableSchema, function(value, key) {
			if (value.versioned) {
				return key;
			}
		}), _JTYP.undef);
	}
	
	
	// checks if a table is temporal
	function isVersioned(tableSchema) {
		
		
		var schema = getVersionedColumns(tableSchema);
		var keys   = Object.keys(schema);
		
		for(var i = 0; i < keys.length; i++) {
			
			if (schema[keys[i]].versioned) {
				return true;
			}
		}
		
		return false;
	}
	
	
	// function to get the columns in a table that should exist
	// returns them as a subset of the table schema
	function getColumns(schema) {
		
		if (schema && typeof(schema) === _JTYP.object) {
			return _.pick(schema, function(colSchema) {
				return colSchema.hasOwnProperty(_SCMR.options.type) &&
				(!colSchema.hasOwnProperty(_SCMR.options.ignore) || !colSchema.ignore);
			});
		}
		return {};
	}
	
	
	// update connect relations
	function connectRelations(schema) {
		
		_.forEach(schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// find relations
				var relation = _.intersection(Object.keys(colSchema), relations);
				relation     = (relation.length > 0) ? relation[0] : null;
				
				// look for a connectRelation property
				if (relation &&
						colSchema.hasOwnProperty(_SCMA.connectRelation) &&
						_.has(schema, colSchema[relation] + '.' + colSchema.connectRelation)) {

					// get the connected schema
					var connectSchema   = schema[colSchema[relation]][colSchema.connectRelation];
					var connectRelation = _.intersection(Object.keys(connectSchema), relations);
					connectRelation     = (connectRelation.length > 0) ? connectRelation[0] : null;

					// check valid relations
					if ((relation === _REL.hasOne || relation === _REL.hasMany) &&
							connectRelation === _REL.belongsTo) {
						schema[colSchema[relation]][colSchema.connectRelation].connectRelation = colName;
					}
					else if (relation === _REL.belongsTo &&
							(connectRelation === _REL.hasOne || connectRelation === _REL.hasMany)) {
						schema[colSchema[relation]][colSchema.connectRelation].connectRelation = colName;
					}
					else if (relation === _REL.belongsToMany && connectRelation === _REL.belongsToMany) {
						schema[colSchema[relation]][colSchema.connectRelation].connectRelation = colName;
					}
					else {
						console.log('Removing invalid connect relation ' + colName + ' from ' + tableName +
								    ' pointing to ' + colSchema[relation] + '.' + colSchema.connectRelation);
						delete schema[tableName][colName].connectRelation;
					}
				}
				else {
					// remove any connectRelations configured on non-relational fields
					delete schema[tableName][colName].connectRelation;
				}
			});
		});
		

		return schema;
	}
	
	
	
	
	// function to create temporal objects
	function makeVersion(schema) {
		
		var idAttr;
		
		// create a container for objects that should be processed to prevent multiple runs
		var toProcess = [];
		
		// loop through each table and check for temporal columns
		_.forEach(schema, function(tableSchema, tableName) {
			
			
			// get the temporal columns
			var versionedCols = getVersionedColumns(tableSchema);
			
			// if there are temporal columns, create a new temporal object. look for temporal and
			// managed fields to prevent duplicate version table creation
			if (Object.keys(versionedCols).length > 0 && !tableSchema._versioned && !tableSchema._managed) {
				
				// add the tables to process
				toProcess.push(tableName);
				toProcess.push(tableName + _SCMA.version);
				
				// get the primary key of the parent
				idAttr                           = getIdAttribute(tableSchema) || _SCMA.id;
				
				// clone the parent schema for use in the id field and parent_id field
				var parentSchemaId               = _.clone(tableSchema[idAttr], true);
				var parentSchemaParent           = _.clone(tableSchema[idAttr], true);
				
				// remove the auto-increments and primary fields from the primary schema
				delete parentSchemaParent.primary;
				delete parentSchemaParent.increments;
				
				// create the version object
				var verTableName                  = tableName + _SCMA.version;
				schema[verTableName]              = schema[verTableName] || {};
				schema[verTableName].id           = parentSchemaId;
				schema[verTableName].parent_id    = parentSchemaParent;
				schema[verTableName].published    = {type: _SCMR.type.boolean, defaultTo: false};
				schema[verTableName].version      = {type: _SCMR.type.integer, defaultTo: 0};
				schema[verTableName].valid_from   = {type: _SCMR.type.bigInteger, nullable: true};
				schema[verTableName].valid_to     = {type: _SCMR.type.bigInteger, nullable: true};
				schema[verTableName].change_notes = {type: _SCMR.type.string, size: 500, nullable: true};
				
				// if there are temporal columns, move them over to the temporal object
				_.forEach(versionedCols, function(colSchema, colName) {
					
					if (Object.keys(colSchema).length > 0) {
						
						// copy the column schema and remove the old
						schema[verTableName][colName] = _.clone(colSchema, true);
						delete schema[tableName][colName];
					}
				});

				// add a managed attribute that tells what model manages the version
				schema[verTableName]._managed     = {model: tableName};
				
				// add columns to parent
				schema[tableName].active          = {type: _SCMR.type.boolean, defaultTo: true};
				schema[tableName].use_current     = {type: _SCMR.type.boolean, defaultTo: true};
				schema[tableName].current_version = {type: _SCMR.type.integer, defaultTo: 0};
				schema[tableName]._versioned      = {model: verTableName};
			}
		});
		
		// now update relations in temporal models that point to other temporal models
		_.forEach(schema, function(tableSchema, tableName) {
			
			// get the primary key of the parent
			idAttr           = getIdAttribute(tableSchema) || _SCMA.id;
			
			// loop through each column and look for relations
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// find relations
				var relation = _.intersection(Object.keys(colSchema), relations);
				relation     = (relation.length > 0) ? relation[0] : null;
				
				
				// check for managed tables
				if (tableSchema._managed && _.contains(toProcess, tableName)) {
					// if there is a relation, check if the related table is temporal. if so
					// then the relation needs to be re-pointed to the temporal table
					if (relation && schema[colSchema[relation]] &&
							schema[colSchema[relation]]._versioned) {
						schema[tableName][colName][relation] = colSchema[relation] + _SCMA.version;
					}
				}
			});
		});
		
		
		// loop through the schema again and update the junction tables
		_.forEach(schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// find relations
				var relation = _.intersection(Object.keys(colSchema), relations);
				relation     = (relation.length > 0) ? relation[0] : null;
				
				// look for belongs to many tables and update the table name
				if (relation === _REL.belongsToMany) {
					
					// get the related table idAttribute
					var relTableName   = schema[tableName][colName].belongsToMany;
					var relTableSchema = schema[relTableName];
					var relIdAttr      = getIdAttribute(schema[relTableName]);
					
					// if temporal, rewrite the relationship
					if ((tableSchema._managed || relTableSchema._managed) && schema[colSchema.junction]) {
						
						// get the updated foreignKey
						var fkSchema = schema[colSchema.junction][colSchema.foreignKey];
						schema[tableName][colName].foreignKey = (tableSchema._managed) ?
								                                tableName + '_' + idAttr :
								                                schema[tableName][colName].foreignKey;
						
						// get the updated otherKey
						var okSchema = schema[colSchema.junction][colSchema.otherKey];
						schema[tableName][colName].otherKey   = (relTableSchema._managed) ?
								                                relTableName + '_' + relIdAttr :
								                                schema[tableName][colName].otherKey;
						
						
						// create a new name for the junction table
						var junctionTables = [tableName, relTableName].sort();
						var masterField;
						
						// check which relation is the master
						if (tableName === junctionTables[0] || !colSchema.connectRelation) {
							masterField = colName;
						}
						else {
							masterField = colSchema.connectRelation;
						}

						// use the sorted property name
						var junction = _SCMA.junction + '_' + masterField + '_' + junctionTables.join('_');

						// check if the schema already has the junction, if not create it by creating a 
						// new field and pointing it to the old junction then removing the old junction
						if (!schema.hasOwnProperty(junction)) {
							schema[junction]                                        = {};
							schema[junction][schema[tableName][colName].foreignKey] = fkSchema;
							schema[junction][schema[tableName][colName].otherKey]   = okSchema;
							
							// mark the table for removal
							schema[colSchema.junction]._marked_for_removal = true;
						}

						// finally set the junction to the new name
						schema[tableName][colName].junction = junction;
					}
				}
			});
		});
		
		
		// remove any tables marked for removal
		_.forEach(schema, function(tableSchema, tableName) {
			if (tableSchema._marked_for_removal) {
				delete schema[tableName];
			}
		});
		
		
		return schema;
	}
	
	
	// function to get the foreignKeys in each model in 
	// order to optionally remove them from the output
	function getForeignKeys(schema) {
		
		_.forEach(schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// find relations
				var relation = _.intersection(Object.keys(colSchema), relations);
				relation     = (relation.length > 0) ? relation[0] : null;
				
				if (relation && schema[colSchema[relation]]) {
					
					var relTableName = colSchema[relation];
					
					// figure out where the foreign key value should go and add it
					if (relation === _REL.hasOne || relation === _REL.hasMany) {
						
						// if the _foreignKeys field doesn't exist, add it
						schema[relTableName]._foreignKeys = schema[relTableName]._foreignKeys || [];
						
						// then add the key
						schema[relTableName]._foreignKeys = _.union(schema[relTableName]._foreignKeys, [colSchema.foreignKey]);
					}
					else if (relation === _REL.belongsTo) {
						
						// if the _foreignKeys field doesn't exist, add it
						schema[tableName]._foreignKeys = schema[tableName]._foreignKeys || [];
						
						// then add the key
						schema[tableName]._foreignKeys = _.union(schema[tableName]._foreignKeys, [colSchema.foreignKey]);
					}
				}
			});
		});
		
		// return the schema
		return schema;
	}
	
	
	
	// re-write of prepare schema
	function prepareSchema(schema) {
		
		// verify that the schema is an object
		if (typeof (schema) !== _JTYP.object) {
			return null;
		}
		
		// update the connect relations
		schema = connectRelations(schema);
		
		// update the relations	
		var relations   = updateRelations(schema);
		var spreadCount = 0;
		
		// loop while spreading, cap spread at 100 to prevent a runaway process
		while (relations.spread && spreadCount < 100) {
			
			// call the updateRelations function with the updated schema
			relations = updateRelations(relations.schema);
			spreadCount++;
		}
		schema = relations.schema;

		// create any versions and update relations
		schema = makeVersion(schema);
	
		// create a _foreignKeys field in the schema in order to ignore them
		schema = getForeignKeys(schema);

		// return the prepared schema
		return schema;
	}
	
	
	
	// function to update relationships
	function updateRelations(schema) {
		
		// variables
		var relConnectSchema;
		
		// set the spread flag to false. this will be used to signal if the 
		// function should be run again
		var spread = false;
		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {
			
			// get the id attribute
			var idAttr = getIdAttribute(tableSchema);
			
			// look at each temporal column
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// find relations
				var relation = _.intersection(Object.keys(colSchema), relations);
				relation     = (relation.length > 0) ? relation[0] : null;

				// if there were any has relationships
				if (relation) {
					
					// create the relation variables
					var relTableName = colSchema[relation];
					var relSchema    = schema[relTableName];
					var relIdAttr    = getIdAttribute(schema[relTableName]);

					
					// check for has has relations
					if (relation === _REL.hasOne || relation === _REL.hasMany) {
						
						// figure out the foreign key
						colSchema.foreignKey = colSchema.foreignKey || 'fk_' + tableName + '_' + colName + '_' + idAttr;

						// verify that the target table doesn't have the foreign key defined
						if (!schema[relTableName].hasOwnProperty(colSchema.foreignKey)) {
							
							// take this opportunity to set up the foreign key in the related table
							schema[relTableName][colSchema.foreignKey] = getPrimarySchema(schema[tableName][idAttr]);
							
							// transfer the null-able status from the relation schema
							if (colSchema.nullable) {
								schema[relTableName][colSchema.foreignKey].nullable = true;
							}
							
							// transfer the default to to the foreign key if the relation is a hasMany since
							// a hasOne relation by definition only has 1 relation in the targetTable it would
							// not make sense to default this relation potentially creating > 1 relation to the
							// same source item
							if (colSchema.defaultTo && relation === _REL.hasMany) {
								schema[relTableName][colSchema.foreignKey].defaultTo = colSchema.defaultTo;
							}

							// set the foreignKey on the schema
							schema[tableName][colName].foreignKey = colSchema.foreignKey;
							
							if (colSchema.connectRelation && relSchema) {
							
								relConnectSchema = schema[relTableName][colSchema.connectRelation];
								
								// check that either relation is temporal and set them all to temporal
								if ((colSchema.versioned && !relConnectSchema.versioned) ||
										(!colSchema.versioned && relConnectSchema.versioned)) {
									schema[tableName][colName].versioned = true;
									schema[relTableName][colSchema.connectRelation].versioned = true;
									spread = true;
								}
							}

						}

						// if this column is temporal and the foreign key is not temporal, it needs to be
						// set to temporal and the updateRelations function should be run again to further
						// find any other fields that should be temporal now that a new field is temporal
						if (colSchema.versioned && !schema[relTableName][colSchema.foreignKey].versioned) {
							
							// set the foreign key to temporal
							schema[relTableName][colSchema.foreignKey].versioned = true;
							spread = true;
						}
					}
					
					// check for belongsTo relations
					else if (relation === _REL.belongsTo) {

						// create the foreign key by first checking if there is a relationship connection
						if (colSchema.connectRelation && relSchema &&
								relSchema.hasOwnProperty(colSchema.connectRelation)) {
							
							relConnectSchema = schema[relTableName][colSchema.connectRelation];
							var relFk        = 'fk_' + relTableName + '_' +
							                   colSchema.connectRelation + '_' + relIdAttr;

							// set the foreign key
							colSchema.foreignKey = relConnectSchema.foreignKey || relFk;
							
							// check that either relation is temporal and set them all to temporal
							if ((colSchema.versioned && !relConnectSchema.versioned) ||
									(!colSchema.versioned && relConnectSchema.versioned)) {
								schema[tableName][colName].versioned = true;
								schema[relTableName][colSchema.connectRelation].versioned = true;
								spread = true;
							}
						}
						else {
							
							// create the foreign key if there is no connection
							colSchema.foreignKey = colSchema.foreignKey || 'fk_' + relTableName + '_' + colName +  '_' + relIdAttr;
						}

						// verify that the current table has the foreign key defined on itself
						if (!schema[tableName].hasOwnProperty(colSchema.foreignKey)) {
							
							// set the foreign key value
							schema[tableName][colSchema.foreignKey] = getPrimarySchema(schema[relTableName][relIdAttr]);
							
							// transfer the null-able property
							if (colSchema.nullable) {
								schema[tableName][colSchema.foreignKey].nullable = true;
							}
							
							// transfer the default to to the foreign key
							if (colSchema.defaultTo) {
								schema[tableName][colSchema.foreignKey].defaultTo = colSchema.defaultTo;
							}
							
							// set the foreignKey on the schema
							schema[tableName][colName].foreignKey = colSchema.foreignKey;
						}
						
						// if this column is temporal and the foreign key is not temporal, it needs to be
						// set to temporal and the updateRelations function should be run again to further
						// find any other fields that should be temporal now that a new field is temporal
						if (colSchema.versioned && !schema[tableName][colSchema.foreignKey].versioned) {
							
							// set the foreign key to temporal
							schema[tableName][colSchema.foreignKey].versioned = true;
							spread = true;
						}
					}
					
					// check for belongsToMany relation
					else if (relation === _REL.belongsToMany) {
						
						// get a sorted list of tables
						var junctionTables = [tableName, relTableName].sort();
						
						// check for a connection
						if (colSchema.connectRelation && relSchema) {
							
							var masterColSchema;
							
							// check which relation is the master
							if (tableName === junctionTables[0]) {
								masterColSchema = colSchema;
							}
							else {
								masterColSchema = schema[colSchema.belongsToMany][colSchema.connectRelation];
							}

							
							// use the sorted property name
							colSchema.junction = colSchema.junction ||
							                     _SCMA.junction + '_' + masterColSchema.connectRelation +
							                     '_' + junctionTables.join('_');
							
							if (colSchema.connectRelation && relSchema) {
								
								relConnectSchema = schema[relTableName][colSchema.connectRelation];
								
								// check that either relation is temporal and set them all to temporal
								if ((colSchema.versioned && !relConnectSchema.versioned) ||
										(!colSchema.versioned && relConnectSchema.versioned)) {
									schema[tableName][colName].versioned = true;
									schema[relTableName][colSchema.connectRelation].versioned = true;
									spread = true;
								}
							}
							
						}
						else {
							
							// create the junction table name if it doesn't exist
							colSchema.junction = colSchema.junction ||
							                     _SCMA.junction + '_' + colName + '_' +
							                     junctionTables.join('_');
						}
												
						// get or determine the foreign key and other key
						colSchema.otherKey   = colSchema.otherKey   || relTableName + '_' + relIdAttr;
						colSchema.foreignKey = colSchema.foreignKey || tableName + '_' + idAttr;

						// check for the junction table, create it if it doesn't exist
						if (!schema.hasOwnProperty(colSchema.junction)) {
							schema[colSchema.junction] = {};
						}
						
						// check for foreign key, create if doesn't exist
						if (!schema[colSchema.junction].hasOwnProperty(colSchema.foreignKey)) {
							schema[colSchema.junction][colSchema.foreignKey] = getPrimarySchema(schema[tableName][idAttr]);
						}
						
						// check for other key, create if doesn't exist
						if (!schema[colSchema.junction].hasOwnProperty(colSchema.otherKey)) {
							schema[colSchema.junction][colSchema.otherKey] = getPrimarySchema(schema[relTableName][relIdAttr]);
						}

						// set the schema for the current table relation
						schema[tableName][colName].foreignKey = colSchema.foreignKey;
						schema[tableName][colName].junction   = colSchema.junction;
						schema[tableName][colName].otherKey   = colSchema.otherKey;
					}
				}
			});
		});
		
		// return the schema and spread
		return {
			schema: schema,
			spread: spread
		};
	}
	

	// this function check if a model uses the same foreign key
	// as its temporal counterpart and returns a list
	function versionForeignKeys(schema) {
		
		var out = {};
		
		_.forEach(schema, function(tableSchema, tableName) {
			
			// look for has relationship on the same model in temporal and non-temporal fields
			_.forEach(tableSchema, function(colSchema, colName) {

				// get the has relation
				var relation = _.intersection(_.keys(colSchema), [_REL.hasOne, _REL.hasMany]);
				
				
				if (relation.length > 0 && (!_.has(colSchema, _SCMA.versioned) || !colSchema.versioned)) {
					
					relation = relation[0];

					// get all matches for the current 
					var matches = _.filter(
							tableSchema,
							function(n) {
								return (_.has(n, _REL.hasOne) && n.hasOne === colSchema[relation]) ||
								(_.has(n, _REL.hasMany) && n.hasMany === colSchema[relation]);
					});
					
					// get the temporal matches
					var vMatches = _.filter(matches, function(n) {
						return _.has(n, _SCMA.versioned) && n.versioned;
					});

					// get the standard matches
					var sMatches = _.filter(matches, function(n) {
						return !_.has(n, _SCMA.versioned) || !n.versioned;
					});

					// check that there are matches in both temporal and standard
					if (vMatches.length > 0 && sMatches.length > 0) {
						
						if (!_.has(out, colSchema[relation])) {
							out[colSchema[relation]] = {};
						}
						
						var fk = colSchema.foreignKey || tableName + '_' + getIdAttribute(tableSchema);
						
						out[colSchema[relation]][fk] = true;
					}
					
				}
			});
		});
		return out;
	}
	
	
	// function to get the primary keys for use as an id attribute
	// per bookshelf.js documentation, composite keys should be
	// an array of primary keys
	function getIdAttribute(tableSchema) {

		
		// if the schema is not an object return an empty list
		if (typeof (tableSchema) !== _JTYP.object) {
			return null;
		}
		
		
		// get the primary keys using knex-schemer's function
		var keys = schemer.manager.getPrimaryKeys(tableSchema);
		
		
		if (keys.length === 0) {
			return null;
		}
		else if (keys.length === 1) {
			return keys[0];
		}
		else {
			return keys;
		}
	}
	
	
	// function to find all related data for an entity
	function getRelated(modelName) {
		
		var schemaRefs = [];
		
		// look at the schema definition and find any references. essentially this
		// is only looking for hasOne and hasMany relationships since belongsTo is
		// defined on the model being deleted and belongsToMany can be deleted from
		// the junction table without impacting other models directly
		_.forEach(global._factoryModels._schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				
				// look for relations
				var relKey = utils.util.getCommonPropValue(Object.keys(colSchema), relations);
				
				
				// if there is a relation and it matches the 
				// model add it to the schema references
				if (relKey !== '' && colSchema[relKey] === modelName) {
					schemaRefs.push({
						table: tableName,
						column: colName,
						type: relKey,
						columnSchema: colSchema
					});
				}
			});
		});
		
		return schemaRefs;
	}
	
	
	// function to determine if a time stamp is required. currently that means that
	// the model either needs a UUID or is temporal
	function requiresTimestamp(schema) {
		
		// check if the schema has a UUID field
		var hasUUID = _.filter(schema, function(value, key) {
			return value.hasOwnProperty(_SCMR.options.type) &&
			       value.type === _SCMR.type.uuid;
		});
		
		// check if the schema is temporal or has a UUID field
		if (isVersioned(schema) || hasUUID) {
			return true;
		}
		return false;
	}
	
	
	
	// function to select which model and id should be used in a recursive get
	function selectModel(originalTable, models, relData, relField) {
		
		var modelName = originalTable;
		var schema    = models._schema;
		var parent    = schema[originalTable]._managed || null;

		// check for a temporal model returned, and 
		// get its parent model instead
		if (parent) {
			modelName = parent.model;
		}
		
		// return the model and id
		return modelName;
	}
	
	
	// return the functions
	return {
		prepareSchema: prepareSchema,
		getPrimarySchema: getPrimarySchema,
		getVersionedColumns: getVersionedColumns,
		isVersioned: isVersioned,
		getColumns: getColumns,
		getRelated: getRelated,
		getIdAttribute: getIdAttribute,
		requiresTimestamp: requiresTimestamp,
		getVersionedModel: getVersionedModel,
		selectModel: selectModel,
		connectRelations: connectRelations
	};
};