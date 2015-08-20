// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: payload utils
//


module.exports = function(config) {
	
	var _         = config.lodash;
	var utils     = config.utils;
	var u         = utils.util;
	var shortId   = config.shortId;
	var constants = config.constants;
	var relations = config.relations;
	var schemer   = config.schemer;
	var OPTS      = schemer.constants.options;
	var TYPE      = schemer.constants.type;
	var METHOD    = constants.methods;
	
	
	// function to prepare the payload for use
	function preparePayload(table, payload, sysTime, opts) {
	
		opts             = opts || {};
		payload          = (Array.isArray(payload)) ? payload : [payload];
		
		var schema       = global._factoryModels._schema;
		var tableSchema  = schema[table];
		var idAttr       = utils.schema.getIdAttribute(tableSchema);
		var priSchema    = tableSchema[idAttr];
		var details      = [];
		var passed       = true;
		var versioned    = false;
		var pl           = {};
		var childId      = null;
		var pSchema, cSchema;
		
		
		// prepare a package to return to the calling method
		var pkg = {
			payloads: [],
			details: [],
			valid: true
		};
		

		// check for managed versioned objects that must be updated using the parent object
		if (tableSchema.hasOwnProperty('_managed') && u.is(opts, 'managedCheck')) {

			pkg.details.push({
				type: constants.error,
				message: 'This object is versioned and can only be updated through the parent model ' + tableSchema._managed.model
			});
			pkg.valid = false;
		}
		else {
			
			// loop through each payload
			_.forEach(payload, function(p) {
				
				// create a new payload bundle item which will store the parent
				// and child payloads. for non versioned models, child will be null
				var plb = {
					parent: null,
					child: null
				};
				
				
				// validate that the payload is an object
				if (typeof(p) !== 'object') {
					pkg.valid = false;
					pkg.details.push({
						type: constants.error,
						message: 'The payload is not correctly formatted'
					});
					return pkg;
				}
				
				// create a deep clone of the main schema 
				// to use and remove any _ fields
				pSchema = _.clone(tableSchema, true);
				pSchema = _.pick(pSchema, function(value, key) {
					return key[0] !== '_';
				});
				
				
				// check for a versioned model
				var v = utils.schema.getVersionedModel(tableSchema, schema);
				
				
				// if the model is versioned create a clone and remove 
				// the system properties from the current payload
				if (v) {
					
					// create a deep clone of the versioned schema 
					// to use and remove any _ fields
					cSchema = _.clone(schema[v], true);
					cSchema = _.pick(cSchema, function(value, key) {
						return key[0] !== '_';
					});
					
					// remove system edited fields from the parent
					delete pSchema.active;
					delete pSchema.current_version;
					
					// remove system edited fields from the child
					delete cSchema.parent_id;
					delete cSchema.version;
					delete cSchema.published;
					delete cSchema.valid_from;
					delete cSchema.valid_to;

				}
				
				
				// attempt to get the parent payload
				var pPayload = compilePayload(table, pSchema, p, true, null, sysTime, opts);
				
				
				// check for an invalid payload
				if (!pPayload.valid) {
					pkg.valid = false;
					pkg.details = _.union(pkg.details, pPayload.details);
				}
				else {
					plb.parent = pPayload;
				}
				
				
				// since we will use the same method for the child as the parent
				// this code needs to run after the parent method is determined
				if (v) {
					
					// attempt to get the child payload
					var cPayload = compilePayload(v, cSchema, p, false, pPayload.method, sysTime, opts);
					
					// check for an invalid payload
					if (!cPayload.valid) {
						pkg.valid = false;
						pkg.details = _.union(pkg.details, cPayload.details);
					}
					else {
						plb.child = cPayload;
					}
				}
				
				
				// push the payload bundle
				pkg.payloads.push(plb);
				
			});
		}
		
		
		// return the package
		return pkg;
		
	}
	
	
	// function to take a massaged schema and insert values into the payload
	function compilePayload(table, schema, payload, parent, method, sysTime, opts) {

		
		// check for a parameter to ignore invalid input and try to save anyway
		var ignoreInvalid = utils.util.is(opts, 'ignoreInvalid');
		
		// create a package to return
		var pkg = {
			where: {},
			method: method || METHOD.save,
			parent: parent,
			model: table,
			payload: {},
			relations: [],
			details: [],
			valid: true
		};
		
		
		// if checking a parent, look for an id
		if (parent) {

			// check for an id attribute
			var idAttr = utils.schema.getIdAttribute(schema);
			var id     = payload.hasOwnProperty(idAttr) ? payload[idAttr] : null;
			
			// if there is an id add it to the where
			if (id) {
				pkg.where[idAttr] = id;
				pkg.method        = METHOD.update;
			}
		}

		
		
		
		// loop through each field in the schema and
		// see if it exists in the payload
		_.forEach(schema, function(col, name) {
			
			// check if the column increments or has a default. these will not be required in the payload
			var colKeys      = Object.keys(col);
			var increments   = col[OPTS.increments] || false;
			var compositeId  = col.compositeId      || false;
			var hasType      = col.type             || false;
			var colDefault   = col.defaultTo        || null;
			var hasDefault   = col.hasOwnProperty(OPTS.defaultTo) && col[OPTS.defaultTo] !== null;
			var protect      = col.hasOwnProperty('protect') && col.protect;
			var transform    = _.intersection(colKeys, constants.saveTransforms);
			var relation     = _.intersection(colKeys, relations);
			
			// get specific values
			transform        = (transform.length > 0) ? transform[0] : null;
			relation         = (relation.length  > 0) ? relation[0]  : null;
			
			// check that the current column is in the payload
			if (payload.hasOwnProperty(name) && !protect) {
				
				var value       = payload[name];
				var doTransform = false;

				// check for transforms
				if (transform && value !== '_delete') {
					
					// determine the transforms
					var allTransform    = transform === constants.transforms.transform;
					var saveTransform   = transform === constants.transforms.saveTransform &&
					                      pkg.method === METHOD.save;
					var updateTransform = transform === constants.transforms.updateTransform &&
					                      pkg.method === METHOD.update;
					
					// check if the transform can be performed
					if (allTransform || saveTransform || updateTransform) {
						doTransform = true;
					}

					
					// do the transform using a function
					if (doTransform && typeof(value) === 'function') {
						pkg.payload[name] = col[transform[0]](value);
					}
					// or a valid type
					else if (doTransform && hasType &&
							utils.validate.validValue(col.type, value)) {
						pkg.payload[name] = value;
					}
				}
				// otherwise if the value is a relation, add it to the relations array
				// to be processed later. null will be accepted as a value
				else if (relation) {
					pkg.relations.push({
						model: col[relation],
						type: relation,
						field: name,
						value: value
					});
				}
				// all other values should be checked to make sure they are valid
				else if (hasType &&
						utils.validate.validValue(col.type, value)) {
					pkg.payload[name] = value;
				}
				// anything else is invalid and should throw an 
				// error unless ignore invalid is set in the options
				else if (!ignoreInvalid) {
					pkg.valid = false;
					pkg.details.push({
						type: constants.error,
						message: 'The payload contained invalid data for ' + name	
					});
					
					return pkg;
				}
			}
			// otherwise check if the column should be auto-filled
			else if (compositeId && hasType && col.type === TYPE.string &&
					pkg.method === METHOD.save) {				
				pkg.payload[name] = table + '-' + shortId.generate();
			}
			// otherwise check for auto-incrementing uuids
			else if (increments && pkg.method === METHOD.save &&
					hasType && col.type === TYPE.uuid) {
				pkg.payload[name] = parent ? sysTime.uuid1 : sysTime.uuid2;
			}
			// otherwise check if the column has a default and we are saving
			else if (colDefault && pkg.method === METHOD.save) {
				pkg.payload[name] = colDefault;
			}
			
			// otherwise check if the column is required and send error
			else if (schemer.util.required(col, name) && !increments && !ignoreInvalid) {
				pkg.valid = false;
				pkg.details.push({
					type: constants.error,
					message: 'The ' + table + ' payload is missing data for ' + name	
				});
				
				return pkg;
			}
		});
		
		// return the package
		return pkg;
	}
	
	
	
	/* deprecating old code
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
	}*/
	
	
	
	// return public functions
	return {
		preparePayload: preparePayload,
		compilePayload: compilePayload
	};
};