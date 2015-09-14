// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: set limit
//


module.exports = function(config) {
	
	var u = config.utils.util;
	
	// return the function
	return function(offset) {
		
		var _self = this;
		var err;
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			if (offset) {
				// set the offset
				_self._var.offset = !isNaN(offset) ? parseInt(offset, 10) : null;
				_self._var.offset = _self._var.offset > -1 ? _self._var.offset : 0;
			}

			
			// return the results
			return results.results;
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the offset call',
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
			method: config.statics.methods.offset
		};

		return _self;
	};
};