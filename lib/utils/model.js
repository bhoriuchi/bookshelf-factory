// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: model utils
//


module.exports = function(config) {
	
	// constants
	var _VER = config.statics.version;
	
	// modules
	var _    = config.lodash;
	
	
	// function to check the difference between an object and its draft
	function isDraftDiff(rel, t) {
		
		// runtime variables
		var models = global._factoryModels;
		var schema = models._schema;
		
		// get the draft and current models and look for differences
		return models[rel.table].forge()
		.transaction(t)
		.getResource(rel.obj.id, {
			transacting: t,
			maxDepth: 0
		})
		.end()
		.then(function(current) {
			
			// check for current result
			if (current && current.version !== _VER.draft) {
				return models[rel.table].forge()
				.transaction(t)
				.getResource(rel.obj.id, {
					transacting: t,
					maxDepth: 0,
					version: _VER.draft
				})
				.end()
				.then(function(draft) {
					if (draft) {
						
						
						
						
						console.log('COMPARE', current);
						console.log('TO', draft);
						
						return !_.isEqual(current, draft);
					}
					
					console.log('No draft version?');
					return null;
				});
			}
			
			// if there is no current version, then one
			// needs to be published
			return true;
		});
		
		
	}
	
	
	// return public functions
	return {
		isDraftDiff: isDraftDiff
	};
};