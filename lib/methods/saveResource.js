// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	
	// shorten the modules
	var Bookshelf  = config.bookshelf;
	var schemer    = config.schemer;
	var promise    = config.promise;
	var utils      = config.utils;
	var constants  = config.constants;
	var relations  = config.relations;
	var _          = config.lodash;
	var relutil    = config.utils.relation;
	var STATUS     = constants.statusCodes;
	var models     = global._factoryModels;
	var schema     = models._schema;
	
	
	// return the function
	return function(obj, fetchOpts, jsonOpts) {

		// set defaults and variables
		var _self        = this;
		var payloadOpts  = {};
		var tableName    = this.tableName;
		var keep         = this._keep;
		var _ts          = null;
		var schema       = global._factoryModels._schema;
		var tableSchema  = schema[tableName];
		var idAttr       = utils.schema.getIdAttribute(tableSchema);
		var pkg, _op, _transaction;
		
		
		// check if save is a multi-save
		var multi        = Array.isArray(obj);
		
		// to support multiple updates read the body as
		// an array even if there is only 1 object
		obj = multi ? obj : [obj];
		
		// set default values
		fetchOpts      = fetchOpts || {};
		jsonOpts       = jsonOpts  || { omitPivot: true };
		
		
		// check for an ignore of invalid values in the payload
		payloadOpts.ignoreInvalid = fetchOpts.hasOwnProperty('ignoreInvalid') ?
				                    fetchOpts.ignoreInvalid : false;
		
		// set the managed check after evaluating the fetch options
		payloadOpts.managedCheck  = fetchOpts.hasOwnProperty('_managedCheck') ?
				                    fetchOpts._managedCheck : true;
		
		
		// check if a time stamp is required. if it is, attempt to get it from the DB
		// if its not, then wrap the server time in a promise. this avoids making an
		// unnecessary database query for the time and two UUIDs
		if (utils.schema.requiresTimestamp(schema[tableName])) {
			_ts = utils.sql.getTime(fetchOpts);
		}
		else {
			_ts = utils.util.wrapPromise(utils.util.getServerTime());
		}
		
		
		// start the save
		_self.results = _ts.then(function(sysTime) {
			
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
				if (fetchOpts.hasOwnProperty('transacting')) {
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
				// catch any errors and print an error message
				.caught(function(e) {
					return utils.util.wrapPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
				});
			}
			
			// if the payload was invalid for any reason, send a bad request status
			else {
				return utils.util.wrapPromise(
					_.merge(STATUS.BAD_REQUEST, {details: pkg.details})
				);
			}
		});
		
		return _self;
	};
};