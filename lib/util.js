// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//


module.exports = function(config) {
	
	
	var _         = config.lodash;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	
	
	// get the common property of 2 lists
	function getCommonPropValue(sourceList, compareList) {
		
		// check that both arguments are arrays
		if (!Array.isArray(sourceList) || !Array.isArray(compareList)) {
			return '';
		}
		
		
		// look through each source and evaluate against the compare list
		for (var i = 0; i < sourceList.length; i++) {
			for (var j = 0; j < compareList.length; j++) {
				if (sourceList[i] === compareList[j]) {
					return compareList[j];
				}
			}
		}
		
		// if the function did not return true by now, then there are no
		// common properties
		return '';
	}

	
	// function to get the primary keys for use as an id attribute
	function getIdAttribute(tableSchema) {

		// if the schema is not an object return an empty list
		if (typeof (tableSchema) !== 'object') {
			return [];
		}
		
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
	
	
	
	function compileViewFilter(view, table, schema, prefix) {
		
		var list = [];
		
		// make sure the table has a schema
		if (typeof (schema) === 'object' &&
				schema.hasOwnProperty(table) &&
				typeof (schema[table]) === 'object') {
			
			var tableSchema = schema[table];
			var cols        = Object.keys(tableSchema);
			
			for (var i = 0; i < cols.length; i++) {
				
				var colName   = cols[i];
				var colSchema = tableSchema[colName];
				var colKeys   = Object.keys(colSchema);
				
				if (colSchema.hasOwnProperty(constants.views) &&
						colSchema[constants.views].indexOf(view) !== -1) {
					
					colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
					
					list.push(colName);
					
					var rel = getCommonPropValue(colKeys, relations);
					
					if (colSchema.hasOwnProperty(rel)) {
						list = _.union(list, compileViewFilter(view, colSchema[rel], schema, colName));
					}
				}
			}
		}
		
		return list;
	}
	
	
	// return public functions
	return {
		getCommonPropValue: getCommonPropValue,
		compileViewFilter: compileViewFilter,
		getIdAttribute: getIdAttribute
	};
	
};