// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	// constants
	var _JTYP                = config.statics.jsTypes;
	var _STAT                = config.statics.httpStatus;
	var _FOPT                = config.statics.fetchOpts;
	var _ERR                 = config.statics.errorCodes;
	
	// modules
	var _                    = config.lodash;
	var Bookshelf            = config.bookshelf;
	var methodcore           = config.methodcore;
	var utils                = config.utils;
	var u                    = utils.util;
	
	// return the function
	return function(body, fetchOpts, jsonOpts) {

		var _self            = this;
		
		// runtime variables
		var models           = config.models(_self.version);
		var schema           = models._schema;
		
		// set defaults and variables
		var payloadOpts      = {};
		var tableName        = _self.tableName;
		var keep             = _self._var.keep;
		var tableSchema      = schema[tableName];
		var idAttr           = utils.schema.getIdAttribute(tableSchema);
		var pkg, _op, _ts, _res, err;
		
		
		// check if saving more than one
		var multi            = Array.isArray(body);
		
		// to support multiple updates read the body as
		// an array even if there is only 1 object
		body                 = body || [{}];
		body                 = multi ? body : [body];
		
		// set default values
		fetchOpts            = fetchOpts || {};
		fetchOpts._reqPub    = (fetchOpts._reqPub === true) ? true : false;
		
		// jsonOpts
		jsonOpts             = jsonOpts  || {};
		jsonOpts.omitPivot    = (jsonOpts.omitPivot === false) ? false : true;
		jsonOpts.omitForeign  = (jsonOpts.omitForeign === false) ? false : true;
		
		
		// clear out any depth or circular values from the fetchOpts
		delete fetchOpts._depth;
		delete fetchOpts._circular;
		
		
		// check for an ignore of invalid values in the pay-load
		payloadOpts.ignoreInvalid = fetchOpts.hasOwnProperty(_FOPT.ignoreInvalid) ?
				                    fetchOpts.ignoreInvalid : false;
		
		
		// set the managed check after evaluating the fetch options
		payloadOpts._managedCheck = fetchOpts.hasOwnProperty(_FOPT._managedCheck) ?
				                    fetchOpts._managedCheck : true;
		

		// check for previous results 
		_self.results = u.resolveInput(null, _self).then(function(results) {

			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			
			results.ids = results.ids || [];
			results.results = results.results || [];
			results.ids = (Array.isArray(results.ids)) ? results.ids : [results.ids];
			results.results = (Array.isArray(results.results)) ? results.results : [results.results];
			
			// if cloning remove the IDs from the result and store as the
			// object
			if (fetchOpts.clone && results.results && results.valid) {

				// remove the IDs
				body = _.map(results.results, function(value) {
					
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
			else if (results.valid && results.ids.length > 0 &&
					_.filter(body, function(v) {
						return v.hasOwnProperty(idAttr);
					}).length === 0 &&
					!fetchOpts.clone) {
				
				
				// if equal IDs as objects, interpret as 1:1 update
				if (body.length === results.ids.length) {

					for (var i = 0; i < results.ids.length; i++) {
						body[i][idAttr] = results.ids[i];
					}
				}
				// otherwise bulk update each result with the update
				else {
					
					// clone the data
					var uObj = _.clone(body[0], true);
					
					// clear the original object
					body = {};
					
					// for each id, create an update
					_.forEach(results.ids, function(id) {
						body.push(_.merge(u.newObj(idAttr, id), uObj));
					});
				}
			}
			
			return utils.payload
			.preparePayload(tableName, body, models, payloadOpts)
			.then(function(pkg) {
				
				// check that the pay-load package is valid
				if (pkg.valid) {

					// create an object to send to the save function
					var opts = {
						_self: _self,
						fetchOpts: _.clone(fetchOpts, true),
						jsonOpts: _.clone(jsonOpts, true),
						packages: pkg.payloads
					};

					// check if a transaction exists in the fetchOpts which means
					// that this save has been called from a parent save
					if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
						_op = methodcore.save(opts)(fetchOpts.transacting);
					}
					// check for existing transaction
					else if (_self._var.transaction) {
						_op = methodcore.save(opts)(_self._var.transaction);
					}
					// otherwise create a new transaction and call save
					else {
						_op = Bookshelf.transaction(methodcore.save(opts));
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
				}
				
				// if the pay-load was invalid for any reason, send a bad request status
				else {
					
					// create a new error
					throw u.newErr(
						_STAT.BAD_REQUEST.code,
						_ERR.BAD_REQUEST_BODY.detail,
						_ERR.BAD_REQUEST_BODY.code,
						pkg.details.push('thrown from saveResource')
					);
				}
			});
		})
		// catch any errors and wrap them in a promise
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the saveResource transaction',
				e.code,
				e.message,
				e.stack
			);
			
			// check if the error was thrown by factory or knex/bookshelf
			err = u.isErr(e) ? e : err;
			
			// check if errors should be thrown. usually used for
			// a chained transaction
			if (_self._var.throwErrors) {
				throw err;
			}
			return u.wrapPromise(err);
		});
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.saveResource
		};
		return _self;
	};
};