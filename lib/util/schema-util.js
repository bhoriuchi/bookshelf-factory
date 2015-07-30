// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//



module.exports = function(config) {
	
	
	var _         = config.lodash;
	var util      = config.util;
	var constants = config.constants;
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
	
	
	
	
	
	// function to update the schema and add or remove properties that are incorrect or missing
	// this will also create junction tables for you based on relationships specified
	function prepareSchema(schema) {
		
		
		if (typeof (schema) !== 'object') {
			return null;
		}
		
		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {
			
			
			// set the table name to use
			var useTableName = tableName;
			
			
			// find versioned columns
			var versionedCols = _.omit(_.mapKeys(tableSchema, function(value, key) {
				if (value.hasOwnProperty('versioned') && value.versioned === true) {
					return key;
				}
			}), 'undefined');
			
			
			// if any columns were marked as versioned
			if (_.keys(versionedCols).length > 0) {
				

				// get the parent id column schema
				var vPk = schemer.manager.getPrimaryKeys(tableSchema);
				vPk = (Array.isArray(vPk) && vPk.length > 0) ? vPk[0] : 'id';
				var parentId = (tableSchema.hasOwnProperty(vPk)) ?
						getPrimarySchema(tableSchema[vPk]) : {type: TYPE.integer};
				
				
				// create a versioned table
				var verTableName                  = tableName + '_version';
				schema[verTableName]              = schema[verTableName] || {};
				schema[verTableName].id           = {type: TYPE.integer, primary: true, increments: true};
				schema[verTableName].parent_id    = parentId;
				schema[verTableName].published    = {type: TYPE.boolean};
				schema[verTableName].version      = {type: TYPE.integer};
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
				schema[tableName].active          = {type: TYPE.boolean};
				schema[tableName].override        = {type: TYPE.boolean};
				schema[tableName]._versioned      = {model: verTableName};
				
				
				// update the table name to use
				useTableName = verTableName;
			}
			
			
			// loop through each column
			_.forEach(tableSchema, function(colSchema, colName) {
				
				
				var fields = Object.keys(colSchema);
				
				
				// initialize variables
				var relTable, foreignKey, otherKey, relPk, myPk;
				relTable = foreignKey = otherKey = relPk = myPk = null;
				
				
				// check for relations
				var relType = util.getCommonPropValue(relations, fields);
				
				
				// check if there was a relationship type and get common relationship variables
				if (relType !== '') {
					
					
					// try to get the primary key of this object as well as the related table name
					// VERSION EDIT - myPk     = schemer.manager.getPrimaryKeys(tableSchema);
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
				if (colSchema.hasOwnProperty(constants.belongsToMany)) {
					
					
					// create the junction table name if it doesn't exist
					var junction = colSchema[constants.junction] || [useTableName, relTable].sort().join('_');
					
					
					// get or determine the foreign key and other key
					otherKey   = colSchema[constants.otherKey] || relTable + '_' + relPk.join('_');
					foreignKey = colSchema[constants.foreignKey] || useTableName + '_' + myPk.join('_');

					
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
					schema[useTableName][colName][constants.foreignKey] = foreignKey;
					schema[useTableName][colName][constants.junction]   = junction;
					schema[useTableName][colName][constants.otherKey]   = otherKey;
				}
				
				
				
				
				
				// belongsTo relation
				else if (colSchema.hasOwnProperty(constants.belongsTo)) {
					
					// create the foreign key
					foreignKey = colSchema[constants.foreignKey] || relTable + '_' + relPk.join('_');
					
					// verify that the current table has the foreign key defined on itself
					if (!schema[useTableName].hasOwnProperty(foreignKey)) {
						schema[useTableName][foreignKey] = getPrimarySchema(schema[relTable][relPk[0]]);
						
						if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
							schema[useTableName][foreignKey][OPTS.nullable] = true;
						}

					}
					
					// set the foreignKey on the schema
					schema[useTableName][colName][constants.foreignKey] = foreignKey;
				}


				
				
				
				// hasOne relation
				else if (colSchema.hasOwnProperty(constants.hasOne) ||
						colSchema.hasOwnProperty(constants.hasMany)) {
					
					// create the foreign key
					foreignKey = colSchema[constants.foreignKey] || useTableName + '_' + myPk.join('_');
					
					// verify that the target table has the foreign key defined
					if (!schema[relTable].hasOwnProperty(foreignKey)) {
						schema[relTable][foreignKey] = getPrimarySchema(schema[useTableName][myPk[0]]);
						
						if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
							schema[relTable][foreignKey][OPTS.nullable] = true;
						}
					}
					
					// set the foreignKey on the schema
					schema[useTableName][colName][constants.foreignKey] = foreignKey;
				}
				
				
				
				
				// remove the column from the original table if it is versioned
				if (colSchema.hasOwnProperty('versioned') && colSchema.versioned === true) {
					delete schema[tableName][colName];
				}
				
			});
		});
		
		
		return schema;
	}
	
	
	
	return {
		prepareSchema: prepareSchema
	};
};