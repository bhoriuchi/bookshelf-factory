// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Helper functions
//


module.exports = function(config) {
	
	
	// shorten the passed variables
	var Promise   = config.promise;
	var _         = config.lodash;
	var uuid      = config.uuid;
	var shortId   = config.shortId;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	var OPTS      = schemer.constants.options;
	var TYPE      = schemer.constants.type;
	
	
	
	
	// check the fields
	function checkPayload(table, payload, method, managedCheck, sysTime) {
		
		
		var schema       = global._factoryModels._schema;
		var tableSchema  = _.clone(schema[table], true);  // create a copy of the table schema, so we dont overwrite
		var idAttr       = getIdAttribute(schema[table]);
		var priSchema    = schema[table][idAttr];
		var details      = [];
		var passed       = true;
		var versioned    = false;
		var pl           = {};
		var childId      = null;

		
		// check for managed versioned objects that must be updated using the parent object
		if (tableSchema.hasOwnProperty('_managed') && managedCheck) {

			details.push({
				type: constants.error,
				message: 'This object is versioned and can only be updated through the parent model ' + tableSchema._managed.model
			});
			passed = false;
		}
		else {
		
			// check for a versioned object
			if (tableSchema.hasOwnProperty('_versioned')) {
				
				versioned = true;
				
				// create a merged object
				_.merge(tableSchema, schema[tableSchema._versioned.model]);

				// remove system edited fields
				delete tableSchema.current_version;
				delete tableSchema.parent_id;
				delete tableSchema.version;
				delete tableSchema.published;
				delete tableSchema.active;
				delete tableSchema.valid_from;
				delete tableSchema.valid_to;
				
			}
		
			// first loop through the payload and make sure all
			// of the required fields are present and set null values
			// for nullable columns
			_.forEach(tableSchema, function(colSchema, colName) {
				
				// check if the column increments or has a default. these will not be required in the payload
				var increments  = colSchema[OPTS.increments] || false;
				var compositeId = colSchema.compositeId || false;
				var hasDefault  = (colSchema.hasOwnProperty(OPTS.defaultTo) && colSchema[OPTS.defaultTo] !== null);
				
				// check for required field during save operation
				if (schemer.util.required(colSchema, colName) &&
						(!payload.hasOwnProperty(colName) || payload[colName] === null) &&
						!increments && !hasDefault && !compositeId && method === constants.methods.save) {
					
					
					details.push({
						type: constants.error,
						message: 'missing required field: ' + colName
					});
					passed = false;
				}
				
				
				// check for auto incrementing uuid columns on initial save
				else if (increments && colSchema.type === TYPE.uuid && method === constants.methods.save) {
					payload[colName] = sysTime.uuid1;
					childId          = sysTime.uuid2;
				}
				
				
				// check for custom index type compositeId
				else if (compositeId && colSchema.type === TYPE.string && method === constants.methods.save) {
					payload[colName] = table + '-' + shortId.generate();
					childId          = table + 'version-' + shortId.generate();
				}
				
				
				// check for a field that should be transformed
				else if (colSchema.hasOwnProperty('transform') &&
						typeof(colSchema.transform) === 'function' &&
						payload.hasOwnProperty(colName) &&
						payload[colName] !== null) {
					payload[colName] = colSchema.transform(payload[colName]);
				}
				
				
				
				// check if the column has a belongsToMany relationship and is not
				// nullable, and is being saved, and is missing a value to save
				// if we are updating, then a blank value will not update the junction table
				// all other relationships define columns in entity tables so they will be
				// checked there
				else if (colSchema.hasOwnProperty(constants.belongsToMany) &&
						!schemer.util.nullable(colSchema) &&
						method === constants.methods.save &&
						(!payload.hasOwnProperty(colName) || !Array.isArray(payload[colName]))) {
					
					
					details.push({
						type: constants.error,
						message: 'missing required relationship field "' + colName + '", an array of values is required'
					});
					passed = false;
				}
			});
			
			
			// next look at all of the supplied fields and make sure they are actual 
			// fields and the correct type fields that dont exist get deleted
			_.forEach(payload, function(value, key) {
				
				
				// if the value does not exist in the keys, delete it
				if (!tableSchema.hasOwnProperty(key)) {
					
					
					details.push({
						type: constants.info,
						message: '"' + key + '" is not a valid field, removing from playload'
					});
					delete payload[key];
				}
				
				
				// check if the column has a type parameter, meaning it should provide data to a column
				// and validate that data
				else if (tableSchema[key].hasOwnProperty(OPTS.type) &&
						!validValue(tableSchema[key][OPTS.type], value)) {
					
					
					details.push({
						type: constants.error,
						message: 'the value supplied for "' + key + '" is not of type ' + tableSchema[key][OPTS.type]
					});
					passed = false;
				}
				
				
				// check that the type or types of values supplied are valid
				else if (tableSchema[key].hasOwnProperty(constants.belongsToMany)) {
					
					
					// first get the target type
					var targetModel = tableSchema[key][constants.belongsToMany];
					var junction    = [table, targetModel].sort().join('_');
					var targetPk    = getIdAttribute(schema[targetModel]);
					var targetKey   = null;
					var targetType  = null;
					
					
					// check for a primaryKey on the target model
					if (targetPk !== null && !Array.isArray(targetPk)) {
						targetKey = targetModel + '_' + targetPk;
					}
					
					
					// check for junction table
					if (tableSchema[key].hasOwnProperty(constants.junction) &&
							schema.hasOwnProperty(tableSchema[key][constants.junction])) {
						
						junction = tableSchema[key][constants.junction];
					}
					else if (!schema.hasOwnProperty(junction)) {
						
						junction = null;
						
						details.push({
							type: constants.error,
							message: 'a junction table has not been defined in the schema, it is recommended you create a schema for "' + junction + '"'
						});
						passed = false;
					}
					
					
					// if the junction schema exists, proceed
					if (junction !== null) {
					
						// check if an other key has been supplied and that it is defined on the
						// target tables schema
						if (tableSchema[key].hasOwnProperty(constants.otherKey) &&
								schema[junction].hasOwnProperty(tableSchema[key][constants.otherKey])) {
							
							targetType = schema[junction][tableSchema[key][constants.otherKey]][OPTS.type];
						}
						
						
						// if there was no otherKey specified, look for the generated key
						else if (targetKey !== null && schema[junction].hasOwnProperty(targetKey)) {
							
							targetType = schema[junction][targetKey][OPTS.type];
						}
						
						// otherwise there is something wrong with the schema definition
						else {
							
							details.push({
								type: constants.error,
								message: 'could not determine the type for ' + key
							});
							passed = false;
						}
	
						
						// check types
						if (targetType !== null) {
							
							
							// if the value is not an array, put it in one
							if (!Array.isArray(value)) {
								value = [value];
							}
		
							// loop through the array and validate the input
							for(var i = 0; i < value.length; i++) {
								
	
								if (!validValue(targetType, value[i])) {
									
									details.push({
										type: constants.error,
										message: 'mismatched type in "' + key + '" value'
									});
									passed = false;
									break;
								}
							}
						}
					}
				}
			});
			
			
			if (versioned) {

				
				// map the parent and omit system values				
				pl.parent = {
					table: table,
					payload: _.omit(_.mapValues(schema[table], function(value, key) {
						return (_.has(payload, key) ||
								key.substring(0, 1) === '_') ? payload[key] : null;
					}), function(value, key) {
						return key === 'current_version' || value === null;
					}),
					relations: []
				};
				
				// map the child and omit system values
				var childOmit = _.omit(constants.versioned.child, function(value, key) {
					return _.has({published: {}, change_notes: {}}, key);
				});
				
				pl.child = {
					table: tableSchema._versioned.model,
					payload: _.omit(_.mapValues(schema[tableSchema._versioned.model], function(value, key) {
						return (_.has(payload, key) ||
								key.substring(0, 1) === '_') ? payload[key] : null;
					}), function(value, key) {
						return _.has(childOmit, key) || value === null;
					}),
					relations: []
				};
				
				
				// check for incremental uuid or compositeId
				if (method === constants.methods.save &&
						(priSchema.type === TYPE.uuid ||
								(priSchema.hasOwnProperty('compositeId') && priSchema.compositeId))) {
					pl.child.payload.id = childId;
					
				}
			}
			else {
				pl.parent = {
					table: table,
					payload: payload,
					relations: []
				};
			}
			
		}

		
		// if nothing failed, the payload is ok
		return {
			passed: passed,
			payload: pl,
			details: details
		};
	}
	
	
	
	
	
	// function to validate that related entities exist
	// takes a model, the models idAttribute, and a list
	// of IDs to verify
	function verifyEntities(model, idAttribute, ids) {

		var invalid = [];
		
		if (!Array.isArray(ids) || ids.length === 0) {
			return new Promise(function(resolve) {
				resolve([]);
			});
		}
		
		
		return Promise.each(ids, function(id) {
			
			var where = {};
			where[idAttribute] = id;
			
			return model.forge().where(where)
			.fetchAll()
			.then(function(results) {
				if (results.length < 1) {
					invalid.push(id);
				}
			});
		})
		.then(function() {
			return invalid;
		});
	}
	
	
	
	
	// function to validate that the data type provided matches the
	// defined type
	function validValue(type, value) {
		
		
		// check for string types, or things that are entered as strings
		if ((type === TYPE.string ||
				type === TYPE.text ||
				type === TYPE.binary ||
				type === TYPE.uuid) &&
				typeof(value) !== 'string') {
			return false;
		}
		
		// check for integer types
		else if ((type === TYPE.integer || type === TYPE.bigInteger) && !isNumber(value)) {
			return false;
		}
		
		// check for decimal types
		else if ((type === TYPE.float || type === TYPE.decimal) && !isDecimal(value)) {
			return false;
		}
		
		// check for boolean
		else if (type === TYPE.boolean && !isBoolean(value)) {
			return false;
		}
		
		// check for date related
		else if ((type === TYPE.datetime || type === TYPE.date || type === TYPE.timestamp) &&
				!isDate(value)) {
			return false;
		}
		
		// check for time
		else if (type === TYPE.time && !isTime(value)) {
			return false;
		}
		
		// check for json type
		else if (type === TYPE.json && !isJSON(value)) {
			return false;
		}
		
		// if no failures then valid
		return true;
	}
	
	
	
	
	
	// check if the value is a number or can be parsed to a number
	function isNumber(value) {
		return (typeof(value) === 'number' ||
				(typeof(value) === 'string' && !isNaN(parseInt(value, 10))));
	}
	
	
	
	
	
	// check for decimal
	function isDecimal(value) {
		return (typeof(value) === 'number' ||
				(typeof(value) === 'string' && !isNaN(parseFloat(value, 10))));
	}
	
	
	
	
	
	// check for boolean
	function isBoolean(value) {
		return (typeof(value) === 'boolean' ||
				(typeof(value) === 'number' && (value === 1 || value === 0)) ||
				(typeof(value) === 'string' && (value.toLowerCase() === 'true' ||
						value.toLowerCase() === 'false' || value === '1' || value === '0')));
	}
	
	
	
	
	
	// check for date
	function isDate(value) {
		return (value instanceof Date ||
				(typeof(value) === 'string' && !isNaN(Date.parse(value))));
	}
	
	
	
	
	
	// check for time
	function isTime(value) {
		return (typeof(value) === 'string' && !isNaN(Date.parse('1981-08-03 ' + value)));
	}
	
	
	
	
	
	// check for json object
	function isJSON(value) {
		
		try {
			if (typeof (value) === 'object') {
				value = JSON.stringify(value);
			}
			
			JSON.parse(value);
			return true;
		}
		catch(e) {
			return false;
		}
	}
	
	
	
	
	
	// for returning a status instead of an object. can be used to speed up save operations
	function statusPromise(code) {

		return new Promise(function(resolve) {
			resolve(code);
		});
	}
	
	
	
	
	
	// get the common property of 2 lists
	function getCommonPropValue(sourceList, compareList) {
		
		// check that both arguments are arrays
		if (!Array.isArray(sourceList) || !Array.isArray(compareList)) {
			return '';
		}
		
		
		// look through each source and evaluate against the compare list
		for (var i = 0; i < sourceList.length; i++) {
			for (var j = 0; j < compareList.length; j++) {
				if (sourceList[i] === compareList[j]) {
					return compareList[j];
				}
			}
		}
		
		
		// if the function did not return true by now, then there are no
		// common properties
		return '';
	}


	
	
	
	// function to get the primary keys for use as an id attribute
	// per bookshelf.js documentation, composite keys should be
	// an array of primary keys
	function getIdAttribute(tableSchema) {

		
		// if the schema is not an object return an empty list
		if (typeof (tableSchema) !== 'object') {
			return null;
		}
		
		
		// get the primary keys using knex-schemers function
		var keys = schemer.manager.getPrimaryKeys(tableSchema);
		
		
		if (keys.length === 0) {
			return null;
		}
		else if (keys.length === 1) {
			return keys[0];
		}
		else {
			return keys;
		}
	}
	
	
	
	
	
	// creates a list of properties to use when filtering the model
	// the list is then used by dotprune to prune the unwanted properties
	function compileViewFilter(view, table, schema, prefix) {
		
		
		var list = [];
		
		
		// make sure the table has a schema
		if (typeof (schema) === 'object' &&
				schema.hasOwnProperty(table) &&
				typeof (schema[table]) === 'object') {
			
			var tableSchema = schema[table];
			var cols        = Object.keys(tableSchema);
			
			
			for (var i = 0; i < cols.length; i++) {
				
				
				var colName   = cols[i];
				var colSchema = tableSchema[colName];
				var colKeys   = Object.keys(colSchema);
				
				
				// check if the current column has a views property and that
				// its value contains the view specified
				if (colSchema.hasOwnProperty(constants.views) &&
						colSchema[constants.views].indexOf(view) !== -1) {
					
					
					// check if the column is a relation column
					var rel = getCommonPropValue(colKeys, relations);
					
					
					// update the prefix for nested tables
					colName = (prefix.length > 0) ? prefix + '.' + colName : colName;
					list.push(colName);
					
					
					// if the column is a relation column, recursively get views and add them
					// to the list by merging the results
					if (colSchema.hasOwnProperty(rel)) {
						list = _.union(list, compileViewFilter(view, colSchema[rel], schema, colName));
					}
				}
			}
		}
		
		return list;
	}

	
	
	
	// function to find all related data for an entity
	function getRelated(modelName) {
		
		var schemaRefs = [];
		//var refs       = [];
		
		// look at the schema definition and find any references. essentially this
		// is only looking for hasOne and hasMany relationships since belongsTo is
		// defined on the model being deleted and belongsToMany can be deleted from
		// the junction table without impacting other models directly
		_.forEach(global._factoryModels._schema, function(tableSchema, tableName) {
			_.forEach(tableSchema, function(colSchema, colName) {
				
				
				// look for relations
				var relKey = getCommonPropValue(Object.keys(colSchema), relations);
				
				
				// if there is a relation and it matches the 
				// model add it to the schema references
				if (relKey !== '' && colSchema[relKey] === modelName) {
					schemaRefs.push({
						table: tableName,
						column: colName,
						type: relKey,
						columnSchema: colSchema
					});
				}
			});
		});
		
		return schemaRefs;
	}
	
	
	
	// function to conver value to boolean
	function toBoolean(value) {
		var strValue = String(value).toLowerCase();
		strValue = ((!isNaN(strValue) && strValue !== '0') &&
				strValue !== '' &&
				strValue !== 'null' &&
				strValue !== 'undefined') ? '1' : strValue;
		return strValue === 'true' || strValue === '1' ? true : false;
	}
	
	
	
	// function to return utc timestamp sql for specific databases
	function getUTCSQL(db) {
		if (db === 'mysql') {
			return 'UTC_TIMESTAMP()';
		}
		else {
			return 'NOW()';
		}
	}
	
	
	
	
	// function to get the server time and a uuid
	function getServerTime() {
		
		var date  = new Date();
		var uuid1 = uuid.v1({
			msecs: (new Date()).getTime()
		});
		var uuid2 = uuid.v1({
			msecs: (new Date()).getTime()
		});
		return {
			date: date,
			uuid1: uuid1,
			uuid2: uuid2
		};
	}
	
	
	// function to get the current time from the time source
	function getTime() {
		
		// try to the uuids and date from the database
		return config.knex.raw('SELECT UUID() AS uuid1, UUID() AS uuid2, UTC_TIMESTAMP() AS date')
		.then(function(results) {
			if (results.length > 0 && results[0].length > 0) {
				return results[0][0];
			}
			
			return getServerTime();
		});
	}
	
	
	function getVersionedColumns(tableSchema) {
		
		return _.omit(_.mapKeys(tableSchema, function(value, key) {
			if (value.hasOwnProperty('versioned') && value.versioned === true) {
				return key;
			}
		}), 'undefined');
	}
	
	
	function isVersioned(tableSchema) {
		
		
		var schema = getVersionedColumns(tableSchema);
		var keys   = Object.keys(schema);
		
		for(var i = 0; i < keys.length; i++) {
			
			if (schema[keys[i]].versioned) {
				return true;
			}
		}
		
		return false;
	}
	
	
	
	// return public functions
	return {
		getCommonPropValue: getCommonPropValue,
		compileViewFilter: compileViewFilter,
		getIdAttribute: getIdAttribute,
		statusPromise: statusPromise,
		checkPayload: checkPayload,
		verifyEntities: verifyEntities,
		getRelated: getRelated,
		validValue: validValue,
		toBoolean: toBoolean,
		getUTCSQL: getUTCSQL,
		getTime: getTime,
		getServerTime: getServerTime,
		getVersionedColumns: getVersionedColumns,
		isVersioned: isVersioned
	};
	
};