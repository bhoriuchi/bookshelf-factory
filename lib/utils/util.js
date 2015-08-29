// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: misc utils
//


module.exports = function(config) {
	
	// constants
	var _JTYP   = config.statics.jsTypes;
	var _INFO   = config.statics.info;
	var _STAT   = config.statics.httpStatus;
	
	// modules
	var Promise = config.promise;
	var uuid    = config.uuid;
	var _       = config.lodash;
	
	
	// function to build an id list
	function getIdList(idList, model) {
		
		var _ids;
		
		// check that there is an id to remove
		if (!idList && !model.results) {
			model.results = wrapPromise(_STAT.BAD_REQUEST);
			_ids = wrapPromise([]);
		}
		else if (!idList && model.results) {
			_ids = model.results;
		}
		else {
			_ids = wrapPromise(idList);
		}
		
		// return the ids
		return _ids.then(function(ids) {
			
			// put the id into an array if it is not already
			ids = Array.isArray(ids) ? ids : [ids];
			
			// convert the array to an array of unique IDs
			ids = _.uniq(
				_.map(ids, function(value) {
					if (value && typeof(value) === _JTYP.object &&
							value.hasOwnProperty(model.idAttribute)) {
						return value[model.idAttribute];
					}
					else if (value) {
						return value;
					}
				})
			);
			
			return ids;
		});
	}
	
	
	
	// function to check the object signature and verify that is is an error
	function isErr(obj) {
		
		if (obj && typeof(obj) === _JTYP.object &&
				!Array.isArray(obj) &&
				Object.keys(obj).length === 4 &&
				obj.hasOwnProperty(_INFO.code) &&
				obj.hasOwnProperty(_INFO.message) &&
				obj.hasOwnProperty(_INFO.error) &&
				obj.hasOwnProperty(_INFO.details)) {
			return true;
		}
		return false;
	}
	
	
	// function to create a new error
	function newErr(code, message, error, details) {
		
		// put the details into an array if they are not one
		details = details || [];
		details = Array.isArray(details) ? details : [details];
		
		return {
			code: code,
			message: message,
			error: error,
			details: details
		};
	}
	
	
	// create a new object with optional values set
	function newObj(field, value) {
		
		var obj = {};
		
		if (field) {
			obj[field] = value || null;
		}
		
		return obj;
	}
	
	
	// for returning a status instead of an object. can be used to speed up save operations
	function wrapPromise(result) {

		return new Promise(function(resolve) {
			resolve(result);
		});
	}
	
	
	// function to check if a property exists and if it is true, allows .notation
	function is(object, path) {
		return _.has(object.path) && _.get(object.path) === true;
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
	
	
	// function to conver value to boolean
	function toBoolean(value) {
		var strValue = String(value).toLowerCase();
		strValue = ((!isNaN(strValue) && strValue !== '0') &&
				strValue !== '' &&
				strValue !== 'null' &&
				strValue !== 'undefined') ? '1' : strValue;
		return strValue === 'true' || strValue === '1' ? true : false;
	}
	
	
	// function to get the server time and a uuid
	function getServerTime() {
		
		var date  = new Date();
		var uuid1 = uuid.v1({
			msecs: (new Date()).getTime()
		});
		var uuid2 = uuid.v1({
			msecs: (new Date()).getTime()
		});
		return {
			date: date,
			uuid1: uuid1,
			uuid2: uuid2
		};
	}
	
	
	// return public functions
	return {
		wrapPromise: wrapPromise,
		getCommonPropValue: getCommonPropValue,
		toBoolean: toBoolean,
		getServerTime: getServerTime,
		is: is,
		newObj: newObj,
		isErr: isErr,
		newErr: newErr,
		getIdList: getIdList
	};
};