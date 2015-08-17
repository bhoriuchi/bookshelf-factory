// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: search util functions
//


module.exports = function(config) {

	
	var _    = config.lodash;
	var util = config.util;
	
	
	// unique queries or settings that are database specific go here
	// only supported knex databases
	var specific = {
			"mysql": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"postgres": {
				"regex": function(compareTo, regex) {
					return compareTo + " ~ '" + regex + "' AND ";
				}
			},
			"maria": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"sqlite3": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"oracle": {
				"regex": function(compareTo, regex) {
					return "REGEXP_LIKE(" + compareTo + ",'" + regex + "') AND ";
				}
			}
	};
	
	

	
	// generate a concat string of searchable columns
	function getColumnConcatSQL(schema, searchable) {
		
		var sql = '';
		
		// make searchable into an array
		searchable = searchable || [];
		searchable = Array.isArray(searchable) ? searchable : [];
		
		// check that the schema is an object
		if (typeof(schema) === 'object' && schema !== null) {
			
			// filter the schema into fields that have a type. these will 
			// be the fields with a type attribute that are not ignored
			var filtered = util.getColumns(schema);
			
			// get the sql
			_.forEach(filtered, function(colSchema, colName) {
				
				// check for searchable
				if (_.contains(searchable, colName) || searchable.length === 0) {
					sql += ',`' + colName + '`';
				}
			});
		}
		
		return "concat_ws('|'" + sql + ")";
	}
	
	
	
	// get search type
	function searchType(type) {
		
		// define search types
		var types = ['basic', 'regex'];
		
		// check that the type is a string
		if (type && typeof(type) === 'string') {
			
			// check that the type is in the valid types array, default to basic
			return (_.intersection(types, [type.toLowerCase()]).length > 0) ? type : 'basic';	
		}
		
		// by default return basic type
		return 'basic';
	}
	
	
	
	
	
	
	// return public
	return {
		specific: specific,
		searchType: searchType,
		getColumnConcatSQL: getColumnConcatSQL
	};
	
};