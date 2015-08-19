// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: payload utils
//


module.exports = function(config) {
	
	var _         = config.lodash;
	var utils     = config.utils;
	var shortId   = config.shortId;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	var OPTS      = schemer.constants.options;
	var TYPE      = schemer.constants.type;
	
	// check the fields
	function checkPayload(table, payload, method, managedCheck, sysTime) {
		
		
		var schema       = global._factoryModels._schema;
		var tableSchema  = _.clone(schema[table], true);  // create a copy of the table schema, so we don't overwrite
		var idAttr       = utils.schema.getIdAttribute(schema[table]);
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
				
				
				// check for a field that should be transformed
				if (colSchema.hasOwnProperty('transform') &&
						typeof(colSchema.transform) === 'function' &&
						payload.hasOwnProperty(colName) &&
						payload[colName] !== null) {
					payload[colName] = colSchema.transform(payload[colName], method);
				}
				
				
				
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
						!utils.validate.validValue(tableSchema[key][OPTS.type], value)) {
					
					
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
					var targetPk    = utils.schema.getIdAttribute(schema[targetModel]);
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
								
	
								if (!utils.validate.validValue(targetType, value[i])) {
									
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
	
	
	
	// return public functions
	return {
		checkPayload: checkPayload
	};
};