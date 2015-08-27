// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	// constants
	var _JTYP            = config.statics.jsTypes;
	var _FOPT            = config.statics.fetchOpts;
	
	// modules
	var _                = config.lodash;
	var Bookshelf        = config.bookshelf;
	var utils            = config.utils;
	var u                = utils.util;
	
	// return the function
	return function(ids, opts) {

		// runtime variables
		var models       = global._factoryModels;
		var schema       = models._schema;
		
		// set defaults and variables
		var _self        = this;
		var _op;
		
		
		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (ids && typeof(ids) === _JTYP.object && !Array.isArray(ids) && !opts) {
			opts = ids;
			ids  = null;
		}
		
		// get the options
		opts     = opts || {};
		
		
		// get the id list
		ids = u.getIdList(ids, _self);
		
		// set up the publish options
		var pubOpts = {
			ids: ids
		};
		
		
		// look for a transaction and use it or create a new one
		if (opts.hasOwnProperty(_FOPT.transacting)) {
			_op = utils.publish(pubOpts)(opts.transacting);
		}
		else {
			_op = Bookshelf.transaction(utils.publish(pubOpts));
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
			method: config.statics.methods.publish
		};
		return _self;
	};
};