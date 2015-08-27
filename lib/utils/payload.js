// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: pay-load utils
//


module.exports = function(config) {
	
	// constants
	var _SCMA     = config.statics.schema;
	var _FOPT     = config.statics.fetchOpts;
	var _INFO     = config.statics.info;
	var _JTYP     = config.statics.jsTypes;
	var _SCMR     = config.statics.schemer;
	var _ACT      = config.statics.actions;
	var _REL      = config.statics.relations;
	var relations = Object.keys(_REL);
	
	// modules
	var _         = config.lodash;
	var shortId   = config.shortId;
	var schemer   = config.schemer;
	var utils     = config.utils;
	var u         = utils.util;
	
	// function to prepare the pay-load for use
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
		

		// check for managed temporal objects that must be updated using the parent object
		if (tableSchema.hasOwnProperty(_SCMA._managed) &&
				u.is(opts, _FOPT._managedCheck)) {

			pkg.details.push({
				type: _INFO.type.error,
				message: 'This object is versioned and can only be updated ' +
				         'through the parent model ' + tableSchema._managed.model
			});
			pkg.valid = false;
		}
		else {
			
			// loop through each pay-load
			_.forEach(payload, function(p) {
				
				// create a new pay-load bundle item which will store the parent
				// and child pay-loads. for non temporal models, child will be null
				var plb = {
					parent: null,
					child: null
				};
				
				
				// validate that the pay-load is an object
				if (typeof(p) !== _JTYP.object) {
					pkg.valid = false;
					pkg.details.push({
						type: _INFO.type.error,
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
				
				
				// check for a temporal model
				var v = utils.schema.getVersionedModel(tableSchema, schema);
				
				
				// if the model is temporal create a clone and remove 
				// the system properties from the current pay-load
				if (v) {
					
					// create a deep clone of the temporal schema 
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
				
				
				// attempt to get the parent pay-load
				var pPayload = compilePayload(table, pSchema, p, true, null, sysTime, opts);
				
				
				// check for an invalid pay-load
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
					
					// attempt to get the child pay-load
					var cPayload = compilePayload(v, cSchema, p, false, pPayload.method, sysTime, opts);
					
					// check for an invalid pay-load
					if (!cPayload.valid) {
						pkg.valid = false;
						pkg.details = _.union(pkg.details, cPayload.details);
					}
					else {
						plb.child = cPayload;
					}
				}
				
				// push the pay-load bundle
				pkg.payloads.push(plb);
				
			});
		}
		
		// return the package
		return pkg;
		
	}
	
	
	// function to take a massaged schema and insert values into the pay-load
	function compilePayload(table, schema, payload, parent, method, sysTime, opts) {

		
		// check for a parameter to ignore invalid input and try to save anyway
		var ignoreInvalid = utils.util.is(opts, _FOPT.ignoreInvalid);
		
		// create a package to return
		var pkg = {
			where: {},
			method: method || _ACT.save,
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
				pkg.method        = _ACT.update;
			}
		}

		// loop through each field in the schema and
		// see if it exists in the pay-load
		_.forEach(schema, function(col, name) {
			
			// check if the column increments or has a default.
			// these will not be required in the pay-load
			var colKeys      = Object.keys(col);
			var increments   = col[_SCMR.options.increments] || false;
			var compositeId  = col.compositeId      || false;
			var hasType      = col.type             || false;
			var colDefault   = col.defaultTo        || null;
			var hasDefault   = col.hasOwnProperty(_SCMR.options.defaultTo) &&
			                   col[_SCMR.options.defaultTo] !== null;
			var protect      = col.hasOwnProperty(_SCMA.protect) && col.protect;
			var transform    = _.intersection(colKeys, _SCMA.saveTransforms);
			var relation     = _.intersection(colKeys, relations);
			var versioned    = col.versioned || false;
			
			// get specific values
			transform        = (transform.length > 0) ? transform[0] : null;
			relation         = (relation.length  > 0) ? relation[0]  : null;
			
			// check that the current column is in the pay-load
			if (payload.hasOwnProperty(name) && !protect) {
				
				var value       = payload[name];
				var doTransform = false;

				// check for transforms
				if (transform && value !== _SCMA._delete) {
					
					// determine the transforms
					var allTransform    = transform === _SCMA.transforms.transform;
					var saveTransform   = transform === _SCMA.transforms.saveTransform &&
					                      pkg.method === _ACT.save;
					var updateTransform = transform === _SCMA.transforms.updateTransform &&
					                      pkg.method === _ACT.update;
					
					// check if the transform can be performed
					if (allTransform || saveTransform || updateTransform) {
						doTransform = true;
					}

					// do the transform using a function
					if (doTransform && typeof(col[transform]) === _JTYP.funct) {
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
						type: _INFO.type.error,
						message: 'The payload contained invalid data for ' + name
					});
					
					return pkg;
				}
			}
			// otherwise check if the column should be auto-filled
			else if (compositeId && hasType && col.type === _SCMR.type.string &&
					pkg.method === _ACT.save) {
				pkg.payload[name] = table + '-' + shortId.generate();
			}
			// otherwise check for auto-incrementing uuids
			else if (increments && pkg.method === _ACT.save &&
					hasType && col.type === _SCMR.type.uuid) {
				pkg.payload[name] = parent ? sysTime.uuid1 : sysTime.uuid2;
			}
			// otherwise check if the column has a default and we are saving
			else if (colDefault && pkg.method === _ACT.save) {
				pkg.payload[name] = colDefault;
			}
			
			// otherwise check if the column is required and send error
			else if (schemer.util.required(col, name) && !increments && !ignoreInvalid) {
				pkg.valid = false;
				pkg.details.push({
					type: _INFO.type.error,
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