// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: view filter
//


module.exports = function(config) {

	// constants
	var _JTYP     = config.statics.jsTypes;
	var _SCMA     = config.statics.schema;
	
	// modules
	var utils     = config.utils;
	var relations = config.relations;
	var _         = config.lodash;
	
	
	
	// returns the elements of the next view if dot notation has been used
	function nextView(field, keep) {
		
		var k = [];
		
		_.forEach(keep, function(path) {
			
			// check for not
			var not = (path.length > 1 && path[0] === '!') ? '!' : '';
			path = path.replace('!', '').split('.');
			
			// check that there is more to the path and that the current path
			// matches the field
			if (path.length > 1 && path[0] === field) {
				k.push(not + _.takeRight(path, path.length - 1).join('.'));
			}
		});
		
		return k;
	}

	
	// function to filter relations
	function filterRelated(model, withRelated) {
		
		var k = [];
		
		// if the keep array is empty, or not an array, everything is kept
		if (!Array.isArray(model._keep) || model._keep.length === 0) {
			return withRelated;
		}
		
		// loop through each keep value
		_.forEach(model._keep, function(field) {
			
			// split the fields dot notation
			var path = field.split('.');
			
			// if the value is a not path and there are no more levels to the
			// field path, you can delete it
			if (field.length > 1 && field[0] === '!' && path.length === 1) {
				withRelated = _.without(withRelated, path[0]);
			}
			else {

				k.push(path[0].replace('!', ''));
			}
		});
		
		// loop through the withRelated and remove any
		// that do not exist in the k array
		_.forEach(withRelated, function(relation) {
			if (!_.contains(k, relation)) {
				withRelated = _.without(withRelated, relation);
			}
		});
		
		return withRelated;
	}
	
	
	// creates a list of properties to use when filtering the model
	// the list is then used by dotprune to prune the unwanted properties
	function filter(view, table, schema, prefix) {
		
		
		var list = [];
		
		// make sure the table has a schema
		if (typeof (schema) === _JTYP.object &&
				schema.hasOwnProperty(table) &&
				typeof (schema[table]) === _JTYP.object) {
			
			var tableSchema = schema[table];
			var cols        = Object.keys(tableSchema);
			
			
			for (var i = 0; i < cols.length; i++) {
				
				
				var colName   = cols[i];
				var colSchema = tableSchema[colName];
				var colKeys   = Object.keys(colSchema);
				
				
				// check if the current column has a views property and that
				// its value contains the view specified
				if (colSchema.hasOwnProperty(_SCMA.views) &&
						colSchema.views.indexOf(view) !== -1) {
					
					
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
	
	
	// rturn functions
	return {
		filter: filter,
		filterRelated: filterRelated,
		nextView: nextView
	};
};