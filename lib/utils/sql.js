// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: SQL utils
//


module.exports = function(config) {
	
	// constants
	var _JTYP  = config.statics.jsTypes;
	var _SCMR  = config.statics.schemer;
	var _VER   = config.statics.version;

	// modules
	var _      = config.lodash;
	var moment = config.moment;
	var dbType = config.bookshelf.knex.client.config.client;
	var utils  = config.utils;
	var u      = utils.util;
	
	// unique queries or settings that are database specific go here
	// only supported knex databases
	// 
	// Credits:
	// ** epoch time: https://shafiqissani.wordpress.com/2010/09/30/how-to-get-the-current-epoch-time-unix-timestamp/
	// ** epoch time: http://currentmillis.com/
	// ** mysql in miliseconds: http://stackoverflow.com/questions/9624284/current-timestamp-in-milliseconds
	// ** sqlite3 uuid: http://ask.webatall.com/sqlite/11700_is-there-uid-datatype-in-sqlite-if-yes-then-how-to-generate-value-for-that.html
	//
	var specific = {
		mysql: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			utcSeconds: 'round(unix_timestamp(curtime(4)) * 1000)',
			uuid: 'uuid()',
			tsFormat: 'YYYY-MM:DDTHH:mm:ss z'
		},
		postgres: {
			regex: function(compareTo, regex) {
				return compareTo + " ~ '" + regex + "' AND ";
			},
			utcSeconds: 'round(extract(epoch FROM now()) * 1000)',
			uuid: 'uuid_generate_v1()',
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		maria: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			utcSeconds: 'round(unix_timestamp(curtime(4)) * 1000)',
			uuid: 'uuid()',
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		sqlite3: {
			regex: function(compareTo, regex) {
				return compareTo + " REGEXP '" + regex + "' AND ";
			},
			utcSeconds: '(datetime(\'now\', \'unixepoch\') * 1000)',
			uuid: '(SELECT SUBSTR(UUID, 0, 8)||\'-\'||SUBSTR(UUID,8,4)||\'-\'||SUBSTR(UUID,12,4)||\'-\'||SUBSTR(UUID,16) from (select lower(hex(randomblob(16))) AS UUID)',
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		},
		oracle: {
			"regex": function(compareTo, regex) {
				return "REGEXP_LIKE(" + compareTo + ",'" + regex + "') AND ";
			},
			utcSeconds: '(SELECT (SYSDATE - TO_DATE(\'01-01-1970 00:00:00\', \'DD-MM-YYYY HH24:MI:SS\')) * 24 * 60 * 60 * 1000 FROM DUAL)',
			uuid: '(select sys_guid() from dual)',
			tsFormat: 'YYYY-MM:DD HH:mm:ss z'
		}
	};
	
	
	// get the specific SQL variables
	function getSpecific() {
		
		// check that there is a type in the database, default to MYSQL
		var type = _.has(specific, dbType) ? dbType : 'mysql';
		return specific[type];
	}
	
	
	// function to get SQL to filter a specific version
	function getVersionFilter(idAttr, pModel, cModel, timestamp, fetchOpts, parent) {
	
		var valid_from = timestamp;
		var valid_to   = timestamp;
		var version    = fetchOpts.version;
		
		// check for an object in the fetchOpts version
		if (version && typeof(version) === _JTYP.object) {
			
			// check for valid from value
			if (_.has(version, _VER.child.validFrom)) {
				valid_from = u.resolveDate(version.validFrom);
			}
			
			// check for  valid to value
			if (_.has(version, _VER.child.validTo)) {
				valid_to   = u.resolveDate(version.validTo);
			}
		}
		
		// check for a string in the version
		else if (version) {

			// set the valid version range to the passed time
			valid_from     = u.resolveDate(version);
			valid_to       = valid_from;
		}

		
		// check for the draft version
		if(fetchOpts.version === _VER.draft || fetchOpts._saving) {

			return utils.string.parse(
				' `%s`.`version` = \'%s\' ',
				cModel,
				_VER.draft
			);
		}
		
		// otherwise use the range that was 
		else {
			
			if (parent) {

				var uc = Array.isArray(fetchOpts.override) ? '' : '`' + pModel + '`.`use_current` = false and ';
				
				return utils.string.parse(
					' (`%s`.`%s` = `%s`.parent_id and ' +
					'((' + uc + ' `%s`.`valid_from` <= \'%s\' and ' +
					'(`%s`.`valid_to` >= \'%s\' or `%s`.`valid_to` is NULL)) or ' +
					'(`%s`.`use_current` = true and `%s`.`valid_from` <= \'%s\' and ' +
					'(`%s`.`valid_to` >= \'%s\' or `%s`.`valid_to` is NULL)))) ',
					pModel,
					idAttr,
					cModel,
					//pModel,
					cModel,
					valid_from,
					cModel,
					valid_to,
					cModel,
					pModel,
					cModel,
					timestamp,
					cModel,
					timestamp,
					cModel
				);
			}

			return utils.string.parse(
				' `%s`.`valid_from` <= \'%s\' and ' +
				'(`%s`.`valid_to` >= \'%s\' or `%s`.`valid_to` is NULL) ',
				cModel,
				valid_from,
				cModel,
				valid_to,
				cModel
			);
		}
	}
	
		
	// function to get the current time from the time source
	function getTime(fetchOpts) {
		
		// check for useServerTime options
		if (config.useServerTime === true) {
			return u.wrapPromise(u.getServerTime());
		}
		// if an ntp config exists, use ntp time
		else if (config.ntp) {
			return u.getNTPTime();
		}
		
		var _q;
		
		// get the specific commands to pull the UUID and date in epoch seconds
		var s   = getSpecific();
		var sql = utils.string.parse('SELECT %s AS uuid1, %s AS uuid2, %s AS date',
				  s.uuid, s.uuid, s.utcSeconds);
		
		// check for transacting
		if (_.has(fetchOpts, 'transacting')) {
			_q = config.knex
			.raw(sql)
			.transacting(fetchOpts.transacting);
		}
		else {
			_q = config.knex
			.raw(sql);
		}
		
		// try to the UUIDs and date from the database
		return _q.then(function(results) {

			var sysTime;
			
			// look for a sysTime object returned from the database
			if (results.length > 0 && results[0].length > 0 &&
					_.has(results[0][0], 'date') &&
					_.has(results[0][0], 'uuid1') &&
					_.has(results[0][0], 'uuid2')) {
				
				sysTime = results[0][0];
			}
			else {
				
				// otherwise use the server generated sysTime object
				console.log('Warning: Could not obtain SQL server time, defaulting to server time');
				sysTime = u.getServerTime();
			}
			
			// return the time
			return sysTime;
		});
	}
	
	// return public functions
	return {
		getSpecific: getSpecific,
		specific: specific,
		getVersionFilter: getVersionFilter,
		getTime: getTime
	};
};