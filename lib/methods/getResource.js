// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: get a single resource


module.exports = function(config) {
	
	// constants
	var _STAT                = config.statics.httpStatus;
	var _FOPT                = config.statics.fetchOpts;
	var _JOPT                = config.statics.jsonOpts;
	var _JTYP                = config.statics.jsTypes;
	var _ERR                 = config.statics.errorCodes;
	
	// modules
	var Bookshelf            = config.bookshelf;
	var _                    = config.lodash;
	var methodcore           = config.methodcore;
	var utils                = config.utils;
	var u                    = utils.util;
		
	// return the function
	return function(id, fetchOpts, jsonOpts, _cache) {
		
		var _self             = this;
		
		
		// check if model initialization is required
		if (!_self._var) {
			_self.results = null;
			_self._var    = {};
		}
		
		
		// runtime variables
		var models            = config.models(_self.version);
		var tableName         = _self.tableName;
		var schema            = models._schema[tableName];
		// declare new variables and set defaults

		id                    = id || [];

		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts || {};
		fetchOpts._reqPub     = (fetchOpts._reqPub === true)     ? true  : false;
		fetchOpts.useCache    = (fetchOpts.useCache === false)   ? false : true;
		
		// set jsonOpts
		jsonOpts              = jsonOpts || {};
		jsonOpts.omitPivot    = (jsonOpts.omitPivot === false)   ? false : true;
		jsonOpts.omitForeign  = (jsonOpts.omitForeign === false) ? false : true;
		jsonOpts.omitVersion  = (jsonOpts.omitVersion === true)  ? true  : false;
		
		
		// set up cache
		_cache                = _cache || {};
		
		// variables
		var _op, err;

		
		// check for previous results, if there some pass a null to getIdList
		// otherwise pass an invalid id array
		var idList = _self.results ? null : [-1];
		
		
		// check previous results and execute then
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			
			var href = _self._var.href || '';
			var path = _.has(schema, '_path.path') ? schema._path.path : tableName;
			path     = '/' + path.replace(/^\/|\/$/g, '');
			href     = (jsonOpts.omitHref === true) ? '' : href;
			href     = href ? href + path + '/' : '';

			// check for depth restriction
			if (_.has(fetchOpts, _FOPT.maxDepth) &&
					typeof(fetchOpts.maxDepth) === _JTYP.number &&
					_.has(fetchOpts, _FOPT._depth) &&
					typeof(fetchOpts._depth) === _JTYP.number &&
					fetchOpts._depth >= fetchOpts.maxDepth) {

				// if the depth restriction is hit, return the id
				return u.wrapPromise(href + id);
			}
			
			
			// check for circular references
			if (_.has(fetchOpts, _FOPT._circular) &&
					_.contains(fetchOpts._circular, _self.tableName)) {

				return u.wrapPromise(href + id);
			}
			
			
			// create getOpts object
			var opts = {
				model: _self,
				id: id,
				fetchOpts: fetchOpts,
				jsonOpts: jsonOpts,
				_cache: _cache
			};
			
			
			// currently only support tables with a primary key
			if (id && !Array.isArray(id)) {

				// look for a transaction and use it or create a new one
				if (_.has(fetchOpts, _FOPT.transacting)) {
					_op = methodcore.getId(opts)(fetchOpts.transacting);
				}
				else if (_self._var.transaction) {
					_op = methodcore.getId(opts)(_self._var.transaction);
				}
				else {
					_op = Bookshelf.transaction(methodcore.getId(opts));
				}
			}
			else {
				
				// create a new error
				err = u.newErr(
					_STAT.BAD_REQUEST.code,
					_ERR.INVALID_ID.detail,
					_ERR.INVALID_ID.code,
					['Invalid or no id specified', 'thrown from getResource']
				);
				
				// check if errors should be thrown. usually used for
				// a chained transaction
				if (_self._var.throwErrors) {
					throw err;
				}
				return u.wrapPromise(err);
			}
			
			
			// execute the operation and return the results
			return _op.then(function(results) {
				return results;
			});
		})
		// catch any errors and print an error message
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the getResource transaction',
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
			method: config.statics.methods.getResource
		};
		return _self;
	};
};