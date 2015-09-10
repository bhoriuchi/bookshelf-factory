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
	return function(id, fetchOpts, jsonOpts) {
		
		var _self             = this;
		
		// runtime variables
		var models            = global._factoryModels;
		var tableName         = _self.tableName;
		var schema            = models._schema[tableName];
		// declare new variables and set defaults

		id                    = id || [];

		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts            || {};
		fetchOpts._reqPub     = (fetchOpts._reqPub === true) ? true : false;
		
		// set jsonOpts
		jsonOpts              = jsonOpts             || {};
		jsonOpts.omitPivot    = (jsonOpts.omitPivot === false) ? false : true;
		jsonOpts.omitForeign  = (jsonOpts.omitForeign === false) ? false : true;
		jsonOpts.omitVersion  = (jsonOpts.omitVersion === false) ? false : true;
		
		// variables
		var _op, err;
		
		console.log('keep',_self._keep);
		console.log('href',_self._href);
				
		var href = _self._href || '';
		var path = _.has(schema, '_path.path') ? schema._path.path : tableName;
		href     = (jsonOpts.omitHref === true) ? '' : href;
		href     = href ? href + path + '/' : '';

		// check for depth restriction
		if (fetchOpts.hasOwnProperty(_FOPT.maxDepth) &&
				typeof(fetchOpts.maxDepth) === _JTYP.number &&
				fetchOpts.hasOwnProperty(_FOPT._depth) &&
				typeof(fetchOpts._depth) === _JTYP.number &&
				fetchOpts._depth >= fetchOpts.maxDepth) {

			// if the depth restriction is hit, return the id
			_self.results = u.wrapPromise(href + id);
			return _self;
		}
		
		
		// check for circular references
		if (fetchOpts.hasOwnProperty(_FOPT._circular) &&
				_.contains(fetchOpts._circular, _self.tableName)) {

			_self.results = u.wrapPromise(href + id);
			return _self;
		}
		
		
		// check for previous results, if there some pass a null to getIdList
		// otherwise pass an invalid id array
		var idList = _self.results ? null : [-1];
		
		
		// check previous results and execute then
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
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
					_op = methodcore.getId(opts)(fetchOpts.transacting);
				}
				else if (_self.transaction) {
					_op = methodcore.getId(opts)(_self.transaction);
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
				if (_self.throwErrors) {
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
			if (_self.throwErrors) {
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