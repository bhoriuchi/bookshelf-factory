// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


module.exports = function(config) {
	
	
	// constants
	var _SCMA  = config.statics.schema;
	
	// modules
	var utils  = config.utils;
	var u      = utils.util;
	var _      = config.lodash;
	
	
	// return the function
	return function(view) {
		
		var _self     = this;
		var models    = config.models(_self.version);
		var schema    = models._schema;
		var tableName = _self.tableName;
		var v         = _.has(schema[tableName], '_versioned.model') ?
				        schema[tableName]._versioned.model : null;
		var err;
			
		// set the default view to nothing
		view = view || '';
		
		// check resolve input
		_self.results = u.resolveInput(null, _self).then(function(results) {
			
			// throw an error if the results are an error
			if (u.isErr(results.results)) {
				throw results.results;
			}
			
			
			// initialize the keep array
			_self._var.keep = [];
			
			// get the schema fields
			var fields = _.keys(models._schema[_self.tableName]);
			
			// get the temporal schema fields
			if (v && _.has(schema, v)) {
				fields = _.union(fields, _.keys(schema[v]));
			}
			
						
			// set the keep property
			var keep   = (Array.isArray(view)) ?
					     view : utils.view.filter(view, tableName, models._schema, '');
			
			// analyze the properties and make sure they are valid for the current model
			_.forEach(keep, function(path) {
				
				var field = path.replace('!', '').split('.')[0];
				
				if (_.contains(fields, field)) {
					_self._var.keep = _.union(_self._var.keep, [path]);
				}
			});

			// return results
			return results.results;
		})
		.caught(function(e) {

			// create a new error
			err = u.newErr(
				e.errno,
				'An error was thrown during the view call',
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
			method: config.statics.methods.view
		};
		return _self;
	};
};