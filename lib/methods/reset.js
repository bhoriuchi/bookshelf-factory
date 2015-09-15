// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: method to reset the results of an object for use in chaining
//


module.exports = function(config) {
	
	var _JTYP     = config.statics.jsTypes;
	var u         = config.utils.util;
	
	// return the function
	return function(opts) {
		
		var _self        = this;
		
		
		// check if model initialization is required
		if (!_self._var) {
			_self.results = null;
			_self._var    = {};
		}
		
		
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			// options
			opts                    = opts || {};
			opts.href               = (opts.href        === false) ? false : true;
			opts.order              = (opts.order       === false) ? false : true;
			opts.pagination         = (opts.pagination  === false) ? false : true;
			opts.results            = (opts.results     === false) ? false : true;
			opts.rowAttr            = (opts.rowAttr     === false) ? false : true;
			opts.rowClass           = (opts.rowClass    === false) ? false : true;
			opts.rowData            = (opts.rowData     === false) ? false : true;
			opts.search             = (opts.search      === false) ? false : true;
			opts.transaction        = (opts.transaction === false) ? false : true;

			
			
			// reset options
			_self._var.href         = opts.href        ? null : _self._var.href;
			_self._var.orderSQL     = opts.order       ? null : _self._var.orderSQL;
			_self._var.pagination   = opts.pagination  ? null : _self._var.pagination;
			_self._var.rowAttr      = opts.rowAttr     ? null : _self._var.rowAttr;
			_self._var.rowClass     = opts.rowClass    ? null : _self._var.rowClass;
			_self._var.rowData      = opts.rowData     ? null : _self._var.rowData;
			_self._var.searchSQL    = opts.search      ? null : _self._var.searchSQL;
			_self._var.transaction  = opts.transaction ? null : _self._var.transaction;
			
			
			
			
			// check for results and process them first
			if (results.results) {
				
				// set the results for self by resolving the promise
				return results.results.then(function(results) {
					return opts.results ? u.wrapPromise(null) : results;
				});
			}
			else {
				return u.wrapPromise(null);
			}
			
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the reset call',
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
			
			// return the error
			return u.wrapPromise(err);
		});
		
		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.reset
		};
		return _self;
	};
};