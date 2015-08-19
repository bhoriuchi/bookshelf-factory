// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: search util functions
//


module.exports = function(config) {

	
	var _         = config.lodash;
	var utils      = config.utils;
	var bookshelf = config.bookshelf;
	
	
	// unique queries or settings that are database specific go here
	// only supported knex databases
	var specific = {
			"mysql": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"postgres": {
				"regex": function(compareTo, regex) {
					return compareTo + " ~ '" + regex + "' AND ";
				}
			},
			"maria": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"sqlite3": {
				"regex": function(compareTo, regex) {
					return compareTo + " REGEXP '" + regex + "' AND ";
				}
			},
			"oracle": {
				"regex": function(compareTo, regex) {
					return "REGEXP_LIKE(" + compareTo + ",'" + regex + "') AND ";
				}
			}
	};
	
	
	// function to get searchable fields defined by the schema
	function getSearchable(parentSchema, childSchema) {
		
		var parentSearchable = [];
		var childSearchable  = [];
		
		// check for versioned
		if (childSchema) {
			var childFields = utils.schema.getColumns(childSchema);
			childSearchable = _.keys(
				_.pick(childFields, function(c) {
					return !c.hasOwnProperty('searchable') || c.searchable;
				})
			);
		}
		
		var parentFields = utils.schema.getColumns(parentSchema);
		parentSearchable = _.keys(
			_.pick(parentFields, function(p) {
				return !p.hasOwnProperty('searchable') || p.searchable;
			})
		);
		
		return {
			parent: parentSearchable,
			child: childSearchable
		};
	}

	// resolve the searchable values from an array of searchable values
	function resolveSearchable(searchable, parentSchema, childSchema) {
		
		var parentSearchable = [];
		var childSearchable  = [];
		
		// loop through each value and determine which schema it belongs to
		_.forEach(searchable, function(column) {
			
			if (parentSchema.hasOwnProperty(column)) {
				parentSearchable.push(column);
			}
			if (childSchema && childSchema.hasOwnProperty(column)) {
				childSchema.push(column);
			}
		});
		
		return {
			parent: parentSearchable,
			child: childSearchable
		};
	}
	
	
	// generate a concat string of searchable columns
	function getColumnConcat(table, schema, searchable) {
		
		var sql = '';
		
		// make searchable into an array
		searchable = searchable || [];
		searchable = Array.isArray(searchable) ? searchable : [];
		
		// check that the schema is an object
		if (typeof(schema) === 'object' && schema !== null) {
			
			// filter the schema into fields that have a type. these will 
			// be the fields with a type attribute that are not ignored
			var filtered = utils.schema.getColumns(schema);
			
			// get the sql
			_.forEach(filtered, function(colSchema, colName) {
				
				// check for searchable
				if (_.contains(searchable, colName) || searchable.length === 0) {
					sql += ',`' + table + '`.`' + colName + '`';
				}
			});
		}
		
		return sql;
	}
	
	
	// get search type
	function searchType(type) {
		
		// define search types
		var types = ['basic', 'regex'];
		
		// check that the type is a string
		if (type && typeof(type) === 'string') {
			
			// check that the type is in the valid types array, default to basic
			return (_.intersection(types, [type.toLowerCase()]).length > 0) ? type : 'basic';
		}
		
		// by default return basic type
		return 'basic';
	}
	
	
	// function to get sql for each keyword
	function getKeywordSQL(keyString, compareTo) {

		var sql = '';
		var keywords = keyString.match(/("[^"]+"|[^\s]+)/g);
		
		if (Array.isArray(keywords)) {
			for (var i = 0; i < keywords.length; i++) {
				var kw = keywords[i].replace(/"/g, '');
				sql += (kw !== '') ? compareTo + " like '%" + kw + "%' and " : '';
			}
		}
		
		return sql;
	}

	
	// function to get regex sql
	function getRegexSQL(regex, compareTo) {

		var sql = '';
		var dbType = bookshelf.knex.client.config.client;
		
		// make regex usable in sql
		regex = regex.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
		
		// make sure the type has a supported regex function
		if (typeof (specific[dbType]) === 'object' &&
				specific[dbType].hasOwnProperty('regex')) {
			sql += specific[dbType].regex(compareTo, regex);
		}
		
		return sql;
	}
	
	
	
	// return public
	return {
		specific: specific,
		searchType: searchType,
		getSearchable: getSearchable,
		getColumnConcat: getColumnConcat,
		getKeywordSQL: getKeywordSQL,
		getRegexSQL: getRegexSQL
	};
	
};