// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Main get function. Gets deep objects unless otherwise
//              specified by maxDepth.
//


module.exports = function(config) {
	
	// constants
	var _FOPT                 = config.statics.fetchOpts;
	var _JOPT                 = config.statics.jsonOpts;
	
	// modules
	var utils                 = config.utils;
	var _                     = config.lodash;
	var Bookshelf             = config.bookshelf;
	var methodcore            = config.methodcore;
	var u                     = utils.util;
	
	// return the function
	return function(fetchOpts, jsonOpts, _cache) {

		// set properties
		var _self             = this;
		
		
		// check if model initialization is required
		if (!_self._var) {
			_self.results = null;
			_self._var    = {};
		}
		
		
		// null properties
		var _op, err;
		
		// set an object for fetch opts if it wasn't provided
		fetchOpts             = fetchOpts            || {};
		fetchOpts._reqPub     = (fetchOpts._reqPub === true) ? true : false;
		
		// jsonOpts
		jsonOpts              = jsonOpts             || {};
		jsonOpts.omitPivot    = (jsonOpts.omitPivot === false) ? false : true;
		jsonOpts.omitForeign  = (jsonOpts.omitForeign === false) ? false : true;
		jsonOpts.omitVersion  = (jsonOpts.omitVersion === false) ? false : true;
		
		// update the current depth
		fetchOpts._depth      = _.has(fetchOpts, _FOPT._depth) ?
				                (fetchOpts._depth + 1) : 0;

		// update the circular references
		fetchOpts._circular   = _.has(fetchOpts, _FOPT._circular) ?
				                _.union(fetchOpts._circular, [_self.tableName]) :
				                [_self.tableName];
				                
				                
		// set the relation for fetch. the user can optionally specify which relations
		// they want included otherwise the generated relations will be used
		fetchOpts.withRelated = _.has(fetchOpts, _FOPT.withRelated) ?
				                fetchOpts.withRelated : _self.getRelations();
		
		
		// filter out any relations that conflict with the view/fields specified
		// in order to minimize unnecessary queries. this is an optimization
		//fetchOpts.withRelated = utils.view.filterRelated(_self, fetchOpts.withRelated);

		
		// use cached models to reduce queries and improve speed
		fetchOpts.useCache    = (fetchOpts.useCache === false) ? false : true;
		
		
		// set up cache
		_cache                = _cache || {};
		

		// check previous results and execute then
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			
			// create a getOpts object
			var opts = {
				config: config,
				fetchOpts: fetchOpts,
				jsonOpts: jsonOpts,
				model: _self,
				_cache: _cache
			};
			

			// look for a transaction and use it or create a new one
			if (_.has(fetchOpts, _FOPT.transacting)) {
				_op = methodcore.get(opts)(fetchOpts.transacting);
			}
			else if (_self._var.transaction) {
				_op = methodcore.get(opts)(_self._var.transaction);
			}
			else {
				_op = Bookshelf.transaction(methodcore.get(opts));
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
				'An error was thrown during the getResources transaction',
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
			
			
			// check for pagination errors
			if (_.has(_self, '_pagination.fields.error') &&
					_self._pagination.fields.error.show !== false) {
				var name = _self._pagination.fields.error.displayName || 'error';
				err = u.newObj(name, err.message);
			}
		
			// return the error
			return u.wrapPromise(err);
		});
		
		
		// update model properties and return the model
		_self._lastChain = {
			method: config.statics.methods.getResources
		};

		return _self;
	};
};