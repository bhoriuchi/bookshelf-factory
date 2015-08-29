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
	return function(idList, opts) {

		// runtime variables
		var models       = global._factoryModels;
		var schema       = models._schema;
		
		// set defaults and variables
		var _self        = this;
		var _op;
		
		
		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (idList && typeof(idList) === _JTYP.object && !Array.isArray(idList) && !opts) {
			opts = idList;
			idList  = null;
		}
		
		// get the options
		opts       = opts || {};
		opts.force = opts.force || false;
		
		
		// get the id list
		_self.results = u.getIdList(idList, _self).then(function(ids) {
			
			// set up the publish options
			var pubOpts = {
				ids: ids,
				force: opts.force,
				_self: _self
			};
			
			
			// look for a transaction and use it or create a new one
			if (opts.hasOwnProperty(_FOPT.transacting)) {
				_op = utils.publish(pubOpts)(opts.transacting);
			}
			else {
				_op = Bookshelf.transaction(utils.publish(pubOpts));
			}
			
			// execute the operation and return the results
			return _op.then(function(results) {
				return results;
			})
			// catch any errors and print an error message
			.caught(function(err) {
				return u.wrapPromise(err);
			});			
		});

		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.publish
		};
		return _self;
	};
};