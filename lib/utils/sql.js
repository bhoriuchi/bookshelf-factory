// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: sql utils
//


module.exports = function(config) {
	
	var TYPE  = config.schemer.constants.type;
	var utils = config.utils;
	
	
	// function to get SQL to filter a specific version
	function getVersionFilter(model, timestamp, fetchOpts) {
	
		// check for datetime
		if (fetchOpts.hasOwnProperty('version') &&
				utils.validate.validValue(TYPE.dateTime, fetchOpts.version) &&
				fetchOpts.version.toString().match(/\D/) !== null) {
			
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and `%s`.`valid_to` >= \'%s\' ',
					model, fetchOpts.version, model, fetchOpts.version);
		}
		
		/* DEPRECATED - since versioning is based on time slices, there is potential to have
		 * several versioned object relationships during a single parent versions valid time
		 * using a number based version would either return objects all of the same version
		 * but not necessarily valid during the same time period, or multiple versions of
		 * a related object to 1 parent object. long story short, this cannot be done
		// check for integer
		else if(fetchOpts.hasOwnProperty('version') &&
				utils.validate.validValue(TYPE.integer, fetchOpts.version)) {
			
			return utils.string.parse(' `%s`.`version` = \'%s\' ', model, fetchOpts.version);
		}*/
		
		
		// default to current version
		else {
			
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and `%s`.`valid_to` >= \'%s\' ',
					model, timestamp, model, timestamp);
		}
	}
	
		
	// function to get the current time from the time source
	function getTime(fetchOpts) {
		
		var _q;
		
		if (fetchOpts.hasOwnProperty('transacting')) {
			_q = config.knex
			.raw('SELECT UUID() AS uuid1, UUID() AS uuid2, UTC_TIMESTAMP() AS date')
			.transacting(fetchOpts.transacting);
		}
		else {
			_q = config.knex
			.raw('SELECT UUID() AS uuid1, UUID() AS uuid2, UTC_TIMESTAMP() AS date');
		}
		
		
		// try to the uuids and date from the database
		return _q.then(function(results) {
			if (results.length > 0 && results[0].length > 0) {
				return results[0][0];
			}
			
			return utils.util.getServerTime();
		});
	}
	
	// return public functions
	return {
		getVersionFilter: getVersionFilter,
		getTime: getTime
	};
	
};