// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: SQL utils
//


module.exports = function(config) {
	
	// constants
	var _JTYP = config.statics.jsTypes;
	var _SCMR = config.statics.schemer;
	var _VER  = config.statics.version;

	// modules
	var utils = config.utils;
	
	// unique queries or settings that are database specific go here
	// only supported knex databases
	var specific = {
		mysql: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		postgres: {
			regex: function(compareTo, regex) {
				return compareTo + " ~ '" + regex + "' AND ";
			},
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		maria: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		sqlite3: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		oracle: {
			"regex": function(compareTo, regex) {
				return "REGEXP_LIKE(" + compareTo + ",'" + regex + "') AND ";
			},
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		}
	};
	
	
	
	// function to get SQL to filter a specific version
	function getVersionFilter(model, timestamp, fetchOpts) {
	
		var valid_from = timestamp;
		var valid_to   = timestamp;
		var version    = fetchOpts.version;
		
		// check for an object in the fetchOpts version
		if (typeof(fetchOpts.version) === _JTYP.object) {
			
			// check for valid from value
			if (version.hasOwnProperty(_VER.child.validFrom) &&
					utils.validate.validValue(_SCMR.type.dateTime, version.validFrom) &&
					version.validFrom.toString().match(/\D/) !== null) {
				valid_from = version.validFrom;
			}
			
			// check for  valid to value
			if (version.hasOwnProperty(_VER.child.validTo) &&
					utils.validate.validValue(_SCMR.type.dateTime, version.validTo) &&
					version.validTo.toString().match(/\D/) !== null) {
				valid_to   = version.validTo;
			}
		}
		
		// check for a string in the version
		else if (typeof(fetchOpts.version) === _JTYP.string &&
				utils.validate.validValue(_SCMR.type.dateTime, version) &&
				version.toString().match(/\D/) !== null) {
			
			// set the valid version range to the passed time
			valid_from     = version;
			valid_to       = version;
		}
		
		// check for the draft version
		if(fetchOpts.version === _VER.draft) {
			return utils.string.parse(' `%s`.`version` = \'%s\' ', model, version);
		}
		
		// otherwise use the range that was 
		else {
			return utils.string.parse(' `%s`.`valid_from` <= \'%s\' and ' +
					'(`%s`.`valid_to` >= \'%s\' or `%s`.`valid_to` is NULL) ',
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
		
		// try to the UUIDs and date from the database
		return _q.then(function(results) {
			if (results.length > 0 && results[0].length > 0) {
				return results[0][0];
			}
			
			return utils.util.getServerTime();
		});
	}
	
	// return public functions
	return {
		specific: specific,
		getVersionFilter: getVersionFilter,
		getTime: getTime
	};
};