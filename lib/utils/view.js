// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: view filter
//


module.exports = function(config) {

	// constants
	var _JTYP     = config.statics.jsTypes;
	var _SCMA     = config.statics.schema;
	var _REL      = config.statics.relations;
	
	// modules
	var utils     = config.utils;
	var u         = utils.util;
	var _         = config.lodash;
	
	// get list of relations
	var relations = _.keys(_REL);
	
	
	// returns the elements of the next view if dot notation has been used
	function nextView(field, keep) {
		
		var k = [];
		
		_.forEach(keep, function(path) {
			
			// check for not
			var not = (path.length > 1 && path[0] === '!') ? '!' : '';
			path = path.replace('!', '').split('.');
			
			// check that there is more to the path and that the current path
			// matches the field
			if (path.length > 1 && path[0] === field) {
				k.push(not + _.takeRight(path, path.length - 1).join('.'));
			}
		});
		
		return k;
	}

	
	// function to filter relations
	function filterRelated(model, withRelated) {
		
		var k = [];
		var not = false;
		
		// if the keep array is empty, or not an array, everything is kept
		if (!Array.isArray(model._var.keep) || model._var.keep.length === 0) {
			return withRelated;
		}

		// determine if using not
		_.forEach(model._var.keep, function(field) {
			if (field.length > 0 && field[0] === '!') {
				not = true;
			}
		});
		
		
		// loop through each keep value
		_.forEach(model._var.keep, function(field) {
			
			// split the fields dot notation
			var path = field.split('.');
			var top  = path[0].replace('!', '');
			
			if (not) {
				if (path.length === 1 && path[0][0] === '!') {
					withRelated = _.without(withRelated, top);
				}
			}
			else {
				k.push(top);
			}
		});
		
		// loop through the withRelated and remove any
		// that do not exist in the k array
		_.forEach(withRelated, function(relation) {
			if (!not && !_.contains(k, relation)) {
				withRelated = _.without(withRelated, relation);
			}
		});

		return withRelated;
	}
	
	
	// creates a list of properties to use when filtering the model
	// the list is then used by dotprune to prune the unwanted properties
	function filter(view, table, schema, prefix) {
		
		
		var list = [];
		
		// make sure the table has a schema
		if (typeof (schema) === _JTYP.object &&
				_.has(schema, table) &&
				typeof (schema[table]) === _JTYP.object) {
			
			var tableSchema  = schema[table];
			var versioned    = _.has(tableSchema, '_versioned.model');
			var nextTable;
			
			_.forEach(tableSchema, function(col, colName) {
				if (_.contains(col.views, view) || _.contains(col.views, '*')) {
					
					var relation = _.intersection(_.keys(col), relations);
					relation     = (relation.length  > 0) ? relation[0]  : null;
					
					colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
					list.push(colName);
					
					if (relation) {
						list = _.union(list, filter(view, col[relation], schema, colName));
					}
				}
			});
			
			
			if (versioned) {
				
				_.forEach(schema[tableSchema._versioned.model], function(col, colName) {
					if (_.contains(col.views, view)) {
						
						var relation = _.intersection(_.keys(col), relations);
						relation     = (relation.length  > 0) ? relation[0]  : null;
						
						colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
						list.push(colName);
						
						if (relation) {
							
							if (_.has(schema[col[relation]], '_managed.model')) {
								nextTable = schema[col[relation]]._managed.model;
							}
							else {
								nextTable = col[relation];
							}
							
							list = _.union(list, filter(view, nextTable, schema, colName));
						}
					}
				});
			}
		}
		return list;
	}
	
	
	// return functions
	return {
		filter: filter,
		filterRelated: filterRelated,
		nextView: nextView
	};
};