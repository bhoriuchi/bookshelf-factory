// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	// constants
	var _STAT = config.statics.httpStatus;
	var _FOPT = config.statics.fetchOpts;
	var _JTYP = config.statics.jsTypes;
	
	// modules
	var _      = config.lodash;
	var utils  = config.utils;
	var u      = utils.util;
		
	// return the function
	return function(id, fetchOpts, jsonOpts) {
		
		// runtime variables
		var models = global._factoryModels;
		
		// declare new variables and set defaults
		var _self           = this;
		var where           = {};
		var tableName       = _self.tableName;
		var idAttr          = _self.idAttribute;
		id                  = id || [];
		
		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts            || {};
		jsonOpts              = jsonOpts             || { omitPivot: true, omitForeign: true };
		jsonOpts.omitPivot    = jsonOpts.omitPivot   || true;
		jsonOpts.omitForeign  = jsonOpts.omitForeign || true;
		
		
		// check for depth restriction
		if (fetchOpts.hasOwnProperty(_FOPT.maxDepth) &&
				typeof(fetchOpts.maxDepth) === _JTYP.number &&
				fetchOpts.hasOwnProperty(_FOPT._depth) &&
				typeof(fetchOpts._depth) === _JTYP.number) {
			
			if (fetchOpts._depth >= fetchOpts.maxDepth) {
				_self.results = u.wrapPromise(id);
				return _self;
			}
		}
		
		// check for circular references
		if (fetchOpts.hasOwnProperty(_FOPT._circular) &&
				_.contains(fetchOpts._circular, tableName)) {
			_self.results = u.wrapPromise(id);
			return _self;
		}
		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			

			// call the get resources with the where option to get the specific resource
			_self.results = models[this.tableName].forge().query(function(qb) {
				qb.where(tableName + '.' + idAttr, '=', id);
			})
			.getResources(fetchOpts, jsonOpts)
			.end()
			.then(function(results) {
						
				// if there was at least 1 result return the first one
				if (Array.isArray(results) && results.length > 0) {
					return results[0];
				}
				// otherwise look for a status object
				else if (results && typeof(results) === _JTYP.object && !Array.isArray(results)) {
					return results;
				}
				// otherwise return no content
				else {
					return _STAT.NO_CONTENT;
				}
			});
		}
		else {
			_self.results = u.wrapPromise(_STAT.BAD_REQUEST);
		}
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.getResource
		};
		return _self;
	};
};