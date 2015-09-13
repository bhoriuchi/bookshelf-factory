// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: model utils
//


module.exports = function(config) {
	
	// constants
	var _VER = config.statics.version;
	
	// modules
	var _    = config.lodash;
	var u    = config.utils.util;
	
	
	// function to check the difference between an object and its draft
	function isDraftDiff(rel, t, models) {

		// runtime variables
		var schema = models._schema;
		
		// current fetch options
		var cFetchOpts = {
			transacting: t,
			maxDepth: 0
		};
		
		// draft fetch options
		var dFetchOpts = {
			transacting: t,
			maxDepth: 0,
			version: _VER.draft
		};
		
		// parsing options
		var jsonOpts = {
			omitForeign: false
		};
		
		// get the draft and current models and look for differences
		return models[rel.pubTable].forge()
		.transaction(t)
		.getResource(rel.pubId, cFetchOpts, jsonOpts)
		.end()
		.then(function(current) {

			
			// check for current result
			if (current && current.version !== _VER.draft) {

				return models[rel.pubTable].forge()
				.transaction(t)
				.getResource(rel.pubId, dFetchOpts, jsonOpts)
				.end()
				.then(function(draft) {
					if (draft) {
						
						
						// remove the non-managed properties and the ones that can change
						// without impacting anything
						var omits = _.union(
							_.keys(schema[rel.pubTable]),
							_.keys(_VER.child)
						);

						// filter the results
						current   = _.omit(current, function(value, key) {
							return _.contains(omits, key);
						});
						draft     = _.omit(draft, function(value, key) {
							return _.contains(omits, key);
						});

						// check if the objects are equal
						return !_.isEqual(current, draft);
					}
					
					return null;
				});
			}
			
			// if there is no current version, then one
			// needs to be published
			else {
				return true;
			}
		});
	}
	
	
	// return public functions
	return {
		isDraftDiff: isDraftDiff
	};
};