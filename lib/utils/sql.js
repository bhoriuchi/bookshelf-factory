// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: sql utils
//


module.exports = function(config) {
	
	var TYPE  = config.schemer.constants.type;
	var utils = config.utils;
	
	
	// function to get SQL to filter a specific version
	function getVersionFilter(model, timestamp, fetchOpts) {
	
		var valid_from = timestamp;
		var valid_to   = timestamp;
		var version    = fetchOpts.version;
		
		// check for an object in the fetchOpts version
		if (typeof(fetchOpts.version) === 'object') {
			
			// check for valid from value
			if (version.hasOwnProperty('validFrom') &&
					utils.validate.validValue(TYPE.dateTime, version.validFrom) &&
					version.validFrom.toString().match(/\D/) !== null) {
				valid_from = version.validFrom;
			}
			
			// check for  valid to value
			if (version.hasOwnProperty('validTo') &&
					utils.validate.validValue(TYPE.dateTime, version.validTo) &&
					version.validTo.toString().match(/\D/) !== null) {
				valid_to   = version.validTo;
			}
		}
		
		// check for a string in the version
		else if (typeof(fetchOpts.version) === 'string' &&
				utils.validate.validValue(TYPE.dateTime, version) &&
				version.toString().match(/\D/) !== null) {
			
			// set the valid version range to the passed time
			valid_from     = version;
			valid_to       = version;
		}
		
		// check for dev version
		if(fetchOpts.version === 0) {
			
			return utils.string.parse(' `%s`.`version` = \'%s\' ', model, version);
		}
		
		// otherwise use the range that was 
		else {
			
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and (`%s`.`valid_to` >= \'%s\' or `%s`.`valid_to` is NULL) ',
					model, valid_from, model, valid_to, model);
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