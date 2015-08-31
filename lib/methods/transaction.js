// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: use a transaction in the chain
//


module.exports = function(config) {
	
	var Bookshelf = config.bookshelf;
	
	// return the function
	return function(transaction) {
		
		var _self = this;
		_self.transaction = transaction;
		_self.throwErrors = true;

		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.transaction
		};

		return _self;
	};
};