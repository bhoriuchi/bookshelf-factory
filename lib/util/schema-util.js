// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//



module.exports = function(config) {
	
	var util      = config.util;
	var constants = config.constants;
	var schemer   = config.schemer;
	var relations = config.relations;
	var OPTS      = schemer.constants.options;
	

	
	
	
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
		
		
		var tables = Object.keys(schema);
		
		
		// loop through each table
		for (var i = 0; i < tables.length; i++) {
			
			
			var tableName   = tables[i];
			var tableSchema = schema[tableName];
			var cols        = Object.keys(tableSchema);
			
			
			// loop through each column
			for (var j = 0; j < cols.length; j++) {
				
				
				var colName    = cols[j];
				var colSchema  = tableSchema[colName];
				var fields     = Object.keys(colSchema);
				var relTable   = null;
				var foreignKey = null;
				var otherKey   = null;
				var relPk      = null;
				var myPk       = null;
				
				
				// check for relations
				var relType = util.getCommonPropValue(relations, fields);
				
				
				// check if there was a relationship type and get common relationship variables
				if (relType !== '') {
					
					
					// try to get the primary key of this object as well as the related table name
					myPk     = schemer.manager.getPrimaryKeys(tableSchema);
					relTable = colSchema[relType];
					
					
					// check that the table has a primary key
					if (myPk.length === 0) {
						console.log('INFO - ' + relType + ' relationship on model ' +
								tableName + ', column ' + colName +
								' but no primary key was found, exiting');
						return null;
					}
					
					
					// check if the table is defined in the schema
					if (!schema.hasOwnProperty(relTable)) {
						
						console.log('INFO - ' + relType + ' relationship on model ' +
								tableName + ' column ' + colName + ' points to table ' +
								relTable + ' but it does not exist, exiting');
						
						return null;
					}
					
					
					// get the primary key for the related table
					relPk = schemer.manager.getPrimaryKeys(schema[relTable]);
					
					
					// check that the related table has primary keys
					if (relPk.length === 0) {
						console.log('INFO - ' + relType + ' relationship on model ' +
								tableName + ' column ' + colName + ' points to table ' +
								relTable + ', but no primary key was found on ' +
								relTable + ', exiting');
						return null;
					}
					
					
					// add nullable to the field if not explicitly defined
					if (!colSchema.hasOwnProperty(OPTS.nullable)) {
						schema[tableName][colName][OPTS.nullable] = true;
					}
				}
				
				
				
				
				// belongsToMany relation
				if (colSchema.hasOwnProperty(constants.belongsToMany)) {
					
					
					// create the junction table name if it doesn't exist
					var junction = colSchema[constants.junction] || [tableName, relTable].sort().join('_');
					
					
					// get or determine the foreign key and other key
					otherKey   = colSchema[constants.otherKey] || relTable + '_' + relPk.join('_');
					foreignKey = colSchema[constants.foreignKey] || tableName + '_' + myPk.join('_');
					

					// check for the junction table, create it if it doesnt exist
					if (!schema.hasOwnProperty(junction)) {
						schema[junction] = {};
					}
					
					
					// check for foreign key, create if doesnt exist
					if (!schema[junction].hasOwnProperty(foreignKey)) {
						
						schema[junction][foreignKey] = getPrimarySchema(tableSchema[myPk[0]]);
					}
					
					
					// check for other key, create if doesnt exist
					if (!schema[junction].hasOwnProperty(otherKey)) {
						
						schema[junction][otherKey] = getPrimarySchema(schema[relTable][relPk[0]]);
					}
					
					
					// set the schema for the current table relation
					schema[tableName][colName][constants.foreignKey] = foreignKey;
					schema[tableName][colName][constants.junction]   = junction;
					schema[tableName][colName][constants.otherKey]   = otherKey;
				}
				
				
				
				
				
				// belongsTo relation
				else if (colSchema.hasOwnProperty(constants.belongsTo)) {
					
					// create the foreign key
					foreignKey = colSchema[constants.foreignKey] || relTable + '_' + relPk.join('_');
					
					// verify that the current table has the foreign key defined on itself
					if (!schema[tableName].hasOwnProperty(foreignKey)) {
						schema[tableName][foreignKey] = getPrimarySchema(schema[relTable][relPk[0]]);
						
						if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
							schema[tableName][foreignKey][OPTS.nullable] = true;
						}

					}
					
					// set the foreignKey on the schema
					schema[tableName][colName][constants.foreignKey] = foreignKey;
				}


				
				
				
				// hasOne relation
				else if (colSchema.hasOwnProperty(constants.hasOne) ||
						colSchema.hasOwnProperty(constants.hasMany)) {
					
					// create the foreign key
					foreignKey = colSchema[constants.foreignKey] || tableName + '_' + myPk.join('_');
					
					// verify that the target table has the foreign key defined
					if (!schema[relTable].hasOwnProperty(foreignKey)) {
						schema[relTable][foreignKey] = getPrimarySchema(tableSchema[myPk[0]]);
						
						if (colSchema.hasOwnProperty(OPTS.nullable) && colSchema[OPTS.nullable]) {
							schema[relTable][foreignKey][OPTS.nullable] = true;
						}
					}
					
					// set the foreignKey on the schema
					schema[tableName][colName][constants.foreignKey] = foreignKey;
				}
				
				
			}
		}
		
		
		return schema;
	}
	
	
	
	return {
		prepareSchema: prepareSchema
	};
};