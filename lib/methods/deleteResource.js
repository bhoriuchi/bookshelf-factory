// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: delete method
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

		var _self     = this;
		
		
		// check if model initialization is required
		if (!_self._var) {
			_self.results = null;
			_self._var    = {};
		}
		
		
		// runtime variables
		var models    = config.models(_self.version);
		
		// variables
		var tableName = _self.tableName;
		var _op, err;
		

		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (idList && typeof(idList) === _JTYP.object && !Array.isArray(idList) && !fetchOpts) {
			fetchOpts = idList;
			idList    = null;
		}
		
		// update the options
		fetchOpts         = fetchOpts || {};
		fetchOpts._reqPub = (fetchOpts._reqPub === true) ? true : false;
		fetchOpts.force   = (fetchOpts.force === true) ? true : false;

		
		if (!fetchOpts._depth && !fetchOpts.trxid) {
			fetchOpts.trxid = config.uuid.v4();
		}
		
		// get the id list
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
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
				if (_self._var.throwErrors) {
					throw err;
				}
				return u.wrapPromise(err);
			}
			
			
			// create a delOpts object
			var opts = {
				ids: results.ids,
				_self: _self,
				fetchOpts: fetchOpts
			};
			

			// look for a transaction and use it or create a new one
			if (_.has(fetchOpts, _FOPT.transacting)) {
				_op = methodcore.del(opts)(fetchOpts.transacting);
			}
			else if (_self._var.transaction) {
				_op = methodcore.del(opts)(_self._var.transaction);
			}
			else {
				_op = Bookshelf.transaction(methodcore.del(opts));
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
				'An error was thrown during the deleteResource transaction',
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
			method: config.statics.methods.deleteResource
		};
		return _self;
	};
};