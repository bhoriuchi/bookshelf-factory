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
			var versioned    = col.versioned || false;
			
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
					if (doTransform && typeof(col[transform]) === 'function') {
						pkg.payload[name] = col[transform](value);
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

					var modelVersion = col[relation] + 'version';
					var hasVersion   = global._factoryModels._schema.hasOwnProperty(modelVersion);
					var foreignKey   = col.foreignKey || null;

					// determine if the relation should have version appended
					var modelName = (!parent && versioned && hasVersion) ? modelVersion : col[relation];

					// push the relation
					pkg.relations.push({
						model: modelName,
						type: relation,
						field: name,
						value: value,
						versioned: versioned,
						foreignKey: foreignKey
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
	
	// return public functions
	return {
		preparePayload: preparePayload,
		compilePayload: compilePayload
	};
};