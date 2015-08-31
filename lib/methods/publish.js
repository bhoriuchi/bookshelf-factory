// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main save function.
//


module.exports = function(config) {
	
	// constants
	var _JTYP            = config.statics.jsTypes;
	var _FOPT            = config.statics.fetchOpts;
	var _STAT            = config.statics.httpStatus;
	var _ERR             = config.statics.errorCodes;
	
	// modules
	var _                = config.lodash;
	var Bookshelf        = config.bookshelf;
	var utils            = config.utils;
	var u                = utils.util;
	
	// return the function
	return function(idList, fetchOpts) {

		// runtime variables
		var models       = global._factoryModels;
		var schema       = models._schema;
		
		// set defaults and variables
		var _self        = this;
		var _op;
		
		
		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (idList && typeof(idList) === _JTYP.object && !Array.isArray(idList) && !fetchOpts) {
			fetchOpts   = idList;
			idList      = null;
		}
		
		// get the options
		fetchOpts       = fetchOpts       || {};
		fetchOpts.force = fetchOpts.force || false;
		
		
		// get the id list
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			// check that the results are valid and throw an error if they are not
			if (!results.valid) {
				
				// create a new error
				var err = u.newErr(
					_STAT.BAD_REQUEST.code,
					_ERR.INVALID_ID.message,
					_ERR.INVALID_ID.code,
					['Invalid or no id specified']
				);
				
				throw err;
			}
			
			
			// set up the publish options
			var opts = {
				ids: results.ids,
				force: fetchOpts.force,
				_self: _self
			};
			
			
			// look for a transaction and use it or create a new one
			if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
				_op = utils.publish(opts)(fetchOpts.transacting);
			}
			// check for existing transaction
			else if (_self.transaction) {
				_op = utils.publish(opts)(_self.transaction);
			}
			// otherwise create a new transaction
			else {
				_op = Bookshelf.transaction(utils.publish(opts));
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
			method: config.statics.methods.publish
		};
		return _self;
	};
};