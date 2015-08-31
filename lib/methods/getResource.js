// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// constants
	var _STAT                = config.statics.httpStatus;
	var _FOPT                = config.statics.fetchOpts;
	var _JTYP                = config.statics.jsTypes;
	var _ERR                 = config.statics.errorCodes;
	
	// modules
	var Bookshelf            = config.bookshelf;
	var _                    = config.lodash;
	var utils                = config.utils;
	var u                    = utils.util;
		
	// return the function
	return function(id, fetchOpts, jsonOpts) {

		// runtime variables
		var models            = global._factoryModels;
		
		// declare new variables and set defaults
		var _self             = this;
		id                    = id || [];
		
		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts            || {};
		jsonOpts              = jsonOpts             || {};
		jsonOpts.omitPivot    = jsonOpts.omitPivot   || true;
		jsonOpts.omitForeign  = jsonOpts.omitForeign || true;
		
		
		// variables
		var _op;
		
		
		// check for depth restriction
		if (fetchOpts.hasOwnProperty(_FOPT.maxDepth) &&
				typeof(fetchOpts.maxDepth) === _JTYP.number &&
				fetchOpts.hasOwnProperty(_FOPT._depth) &&
				typeof(fetchOpts._depth) === _JTYP.number &&
				fetchOpts._depth >= fetchOpts.maxDepth) {

			// if the depth restriction is hit, return the id
			_self.results = u.wrapPromise(id);
			return _self;
		}
		
		
		// check for circular references
		if (fetchOpts.hasOwnProperty(_FOPT._circular) &&
				_.contains(fetchOpts._circular, _self.tableName)) {
			_self.results = u.wrapPromise(id);
			return _self;
		}
		
		
		// check for previous results, if there some pass a null to getIdList
		// otherwise pass an invalid id array
		var idList = _self.results ? null : [-1];
		
		
		// check previous results and execute then
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			
			// create getOpts object
			var opts = {
				model: _self,
				id: id,
				fetchOpts: fetchOpts,
				jsonOpts: jsonOpts
			};
			
			
			// currently only support tables with a primary key
			if (id && !Array.isArray(id)) {

				// look for a transaction and use it or create a new one
				if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
					_op = utils.getId(opts)(fetchOpts.transacting);
				}
				else if (_self.transaction) {
					_op = utils.getId(opts)(_self.transaction);
				}
				else {
					_op = Bookshelf.transaction(utils.getId(opts));
				}
			}
			else {
				
				// create a new error
				var err = u.newErr(
					_STAT.BAD_REQUEST.code,
					_ERR.INVALID_ID.message,
					_ERR.INVALID_ID.code,
					['Invalid or no id specified']
				);
				
				// check if errors should be thrown. usually used for
				// a chained transaction
				if (_self.throwErrors) {
					throw err;
				}
				return u.wrapPromise(err);
			}
			
			
			// execute the operation and return the results
			return _op.then(function(results) {
				return results;
			})
			// catch any errors and print an error message
			.caught(function(err) {
				
				// check if errors should be thrown. usually used for
				// a chained transaction
				if (_self.throwErrors) {
					throw err;
				}
				return u.wrapPromise(err);
			});
		});
		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.getResource
		};
		return _self;
	};
};