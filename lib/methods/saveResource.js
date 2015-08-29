// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	// constants
	var _JTYP            = config.statics.jsTypes;
	var _STAT            = config.statics.httpStatus;
	var _FOPT            = config.statics.fetchOpts;
	var _ERR             = config.statics.errorCodes;
	
	// modules
	var _                = config.lodash;
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
		var pkg, _op, _ts, _res;
		
		
		// check if save is a multi-save
		var multi        = Array.isArray(obj);
		
		// to support multiple updates read the body as
		// an array even if there is only 1 object
		obj = obj || [{}];
		obj = multi ? obj : [obj];
		
		// set default values
		fetchOpts        = fetchOpts || {};
		jsonOpts         = jsonOpts  || { omitPivot: true };
		
		
		// check for an ignore of invalid values in the pay-load
		payloadOpts.ignoreInvalid = fetchOpts.hasOwnProperty(_FOPT.ignoreInvalid) ?
				                    fetchOpts.ignoreInvalid : false;
		
		// set the managed check after evaluating the fetch options
		payloadOpts._managedCheck = fetchOpts.hasOwnProperty(_FOPT._managedCheck) ?
				                    fetchOpts._managedCheck : true;
		
		// check for the clone option
		if (fetchOpts.clone && _self.results && typeof(_self.results.then) === _JTYP.funct) {
			_res = _self.results;
		}
		else {
			_res = u.getIdList(null, _self);
		}
		
		
		// check for previous results 
		_self.results = _res.then(function(ids) {

			ids = Array.isArray(ids) ? ids : [ids];
			
			// if cloning remove the ids from the result and store as the
			// object
			if (fetchOpts.clone && ids) {

				// remove the ids
				obj = _.map(ids, function(value) {
					
					var out = _.omit(value, idAttr);
					
					// if temporal, remove all of the system
					// data that relates to temporal objects
					if (tableSchema._managed) {
						delete out.published;
						delete out.version;
						delete out.valid_from;
						delete out.valid_to;
						delete out.change_notes;
					}
					
					return out;
				});
			}
			// if there were previous results, add the passed object
			// has no IDs specified. if there are IDs specified, we will
			// assume that the user is trying to make an update to specific
			// resources. also check that if there is 1 object, use that
			// object to update all previous results, or if there are
			// an equal number of objects, update each with
			else if (ids.length > 0 &&
					_.filter(obj, function(v) {
						return v.hasOwnProperty(idAttr);
					}).length === 0 &&
					!fetchOpts.clone) {
				
				// if equal IDs as objects, interpret as 1:1 update
				if (obj.length === ids.length) {

					for (var i = 0; i < ids.length; i++) {
						obj[i][idAttr] = ids[i];
					}
				}
				// otherwise bulk update each result with the update
				else {
					
					// clone the data
					var uObj = _.clone(obj[0], true);
					
					// clear the original object
					obj = {};
					
					// for each id, create an update
					_.forEach(ids, function(id) {
						obj.push(_.merge(u.newObj(idAttr, id), uObj));
					});
				}
			}
			
			return utils.payload
			.preparePayload(tableName, obj, payloadOpts)
			.then(function(pkg) {
				
				// check that the pay-load package is valid
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

						// if a single object was passed as the pay-load
						// return a single object otherwise all objects
						if (!multi) {
							return results[0];
						}
						return results;
					});
					// catch any errors and wrap them in a promise
					//.caught(function(err) {
					//	return u.wrapPromise(err);
					//});
				}
				
				// if the pay-load was invalid for any reason, send a bad request status
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
		});
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.saveResource
		};
		return _self;
	};
};