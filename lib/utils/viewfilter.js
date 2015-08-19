// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: view filter
//


module.exports = function(config) {
	
	var constants = config.constants;
	var utils     = config.utils;
	var relations = config.relations;
	var _         = config.lodash;
	
	
	// creates a list of properties to use when filtering the model
	// the list is then used by dotprune to prune the unwanted properties
	function filter(view, table, schema, prefix) {
		
		
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
				
				
				// check if the current column has a views property and that
				// its value contains the view specified
				if (colSchema.hasOwnProperty(constants.views) &&
						colSchema[constants.views].indexOf(view) !== -1) {
					
					
					// check if the column is a relation column
					var rel = utils.util.getCommonPropValue(colKeys, relations);
					
					
					// update the prefix for nested tables
					colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
					list.push(colName);
					
					
					// if the column is a relation column, recursively get views and add them
					// to the list by merging the results
					if (colSchema.hasOwnProperty(rel)) {
						list = _.union(list, filter(view, colSchema[rel], schema, colName));
					}
				}
			}
		}
		
		return list;
	}
	
	
	// expose function
	return function(view, table, schema, prefix) {
		
		// call recursive filter function
		return filter(view, table, schema, prefix);
	};
};