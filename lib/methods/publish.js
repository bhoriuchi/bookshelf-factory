// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main publish function.
//


module.exports = function(config) {
	
	// constants
	var _JTYP            = config.statics.jsTypes;
	var _FOPT            = config.statics.fetchOpts;
	var _STAT            = config.statics.httpStatus;
	var _ERR             = config.statics.errorCodes;
	var _VER             = config.statics.version;
	
	// modules
	var _                = config.lodash;
	var Bookshelf        = config.bookshelf;
	var methodcore       = config.methodcore;
	var utils            = config.utils;
	var u                = utils.util;
	
	// return the function
	return function(idList, fetchOpts, jsonOpts, publishing) {

		var _self        = this;
		
		// runtime variables
		var models       = config.models(_self.version);
		var schema       = models._schema;
		
		// set defaults and variables
		var _op, err;
		
		
		// check arguments. if there is only 1 argument and
		// that argument is an object it should be interpreted
		// as the options, otherwise 
		if (idList && typeof(idList) === _JTYP.object && !Array.isArray(idList) && !fetchOpts) {
			fetchOpts   = idList;
			idList      = null;
		}
		
		// get the options
		fetchOpts         = fetchOpts || {};
		fetchOpts.force   = (fetchOpts.force === true) ? true : false;
		fetchOpts._reqPub = (fetchOpts._reqPub === true) ? true : false;
		
		// check for a version parameter which indicates the user wants to publish
		// something that has been unpublished
		var republish     = fetchOpts.hasOwnProperty(_FOPT.version) && fetchOpts.version !== _VER.draft;
		
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
					_ERR.INVALID_ID.message,
					_ERR.INVALID_ID.code,
					['Invalid or no id specified', 'thrown from publish']
				);
				
				// check if errors should be thrown. usually used for
				// a chained transaction
				if (_self._var.throwErrors) {
					throw err;
				}
				return u.wrapPromise(err);
			}
			
			
			// set up the publish options
			var opts = {
				ids: results.ids,
				fetchOpts: fetchOpts,
				publishing: publishing,
				_self: _self
			};
			
			
			// look for a transaction and use it or create a new one
			if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
				_op = republish ?
					methodcore.publish(opts, true)(fetchOpts.transacting) :
					methodcore.publishDraft(opts)(fetchOpts.transacting);
			}
			// check for existing transaction
			else if (_self._var.transaction) {
				_op = republish ?
					methodcore.publish(opts, true)(_self._var.transaction) :
					methodcore.publishDraft(opts)(_self._var.transaction);
			}
			// otherwise create a new transaction
			else {
				_op = republish ?
					Bookshelf.transaction(methodcore.publish(opts, true)) :
					Bookshelf.transaction(methodcore.publishDraft(opts));
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
				'An error was thrown during the publish transaction',
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
			method: config.statics.methods.publish
		};
		return _self;
	};
};