// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	// constants
	var _STAT            = config.statics.httpStatus;
	var _FOPT            = config.statics.fetchOpts;
	var _ERR             = config.statics.errorCodes;
	
	// modules
	var Bookshelf        = config.bookshelf;
	var utils            = config.utils;
	var u                = utils.util;
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {

		// runtime variables
		var models       = global._factoryModels;
		var schema       = models._schema;
		
		// set defaults and variables
		var _self        = this;
		var payloadOpts  = {};
		var tableName    = _self.tableName;
		var keep         = _self._keep;
		var tableSchema  = schema[tableName];
		var idAttr       = utils.schema.getIdAttribute(tableSchema);
		var pkg, _op, _ts;
		
		
		// check if save is a multi-save
		var multi        = Array.isArray(obj);
		
		// to support multiple updates read the body as
		// an array even if there is only 1 object
		obj = multi ? obj : [obj];
		
		// set default values
		fetchOpts        = fetchOpts || {};
		jsonOpts         = jsonOpts  || { omitPivot: true };
		
		
		// check for an ignore of invalid values in the payload
		payloadOpts.ignoreInvalid = fetchOpts.hasOwnProperty(_FOPT.ignoreInvalid) ?
				                    fetchOpts.ignoreInvalid : false;
		
		// set the managed check after evaluating the fetch options
		payloadOpts._managedCheck = fetchOpts.hasOwnProperty(_FOPT._managedCheck) ?
				                    fetchOpts._managedCheck : true;
		
		
		// check if a time stamp is required. if it is, attempt to get it from the DB
		// if its not, then wrap the server time in a promise. this avoids making an
		// unnecessary database query for the time and two UUIDs
		if (utils.schema.requiresTimestamp(schema[tableName])) {
			_ts = utils.sql.getTime(fetchOpts);
		}
		else {
			_ts = u.wrapPromise(u.getServerTime());
		}
		
		
		// start the save
		_self.results = _ts.then(function(sysTime) {
			
			// update the date to utc
			sysTime.date = config.moment.utc(sysTime.date);
			
			// get the payload package
			pkg = utils.payload.preparePayload(tableName, obj, sysTime, payloadOpts);
			
			// check that the payload package is valid
			if (pkg.valid) {
				
				// create an object to send to the save function
				var saveOpts = {
					keep: keep,
					idAttr: idAttr,
					models: models,
					fetchOpts: fetchOpts,
					jsonOpts: jsonOpts,
					packages: pkg.payloads
				};

				// check if a transaction exists in the fetchOpts which means
				// that this save has been called from a parent save
				if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
					_op = utils.save(saveOpts)(fetchOpts.transacting);
				}
				
				// otherwise create a new transaction and call save
				else {
					_op = Bookshelf.transaction(utils.save(saveOpts));
				}
				
				// execute operation and get the results
				return _op.then(function(results) {

					// if a single object was passed as the payload
					// return a single object otherwise all objects
					if (!multi) {
						return results[0];
					}
					return results;
				})
				// catch any errors and wrap them in a promise
				.caught(function(err) {
					return u.wrapPromise(err);
				});
			}
			
			// if the payload was invalid for any reason, send a bad request status
			else {
				return u.wrapPromise(
					u.newErr(
						_STAT.BAD_REQUEST.code,
						_ERR.BAD_REQUEST_BODY.message,
						_ERR.BAD_REQUEST_BODY.code,
						pkg.details
					)
				);
			}
		});
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.saveResource
		};
		return _self;
	};
};