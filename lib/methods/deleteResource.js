// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//



module.exports = function(config) {

	
	// shorten variable names
	var _      = config.lodash;
	var util   = config.util;
	var STATUS = config.constants.statusCodes;


	// return the function
	return function(id, opts) {

		
		var where = {};
		opts      = opts || {};

		
		// currently only support tables with a primary key
		if (!Array.isArray(id)) {
			
			
			// set the where object
			where[this.idAttribute] = id;

			
			// check that the resource exists
			return this.where(where).fetch().then(function(results) {
				
				
				// check that the results are not null
				if (typeof (results) === 'object' && results !== null) {
					
					
					// attempt to destroy the resource
					return results.destroy().then(function() {
						return util.statusPromise(STATUS.OK);
					})
					.caught(function(e) {
						return util.statusPromise(_.merge(STATUS.SQL_ERROR, {error: e}));
					});
				}
				else {
					
					
					return util.statusPromise(STATUS.NOT_FOUND);
				}
			});
		}
		else {
			
			
			return util.statusPromise(STATUS.BAD_REQUEST);
		}
	};
};