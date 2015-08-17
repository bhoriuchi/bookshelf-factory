// Author: Branden Horiuchi <bhoriuchi@gmail.com>
//


// NOTE: a note on searching versioned models, currently you must do a field specific
// search on versioned models since they are composed of 2 tables. in the event you 
// do a global search and the search parameter exists in 1 and not the other, no results
// will be returned since if the there is no result in the parent, the child will never
// be searched, and if there is a result in the parent but not the child, there will be
// no child to merge into the parent and the result will be removed. the tables can
// potentially be joined before searching but that strategy would take some effort to 
// figure out

module.exports = function(config) {
	
	var _     = config.lodash;
	var util  = config.util;
	var utils = config.utils;
	
	// return the function
	return function(search, searchable) {
		
		// set up an sql object
		var sql = {
			parent: '',
			child: ''
		};
		
		// look for search
		search  = search || null;
		search  = (typeof(search) === 'string') ? [search] : search;
		search  = (search && typeof(search) === 'object' &&
				search.hasOwnProperty('search')) ? [search] : search;
		
		// set up the search object that will hold
		// the fields and types of searches to perform
		var s   = {
			parent: {},
			child: {}
		};
		
		// get the schema for the current table
		var parentSchema = global._factoryModels._schema[this.tableName];
		
		
		// determine if the model is versioned and get the schema if it is
		var versioned    = (_.has(parentSchema, '_versioned') && _.has(parentSchema._versioned, 'model')) ?
				parentSchema._versioned.model : null;
		var childSchema  = versioned ? global._factoryModels._schema[versioned] : null;
		
		
		// create a schema object
		var schema = {
			parent: parentSchema,
			child: childSchema
		};
		
		// get the list of search-able fields
		searchable = searchable || utils.search.getSearchable(parentSchema, childSchema);
		searchable = !Array.isArray(searchable) ?
				searchable : utils.search.resolveSearchable(searchable, parentSchema, childSchema);
		
	
		// determine if multiple fields will be searched
		if (Array.isArray(search)) {
			
			// loop through each field
			_.forEach(search, function(sobj) {
				
				// check for a simple string. this is an all search
				if (typeof(sobj) === 'string') {
					
					// set for parent
					s.parent._all        = {};
					s.parent._all.type   = 'basic';
					s.parent._all.search = sobj;
					
					// set for child, even if no child
					// this is faster than checking for one
					s.child._all         = {};
					s.child._all.type    = 'basic';
					s.child._all.search  = sobj;
				}
				
				// otherwise check for an object that has a search parameter
				else if (typeof(sobj) === 'object' &&
						_.has(sobj, 'search') &&
						typeof(sobj.search) === 'string') {
					
					// if the object has no field parameter, it is the all fields
					// search. because a field can be named anything the field name
					// is omitted for all fields so that you can use column names like
					// all or any other variable that might be used to identify all fields					
					if (!_.has(sobj, 'field')) {
						
						// set parent
						s.parent._all         = {};
						s.parent._all.type    = utils.search.searchType(sobj.type);
						s.parent._all.search  = sobj.search;
						
						// set child
						s.child._all          = {};
						s.child._all.type     = utils.search.searchType(sobj.type);
						s.child._all.search   = sobj.search;
					}
					
					// otherwise check for an object that has a field parameter that
					// is a valid column name
					else if (_.has(sobj, 'field') && typeof(sobj.field) === 'string') {
						
						if (parentSchema.hasOwnProperty(sobj.field) &&
								(_.contains(searchable.parent, sobj.field) || searchable.parent.length === 0)) {
							s.parent[sobj.field]        = {};
							s.parent[sobj.field].type   = utils.search.searchType(sobj.type);
							s.parent[sobj.field].search = sobj.search;
						}
						
						if (childSchema && childSchema.hasOwnProperty(sobj.field) &&
								(_.contains(searchable.child, sobj.field) || searchable.child.length === 0)) {
							s.child[sobj.field]         = {};
							s.child[sobj.field].type    = utils.search.searchType(sobj.type);
							s.child[sobj.field].search  = sobj.search;
						}
						
					}
				}
			});
		}
		

		
		
		// loop through each search and compile an sql statement
		_.forEach(s, function(typeObject, typeName) {
			_.forEach(typeObject, function(obj, column) {
								
				// set the column sql to the concat of each field value is on the all column
				column = (column === '_all') ? utils.search.getColumnConcatSQL(schema[typeName], searchable[typeName]) : column;

				// if the search is basic, get the keyword search SQL
				if (obj.type === 'basic') {
					sql[typeName] += utils.search.getKeywordSQL(obj.search, column);
				}
				
				// otherwise get the regex search SQL
				else {
					sql[typeName] += utils.search.getRegexSQL(obj.search, column);
				}
			});
		});
		
		
		// set the _pretty value to an object and return the model
		this._parentSearchSQL = (sql.parent === '') ? '1 = 1' : sql.parent + '1 = 1';
		this._childSearchSQL  = (sql.child === '') ? '1 = 1' : sql.child + '1 = 1';
		
		//console.log('parentSQL->', this._parentSearchSQL, '<-parentSQL');
		//console.log('childSQL->', this._childSearchSQL, '<-childSQL');
		
		return this;
	};
};