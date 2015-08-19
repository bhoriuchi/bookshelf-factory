// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: sql utils
//


module.exports = function(config) {
	
	var TYPE  = config.schemer.constants.type;
	var utils = config.utils;
	var uuid  = config.uuid;
	
	// function to get SQL to filter a specific version
	function getVersionFilter(model, timestamp, fetchOpts) {
	
		// check for datetime
		if (fetchOpts.hasOwnProperty('version') &&
				utils.validate.validValue(TYPE.dateTime, fetchOpts.version) &&
				fetchOpts.version.toString().match(/\D/) !== null) {
			
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and `%s`.`valid_to` >= \'%s\' ',
					model, fetchOpts.version, model, fetchOpts.version);
		}
		// check for integer
		else if(fetchOpts.hasOwnProperty('version') &&
				utils.validate.validValue(TYPE.integer, fetchOpts.version)) {
			
			return utils.string.parse(' `%s`.`version` = \'%s\' ', model, fetchOpts.version);
		}
		// default to current version
		else {
			
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and `%s`.`valid_to` >= \'%s\' ',
					model, timestamp, model, timestamp);
		}
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
	
	
	// function to get the current time from the time source
	function getTime() {
		
		// try to the uuids and date from the database
		return config.knex.raw('SELECT UUID() AS uuid1, UUID() AS uuid2, UTC_TIMESTAMP() AS date')
		.then(function(results) {
			if (results.length > 0 && results[0].length > 0) {
				return results[0][0];
			}
			
			return getServerTime();
		});
	}
	
	// return public functions
	return {
		getVersionFilter: getVersionFilter,
		getServerTime: getServerTime,
		getTime: getTime
	};
	
};