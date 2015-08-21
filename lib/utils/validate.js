// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: validation utils
//


module.exports = function(config) {
	
	var TYPE = config.schemer.constants.type;
	var promise = config.promise;
	
	
	// function to validate that the data type provided matches the
	// defined type
	function validValue(type, value) {
		
		
		// check for string types, or things that are entered as strings
		if ((type === TYPE.string ||
				type === TYPE.text ||
				type === TYPE.binary ||
				type === TYPE.uuid) &&
				typeof(value) !== 'string') {
			return false;
		}
		
		// check for integer types
		else if ((type === TYPE.integer || type === TYPE.bigInteger) && !isNumber(value)) {
			return false;
		}
		
		// check for decimal types
		else if ((type === TYPE.float || type === TYPE.decimal) && !isDecimal(value)) {
			return false;
		}
		
		// check for boolean
		else if (type === TYPE.boolean && !isBoolean(value)) {
			return false;
		}
		
		// check for date related
		else if ((type === TYPE.datetime || type === TYPE.date || type === TYPE.timestamp) &&
				!isDate(value)) {
			return false;
		}
		
		// check for time
		else if (type === TYPE.time && !isTime(value)) {
			return false;
		}
		
		// check for json type
		else if (type === TYPE.json && !isJSON(value)) {
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
	
	
	
	// function to validate that related entities exist
	// takes a model, the models idAttribute, and a list
	// of IDs to verify
	function verifyEntities(model, idAttribute, ids, t) {

		var invalid = [];
		
		if (!Array.isArray(ids) || ids.length === 0) {
			return new Promise(function(resolve) {
				resolve([]);
			});
		}
		
		
		return promise.each(ids, function(id) {
			
			var where = {};
			where[idAttribute] = id;
			
			return model.forge().where(where)
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