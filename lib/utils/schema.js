// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//



module.exports = function(config) {
	
	
	var _         = config.lodash;
	var utils     = config.utils;
	var CONST     = config.constants;
	var schemer   = config.schemer;
	var relations = config.relations;
	var OPTS      = schemer.constants.options;
	var TYPE      = schemer.constants.type;


	// function used to get the type and related values for
	// a column schema
	function getPrimarySchema(col) {
		
		var schema = {};
		
		if (col.hasOwnProperty(OPTS.type)) {
			schema[OPTS.type] = col[OPTS.type];
		}
		
		if (col.hasOwnProperty(OPTS.size)) {
			schema[OPTS.size] = col[OPTS.size];
		}
		
		return schema;
	}
	
	
	// function to get the versioned model
	function getVersionedModel(schema, allSchema) {
		return _.has(schema, '_versioned.model') &&
		_.has(allSchema, schema._versioned.model) ?
				schema._versioned.model : null;
	}
	
	
	// get columns that are versioned
	function getVersionedColumns(tableSchema) {
		
		return _.omit(_.mapKeys(tableSchema, function(value, key) {
			if (value.hasOwnProperty('versioned') && value.versioned === true) {
				return key;
			}
		}), 'undefined');
	}
	
	
	// checks if a table is versioned
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
		
		if (typeof(schema) === 'object' && schema !== null) {
			return _.pick(schema, function(colSchema) {
				return colSchema.hasOwnProperty('type') &&
				(!colSchema.hasOwnProperty('ignore') || !colSchema.ignore);
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
						colSchema.hasOwnProperty('connectRelation') &&
						_.has(schema, colSchema[relation] + '.' + colSchema.connectRelation)) {

					// get the connected schema
					var connectSchema   = schema[colSchema[relation]][colSchema.connectRelation];
					var connectRelation = _.intersection(Object.keys(connectSchema), relations);
					connectRelation     = (connectRelation.length > 0) ? connectRelation[0] : null;

					// check valid relations
					if ((relation === 'hasOne' || relation === 'hasMany') && connectRelation === 'belongsTo') {

						schema[colSchema[relation]][colSchema.connectRelation].connectRelation = colName;
					}
					else if (relation === 'belongsTo' && (connectRelation === 'hasOne' || connectRelation === 'hasMany')) {
						schema[colSchema[relation]][colSchema.connectRelation].connectRelation = colName;
					}
					else if (relation === 'belongsToMany' && connectRelation === 'belongsToMany') {
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
	
	
	
	
	// function to create versioned objects
	function makeVersion(schema) {
		
		// loop through each table and check for versioned columns
		_.forEach(schema, function(tableSchema, tableName) {
			
			// get the versioned columns
			var versionedCols = getVersionedColumns(tableSchema);
			
			// if there are versioned columns, create a new versioned object
			if (Object.keys(versionedCols).length > 0) {
				
				// get the primary key of the parent
				var idAttr                        = getIdAttribute(tableSchema) || 'id';
				var parentSchema                  = _.clone(tableSchema[idAttr], true);

				// create the version object
				var verTableName                  = tableName + 'version';
				schema[verTableName]              = schema[verTableName] || {};
				schema[verTableName].id           = parentSchema;
				schema[verTableName].parent_id    = _.clone(parentSchema, true);
				schema[verTableName].published    = {type: TYPE.boolean, defaultTo: false};
				schema[verTableName].version      = {type: TYPE.integer, defaultTo: 0};
				schema[verTableName].valid_from   = {type: TYPE.dateTime, nullable: true};
				schema[verTableName].valid_to     = {type: TYPE.dateTime, nullable: true};
				schema[verTableName].change_notes = {type: TYPE.string, size: 500, nullable: true};
				
				// if there are versioned columns, move them over to the versioned object
				_.forEach(versionedCols, function(colSchema, colName) {
					
					if (Object.keys(colSchema).length > 0) {
						schema[verTableName][colName] = _.clone(colSchema, true);
						delete schema[tableName][colName];
					}
				});

				// add a managed attribute that tells what model manages the version
				schema[verTableName]._managed     = {model: tableName};
				
				// add columns to parent
				schema[tableName].active          = {type: TYPE.boolean, defaultTo: true};
				schema[tableName].use_current     = {type: TYPE.boolean, defaultTo: true};
				schema[tableName].current_version = {type: TYPE.integer, defaultTo: 0};
				schema[tableName]._versioned      = {model: verTableName};
			}
		});
		
		return schema;
	}
	
	
	
	// re-write of prepare schema
	function prepareSchemaX(schema) {
		
		// verify that the schema is an object
		if (typeof (schema) !== 'object') {
			return null;
		}
		
		// update the connect relations
		schema = connectRelations(schema);
		
		// first create any versions
		schema = makeVersion(schema);
		
		// update the relations		
		
		
		
		console.log(schema);
		console.log('===================');
	}
	
	
	
	// function to update relationships
	function updateRelations(schema) {
		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {
			
			// look at each versioned col
			_.forEach(tableSchema, function(colSchema, colName) {
				
				
				
				
				console.log('');
			});
		});
	}
	
	
	// function to update the schema and add or remove properties that are incorrect or missing
	// this will also create junction tables for you based on relationships specified
	function prepareSchema(schema) {
		
		
		if (typeof (schema) !== 'object') {
			return null;
		}
		
		
		// update the connectRelation fields
		schema = connectRelations(schema);
		
		
		// look for versioned and unversioned columns that reference the same model
		var verRef = versionForeignKeys(schema);
		
		
		// run the infection code to update relationships and versioning
		var infection = infect(schema);
		var actions   = infection.actions;
		while (infection.spread) {
		
			infection = infect(infection.schema);
			actions   = _.union(actions, infection.actions);
		}
		schema = infection.schema;

		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {
			
			
			// set the table name to use variables
			var useTableName, verTableName;
			useTableName = verTableName = '';
			
			
			// find versioned columns
			var versionedCols = getVersionedColumns(tableSchema);
			
			
			// if any columns were marked as versioned
			if (_.keys(versionedCols).length > 0) {
				

				// get the parent id column schema
				var vPk = schemer.manager.getPrimaryKeys(tableSchema);
				vPk = (Array.isArray(vPk) && vPk.length > 0) ? vPk[0] : 'id';
				var parentId = (tableSchema.hasOwnProperty(vPk)) ?
						getPrimarySchema(tableSchema[vPk]) : {type: TYPE.integer};
				
				
				// create a versioned table
				verTableName                      = tableName + 'version';
				schema[verTableName]              = schema[verTableName] || {};
				schema[verTableName].id           = tableSchema[vPk]; //{type: TYPE.integer, primary: true, increments: true};
				schema[verTableName].parent_id    = parentId;
				schema[verTableName].published    = {type: TYPE.boolean, defaultTo: false};
				schema[verTableName].version      = {type: TYPE.integer, defaultTo: 0};
				schema[verTableName].valid_from   = {type: TYPE.dateTime, nullable: true};
				schema[verTableName].valid_to     = {type: TYPE.dateTime, nullable: true};
				schema[verTableName].change_notes = {type: TYPE.string, size: 500, nullable: true};
				
				
				// move the columns over
				_.forEach(versionedCols, function(colSchema, colName) {
					schema[verTableName][colName] = colSchema;
				});
				
				
				// add a managed attribute that tells what model manages the version
				schema[verTableName]._managed     = {model: tableName};
				
				
				// add columns to parent
				schema[tableName].active          = {type: TYPE.boolean, defaultTo: true};
				schema[tableName].use_current     = {type: TYPE.boolean, defaultTo: true};
				schema[tableName].current_version = {type: TYPE.integer, defaultTo: 0};
				schema[tableName]._versioned      = {model: verTableName};
				
			}
			
			
			// loop through each column
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// determine the table schema that will be updated if versioned
				useTableName = (colSchema.hasOwnProperty('versioned') &&
						colSchema.versioned) ? verTableName : tableName;

				
				var fields = Object.keys(colSchema);
				
				
				// initialize variables
				var relTable, foreignKey, otherKey, relPk, myPk;
				relTable = foreignKey = otherKey = relPk = myPk = null;
				
				
				// check for relations
				var relType = utils.util.getCommonPropValue(relations, fields);
				
				
				// check if there was a relationship type and get common relationship variables
				if (relType !== '') {
					
					
					// try to get the primary key of this object as well as the related table name
					myPk     = schemer.manager.getPrimaryKeys(schema[useTableName]);
					relTable = colSchema[relType];
					
					
					// check that the table has a primary key
					if (myPk.length === 0) {
						console.log('INFO - ' + relType + ' relationship on model ' +
								useTableName + ', column ' + colName +
								' but no primary key was found, exiting');
						return null;
					}
					
					
					// check if the table is defined in the schema
					if (!schema.hasOwnProperty(relTable)) {
						
						console.log('INFO - ' + relType + ' relationship on model ' +
								useTableName + ' column ' + colName + ' points to table ' +
								relTable + ' but it does not exist, exiting');
						
						return null;
					}
					
					
					// get the primary key for the related table
					relPk = schemer.manager.getPrimaryKeys(schema[relTable]);
					
					
					// check that the related table has primary keys
					if (relPk.length === 0) {
						console.log('INFO - ' + relType + ' relationship on model ' +
								useTableName + ' column ' + colName + ' points to table ' +
								relTable + ', but no primary key was found on ' +
								relTable + ', exiting');
						return null;
					}
					
				}
				
				
				
				
				// belongsToMany relation
				if (colSchema.hasOwnProperty(CONST.belongsToMany)) {
					
					
					// create the junction table name if it doesn't exist
					var junction = colSchema[CONST.junction] || [useTableName, relTable].sort().join('_');
					
					
					// get or determine the foreign key and other key
					otherKey   = colSchema[CONST.otherKey] || relTable + '_' + relPk.join('_');
					foreignKey = colSchema[CONST.foreignKey] || useTableName + '_' + myPk.join('_');

					
					// check for the junction table, create it if it doesnt exist
					if (!schema.hasOwnProperty(junction)) {
						schema[junction] = {};
					}
					
					
					// check for foreign key, create if doesnt exist
					if (!schema[junction].hasOwnProperty(foreignKey)) {
						schema[junction][foreignKey] = getPrimarySchema(schema[useTableName][myPk[0]]);
					}
					
					
					// check for other key, create if doesnt exist
					if (!schema[junction].hasOwnProperty(otherKey)) {
						schema[junction][otherKey] = getPrimarySchema(schema[relTable][relPk[0]]);
					}

					
					// set the schema for the current table relation
					schema[useTableName][colName][CONST.foreignKey] = foreignKey;
					schema[useTableName][colName][CONST.junction]   = junction;
					schema[useTableName][colName][CONST.otherKey]   = otherKey;
				}
				
				
				
				
				
				// belongsTo relation
				/*
				else if (colSchema.hasOwnProperty(CONST.belongsTo)) {
					
					// create the foreign key
					foreignKey = colSchema[CONST.foreignKey] || relTable + '_' + colName +  '_' + relPk.join('_');
					
					// verify that the current table has the foreign key defined on itself
					if (!schema[useTableName].hasOwnProperty(foreignKey)) {
						schema[useTableName][foreignKey] = getPrimarySchema(schema[relTable][relPk[0]]);
						
						if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
							schema[useTableName][foreignKey][OPTS.nullable] = true;
						}

					}
					
					// set the foreignKey on the schema
					schema[useTableName][colName][CONST.foreignKey] = foreignKey;
				}*/

				/* ********************************************************************* *
				 * EDIT - hasOne/hasMany relations moved to the infect function          *
				 * ********************************************************************* */
				
				
				// remove the column from the original table if it is versioned
				if (colSchema.hasOwnProperty('versioned') &&
						colSchema.versioned === true &&
						(!verRef.hasOwnProperty(tableName) || !verRef[tableName].hasOwnProperty(colName))) {

					delete schema[tableName][colName];
				}
			});
		});
		
		
		// complete the pending actions
		
		
		_.forEach(actions, function(act) {
			console.log('Action:', act.table + '.' + act.column + '.' + act.relation + ' = ' + act.value);
			schema[act.table][act.column][act.relation] = act.value;
		});

		
		return schema;
	}
	
	
	
	// this function check if a model uses the same foreign key
	// as its versioned counterpart and returns a list
	function versionForeignKeys(schema) {
		
		var out = {};
		
		_.forEach(schema, function(tableSchema, tableName) {
			
			// look for has relationship on the same model in versioned and unversioned fields
			_.forEach(tableSchema, function(colSchema, colName) {

				var relation = _.intersection(_.keys(colSchema), ['hasOne', 'hasMany']);
				
				
				if (relation.length > 0 && (!_.has(colSchema, 'versioned') || !colSchema.versioned)) {
					
					relation = relation[0];

					// get all matches for the current 
					var matches = _.filter(
							tableSchema,
							function(n) {
								return (_.has(n, 'hasOne') && n.hasOne === colSchema[relation]) ||
								(_.has(n, 'hasMany') && n.hasMany === colSchema[relation]);
					});
					
					// get the versioned matches
					var vMatches = _.filter(matches, function(n) {
						return _.has(n, 'versioned') && n.versioned;
					});

					// get the standard matches
					var sMatches = _.filter(matches, function(n) {
						return !_.has(n, 'versioned') || !n.versioned;
					});

					// check that there are matches in both versioned and standard
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
	
	
	
	
	
	// function to spread versioned attributes to unversioned models making them
	// versioned if they recieve a versioned relationship value
	function infect(schema) {

		
		// set up variables. by default the infection has not spread
		var foreignKey, relTable;
		var actions = [];
		var spread = false;
		
		
		// loop through each column schema
		_.forEach(schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				
				// get the primary key and relationships
				var pk             = getIdAttribute(tableSchema);
				var relation       = _.intersection(Object.keys(colSchema), relations);

				// if there were any has relationships
				if (relation.length > 0) {
					
					
					// create the relation variables
					relation       = relation[0];
					relTable       = colSchema[relation];
					var relSchema  = schema[relTable];
					var relPk      = getIdAttribute(schema[relTable]);

					
					// check for has has relations
					if (relation === CONST.hasOne || relation === CONST.hasMany) {
						

						// figure out the foreign key
						//foreignKey = colSchema[CONST.foreignKey] || tableName + '_' + pk;
						foreignKey = colSchema[CONST.foreignKey] || tableName + '_' + colName + '_' + pk;
						
						colSchema[CONST.foreignKey] = foreignKey;

						
						// verify that the target table doesnt have the foreign key defined
						if (!schema[relTable].hasOwnProperty(foreignKey)) {
							
							
							// take this opportunity to set up the foreign key in the related table
							schema[relTable][foreignKey] = getPrimarySchema(schema[tableName][pk]);
							
							
							// transfer the nullable status from the relation schema
							if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
								schema[relTable][foreignKey][OPTS.nullable] = true;
							}

							
							// set the foreignKey on the schema
							schema[tableName][colName][CONST.foreignKey] = foreignKey;
						}

						
						// check that the foreign key should be versioned and set it on the
						// related model as versioned. if this took place, the infection has
						// spread
						if (colSchema.versioned && !schema[relTable][foreignKey].versioned) {
							
							
							// add an action to be performed
							actions.push({
								table: tableName + 'version',
								column: colName,
								relation: relation,
								value: relTable + 'version'
							});
							
							
							schema[relTable][foreignKey].versioned = true;
							spread = true;
							
						}
					}
					
					// check for belongsTo relation
					else if (relation === 'belongsTo') {
						
						// create the foreign key by first checking if there is a relationship connection
						if (colSchema.connectRelation && schema.hasOwnProperty(colSchema.belongsTo) &&
								schema[colSchema.belongsTo].hasOwnProperty(colSchema.connectRelation)) {
							
							var relConnectSchema = schema[colSchema.belongsTo][colSchema.connectRelation];
							var relFk            = colSchema.belongsTo + '_' + colSchema.connectRelation +
							                       '_' + relPk;

							// set the foreign key
							foreignKey = relConnectSchema.foreignKey || relFk;
						}
						else {
							foreignKey = colSchema[CONST.foreignKey] || relTable + '_' + colName +  '_' + relPk;
						}
						
						
						// verify that the current table has the foreign key defined on itself
						if (!schema[tableName].hasOwnProperty(foreignKey)) {
							schema[tableName][foreignKey] = getPrimarySchema(schema[relTable][relPk]);
							
							if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
								schema[tableName][foreignKey][OPTS.nullable] = true;
							}

						}
						
						// set the foreignKey on the schema
						schema[tableName][colName][CONST.foreignKey] = foreignKey;
						
						
						
						// check that the foreign key should be versioned and set it on the
						// related model as versioned. if this took place, the infection has
						// spread
						if (colSchema.versioned && !schema[tableName][foreignKey].versioned) {
							
							console.log('spreading belongsTo');
							
							console.log({
								table: tableName + 'version',
								column: colName,
								relation: relation,
								value: relTable + 'version'
							}, '-------');
							
							/*
							// add an action to be performed
							actions.push({
								table: tableName + 'version',
								column: colName,
								relation: relation,
								value: relTable + 'version'
							});*/
							
							
							schema[tableName][foreignKey].versioned = true;
							spread = true;
							
						}
						
					}
				}
			});
		});

		
		// return an object containing the schema and infection spread status
		return {
			actions: actions,
			spread: spread,
			schema: schema
		};
	}

	
	// function to get the primary keys for use as an id attribute
	// per bookshelf.js documentation, composite keys should be
	// an array of primary keys
	function getIdAttribute(tableSchema) {

		
		// if the schema is not an object return an empty list
		if (typeof (tableSchema) !== 'object') {
			return null;
		}
		
		
		// get the primary keys using knex-schemers function
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
		//var refs       = [];
		
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
	// the model either needs a uuid or is versioned
	function requiresTimestamp(schema) {
		
		// check if the schema has a uuid field
		var hasUUID = _.filter(schema, function(value, key) {
			return value.hasOwnProperty('type') && value.type === TYPE.uuid;
		});
		
		// check if the schema is versioned or has a uuid field
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

		// check for a versioned model returned, and 
		// get its parent model instead
		if (parent) {
			modelName = parent.model;
		}
		
		// return the model and id
		return modelName;
	}
	
	
	
	return {
		prepareSchema: prepareSchema,
		prepareSchemaX: prepareSchemaX,
		getPrimarySchema: getPrimarySchema,
		infect: infect,
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