// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: validation utils
//


module.exports = function(config) {
	
	// constants
	var _JTYP   = config.statics.jsTypes;
	var _SCMR   = config.statics.schemer;
	var _SCMA   = config.statics.schema;
	
	// modules
	var Promise = config.promise;
	var utils   = config.utils;
	var u       = utils.util;
	
	// function to validate that the data type provided matches the
	// defined type
	function validValue(type, value) {
		
		
		// check for string types, or things that are entered as strings
		if ((type === _SCMR.type.string ||
				type === _SCMR.type.text ||
				type === _SCMR.type.binary ||
				type === _SCMR.type.uuid) &&
				typeof(value) !== _JTYP.string) {
			return false;
		}
		
		// check for integer types
		else if ((type === _SCMR.type.integer || type === _SCMR.type.bigInteger) &&
				!isNumber(value)) {
			return false;
		}
		
		// check for decimal types
		else if ((type === _SCMR.type.float || type === _SCMR.type.decimal) &&
				!isDecimal(value)) {
			return false;
		}
		
		// check for boolean
		else if (type === _SCMR.type.boolean && !isBoolean(value)) {
			return false;
		}
		
		// check for date related
		else if ((type === _SCMR.type.datetime ||
				type === _SCMR.type.date ||
				type === _SCMR.type.timestamp) &&
				!isDate(value)) {
			return false;
		}
		
		// check for time
		else if (type === _SCMR.type.time && !isTime(value)) {
			return false;
		}
		
		// check for JSON type
		else if (type === _SCMR.type.json && !isJSON(value)) {
			return false;
		}
		
		// if no failures then valid
		return true;
	}
	
	
	// check if the value is a number or can be parsed to a number
	function isNumber(value) {
		return (typeof(value) === _JTYP.number ||
				(typeof(value) === _JTYP.string &&
						!isNaN(parseInt(value, 10))));
	}
	
	
	
	
	
	// check for decimal
	function isDecimal(value) {
		return (typeof(value) === _JTYP.number ||
				(typeof(value) === _JTYP.string &&
						!isNaN(parseFloat(value, 10))));
	}
	
	
	
	
	
	// check for boolean
	function isBoolean(value) {
		
		
		
		return (typeof(value) === _JTYP.boolean ||
				(typeof(value) === _JTYP.number && (value === 1 || value === 0)) ||
				(typeof(value) === _JTYP.string && (value.toLowerCase() === 'true' ||
						value.toLowerCase() === 'false' || value === '1' || value === '0')));
	}
	
	
	
	
	
	// check for date
	function isDate(value) {
		return (value instanceof Date ||
				(typeof(value) === _JTYP.string && !isNaN(Date.parse(value))));
	}
	
	
	
	
	
	// check for time
	function isTime(value) {
		return (typeof(value) === _JTYP.string && !isNaN(Date.parse('1981-08-03 ' + value)));
	}
	
	
	
	
	
	// check for JSON object
	function isJSON(value) {
		
		try {
			if (typeof (value) === _JTYP.object) {
				value = JSON.stringify(value);
			}
			
			JSON.parse(value);
			return true;
		}
		catch(e) {
			return false;
		}
	}
	
	
	
	// function to validate that related entities exist
	// takes a model, the models idAttribute, and a list
	// of IDs to verify
	function verifyEntities(models, tableName, ids, t) {

		// runtime variables
		var schema      = models._schema;
		
		// check for managed
		var versioned   = schema[tableName].hasOwnProperty(_SCMA._managed);
		
		// update attributes
		tableName       = versioned ? schema[tableName]._managed.model : tableName;
		var idAttribute = utils.schema.getIdAttribute(schema[tableName]);

		var invalid = [];
		
		if (!Array.isArray(ids) || ids.length === 0) {
			return new Promise(function(resolve) {
				resolve([]);
			});
		}
		
		return Promise.each(ids, function(id) {
			
			var where = u.newObj(idAttribute, id);
			//where[idAttribute] = id;
			
			return models[tableName].forge()
			.where(where)
			.fetchAll({transacting: t})
			.then(function(results) {
				if (results.length < 1) {
					invalid.push(id);
				}
			});
		})
		.then(function() {
			return invalid;
		});
	}
	
	// return public functions
	return {
		validValue: validValue,
		isNumber: isNumber,
		isDecimal: isDecimal,
		isBoolean: isBoolean,
		isDate: isDate,
		isTime: isTime,
		isJSON: isJSON,
		verifyEntities: verifyEntities
		
	};
};