// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main get function. Gets deep objects unless otherwise
//              specified by maxDepth.
//


module.exports = function(config) {
	
	// constants
	var _FOPT                 = config.statics.fetchOpts;
	
	// modules
	var utils                 = config.utils;
	var _                     = config.lodash;
	var Bookshelf             = config.bookshelf;
	var u                     = utils.util;
	
	// return the function
	return function(fetchOpts, jsonOpts) {

		// set properties
		var _self             = this;
		
		// null properties
		var _op;

		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts            || {};
		jsonOpts              = jsonOpts             || {};
		jsonOpts.omitPivot    = jsonOpts.omitPivot   || true;
		jsonOpts.omitForeign  = jsonOpts.omitForeign || true;
		
		// update the current depth
		fetchOpts._depth      = fetchOpts.hasOwnProperty(_FOPT._depth) ?
				                (fetchOpts._depth + 1) : 0;
				
		
		// update the circular references
		fetchOpts._circular   = fetchOpts.hasOwnProperty(_FOPT._circular) ?
				                _.union(fetchOpts._circular, [_self.tableName]) :
				                [_self.tableName];
		
		// set the relation for fetch. the user can optionally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = (fetchOpts.hasOwnProperty(_FOPT.withRelated)) ?
				                fetchOpts.withRelated : _self.getRelations();
		
		
		// filter out any relations that conflict with the view/fields specified
		// in order to minimize unnecessary queries. this is an optimization
		fetchOpts.withRelated = utils.view.filterRelated(_self._keep, fetchOpts.withRelated);

		
		// check for previous results, if there some pass a null to getIdList
		// otherwise pass an invalid id array
		var idList = _self.results ? null : [-1];
		
		
		// check previous results and execute then
		_self.results = u.resolveInput(idList, _self).then(function(results) {
			
			
			// create a getOpts object
			var opts = {
				config: config,
				fetchOpts: fetchOpts,
				jsonOpts: jsonOpts,
				model: _self
			};
			

			// look for a transaction and use it or create a new one
			if (fetchOpts.hasOwnProperty(_FOPT.transacting)) {
				_op = utils.get(opts)(fetchOpts.transacting);
			}
			else if (_self.transaction) {
				_op = utils.get(opts)(_self.transaction);
			}
			else {
				_op = Bookshelf.transaction(utils.get(opts));
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
			method: config.statics.methods.deleteResources
		};
		return _self;
	};
};