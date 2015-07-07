// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//


module.exports = function(config) {
	
	
	// shorten the passed variables
	var Promise   = config.promise;
	var _         = config.lodash;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	var models    = global._factoryModels;
	var OPTS      = schemer.constants.options;
	var TYPES     = schemer.constants.types;
	
	
	
	
	// check the fields
	function checkPayload(table, payload) {
		
		var schema       = models._schema;
		var tableSchema  = schema[table];
		
		// first loop through the payload and make sure all
		// of the required fields are present and set null values
		// for nullable columns
		_.forEach(tableSchema, function(colSchema, colName) {
			
			// check for required
			if (schemer.util.required(colSchema, colName) &&
					(!payload.hasOwnProperty(colName) ||
							payload[colName] === null)) {
				
				console.log('missing required field: ' + colName);
				return null;
			}

			// set the value, null for nullables with no value
			payload[colName] = payload[colName] || null;
			
		});
		
		// next look at all of the supplied fields and make sure they are actual 
		// fields and the correct type fields that dont exist get deleted
		_.forEach(payload, function(value, key) {
			
			// if the value does not exist in the keys, delete it
			if (!tableSchema.hasOwnProperty(key)) {
				console.log(key + ' is not a valid field, deleting');
				delete payload[key];
			}
			
			// check for relational properties
			else if (tableSchema[key].hasOwnProperty(constants.hasOne)) {
				console.log('do something here');
			}
			// check for relational properties
			else if (tableSchema[key].hasOwnProperty(constants.hasMany)) {
				console.log('do something here');
			}
			// check for relational properties
			else if (tableSchema[key].hasOwnProperty(constants.belongsTo)) {
				console.log('do something here');
			}
			// check for relational properties
			else if (tableSchema[key].hasOwnProperty(constants.belongsToMany)) {
				console.log('do something here');
			}
			
			else {
				
				// check that 
				if (value.hasOwnProperty(OPTS.type) && !validValue(value)) {
					return null;
				}
				
			}
		});
		
		

		// if nothing failed, the payload is ok
		return payload;
	}
	
	
	
	
	
	// function to validate that the data type provided matches the
	// defined type
	function validValue(type, value) {
		
		// check for string types
		if ((type === TYPES.string ||
				type === TYPES.text ||
				type === TYPES.binary ||
				type === TYPES.uuid) &&
				typeof(value) !== 'string') {
			return false;
		}
		
		// check for integer types
		else if ((type === TYPES.integer || type === TYPES.bigInteger) && !isNumber(value)) {
			return false;
		}
		
		// check for decimal types
		else if ((type === TYPES.float || type === TYPES.decimal) && !isDecimal(value)) {
			return false;
		}
		
		// check for boolean
		else if (type === TYPES.boolean && !isBoolean(value)) {
			return false;
		}
		
		
		// check for date related
		else if ((type === TYPES.datetime || type === TYPES.date || type === TYPES.timestamp) &&
				!isDate(value)) {
			return false;
		}
		
		// check for time
		else if (type === TYPES.time && !isTime(value)) {
			return false;
		}
		
		// check for json type
		else if (type === TYPES.json && !isJSON(value)) {
			return false;
		}
		
		
		// if no failures then valid
		return true;
		
	}
	
	
	
	
	
	// check if the value is a number or can be parsed to a number
	function isNumber(value) {
		return (typeof(value) === 'number' ||
				(typeof(value) === 'string' && !isNaN(parseInt(value, 10))));
	}
	
	
	
	
	
	// check for decimal
	function isDecimal(value) {
		return (typeof(value) === 'number' ||
				(typeof(value) === 'string' && !isNaN(parseFloat(value, 10))));
	}
	
	
	
	
	
	// check for boolean
	function isBoolean(value) {
		return (typeof(value) === 'boolean' ||
				(typeof(value) === 'number' && (value === 1 || value === 0)) ||
				(typeof(value) === 'string' && (value.toLowerCase() === 'true' ||
						value.toLowerCase() === 'false' || value === '1' || value === '0')));
	}
	
	
	
	
	
	// check for date
	function isDate(value) {
		return (value instanceof Date ||
				(typeof(value) === 'string' && !isNaN(Date.parse(value))));
	}
	
	
	
	
	
	// check for time
	function isTime(value) {
		return (typeof(value) === 'string' && !isNaN(Date.parse('1981-08-03 ' + value)));
	}
	
	
	
	
	
	// check for json object
	function isJSON(value) {
		
		try {
			if (typeof (value) === 'object') {
				value = JSON.stringify(value);
			}
			
			JSON.parse(value);
			return true;
		}
		catch(e) {
			return false;
		}
	}
	
	
	
	
	
	// for returning a status instead of an object. can be used to speed up save operations
	function statusPromise(code) {

		return new Promise(function(resolve) {
			resolve(code);
		});
	}
	
	
	
	
	
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
	
	
	
	
	
	// creates a list of properties to use when filtering the model
	// the list is then used by dotprune to prune the unwanted properties
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
				
				
				// check if the current column has a views property and that
				// its value contains the view specified
				if (colSchema.hasOwnProperty(constants.views) &&
						colSchema[constants.views].indexOf(view) !== -1) {
					
					
					// check if the column is a relation column
					var rel = getCommonPropValue(colKeys, relations);
					
					
					// update the prefix for nested tables
					colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
					list.push(colName);
					
					
					// if the column is a relation column, recursively get views and add them
					// to the list by merging the results
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
		getIdAttribute: getIdAttribute,
		statusPromise: statusPromise,
		checkPayload: checkPayload
	};
	
};