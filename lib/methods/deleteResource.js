// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//



module.exports = function(config) {

	// constants
	var _STAT     = config.statics.httpStatus;
	var _JTYP     = config.statics.jsTypes;
	var _FOPT     = config.statics.fetchOpts;
	
	// modules
	var Bookshelf = config.bookshelf;
	var _         = config.lodash;
	var utils     = config.utils;
	var u         = utils.util;

	
	// return the function
	return function(ids, opts) {

		// runtime variables
		var models    = global._factoryModels;
		
		// variables
		var _self     = this;
		var tableName = _self.tableName;
		var _op;
		

		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (ids && typeof(ids) === _JTYP.object && !Array.isArray(ids) && !opts) {
			opts = ids;
			ids   = null;
		}
		
		// update the options
		opts          = opts       || {};
		var force     = opts.force || false;

		// get the id list
		ids = u.getIdList(ids, _self);
				
		// create a delOpts object
		var delOpts = {
			ids: ids,
			model: _self,
			models: models,
			opts: opts
		};
		

		// look for a transaction and use it or create a new one
		if (opts.hasOwnProperty(_FOPT.transacting)) {
			_op = utils.del(delOpts)(opts.transacting);
		}
		else {
			_op = Bookshelf.transaction(utils.del(delOpts));
		}
		
		// execute the operation and return the results
		_self.results = _op.then(function(results) {
			return results;
		})
		// catch any errors and print an error message
		.caught(function(err) {
			return u.wrapPromise(err);
		});
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.deleteResource
		};
		return _self;
	};
};