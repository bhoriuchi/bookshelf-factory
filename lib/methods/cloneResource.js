// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: clone a resource
//


module.exports = function(config) {
	
	// constants
	var _STAT      = config.statics.httpStatus;
	var _JTYP      = config.statics.jsTypes;
	var _FOPT      = config.statics.fetchOpts;
	var _ERR       = config.statics.errorCodes;
	
	// modules
	var Bookshelf  = config.bookshelf;
	var _          = config.lodash;
	var methodcore = config.methodcore;
	var utils      = config.utils;
	var u          = utils.util;
	
	// return the function
	return function(idList, fetchOpts) {
		
		// runtime variables
		var models = global._factoryModels;
		
		// variables
		var _self  = this;
		var multi  = false;
		var _op, err;
		
		
		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (idList && typeof(idList) === _JTYP.object && !Array.isArray(idList) && !fetchOpts) {
			fetchOpts = idList;
			idList    = null;
		}
		
		// update the options
		fetchOpts     = fetchOpts       || {};
		
		// get the id list
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			// check that the results are valid and throw an error if they are not
			if (!results.valid) {
				
				// create a new error
				err = u.newErr(
					_STAT.BAD_REQUEST.code,
					_ERR.INVALID_ID.detail,
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
			
			
			// check for multiple results
			if (results.ids.length > 1) {
				multi = true;
			}
			
			// create a delOpts object
			var opts = {
				fetchOpts: fetchOpts,
				ids: results.ids,
				model: _self,
				models: models,
				multi: multi
			};

			// look for a transaction and use it or create a new one
			if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
				_op = methodcore.clone(opts)(fetchOpts.transacting);
			}
			else if (_self.transaction) {
				_op = methodcore.clone(opts)(_self.transaction);
			}
			else {
				_op = Bookshelf.transaction(methodcore.clone(opts));
			}
			
			// execute the operation and return the results
			return _op.then(function(results) {
				return results;
			})
			// catch any errors and print an error message
			.caught(function(e) {
						
				// create a new error
				err = u.newErr(
					e.errno,
					'An error was thrown during the cloneResource transaction',
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
		});

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.clone
		};
		return _self;
	};
};