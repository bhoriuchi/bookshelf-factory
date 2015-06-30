// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Creates bookshelf models using knex-schemer's 
//              schema definition format
//


var dotprune = require('dotprune');
var _        = require('lodash');
var Promise  = require('bluebird');




module.exports = function(config) {
	
	
	// validate the config
	if (typeof (config) !== 'object' ||
			!config.hasOwnProperty('client') ||
			!config.hasOwnProperty('connection')) {
		return null;
	}
	
	
	
	
	
	// set up knex, bookshelf, etc...
	var knex      = require('knex')(config);
	var bookshelf = require('bookshelf')(knex);
	var schemer   = require('knex-schemer')(knex);
	
	
	
	
	
	// define constants used for lookup in schema
	var constants = {
			foreignKey: 'foreignKey',
			junction: 'junction',
			otherKey: 'otherKey',
			views: 'views'
	};
	
	
	
	
	
	// add the constants from knex schemer 
	_.merge(constants, schemer.constants.relations);
	_.merge(constants, schemer.constants.extend);

	
	
	
	
	// define relations types array. this will be used 
	// in the getRelations function
	var relations = [
        constants.hasOne,
        constants.hasMany,
        constants.belongsTo,
        constants.belongsToMany
	];
	
	
	// set up an object to pass to the helper modules
	var mods = {
		lodash: _,
		constants: constants,
		relations: relations,
		schemer: schemer
	};
	
	// import the helpers
	var util   = require('./util')(mods);
	var schema = require('./schema')(mods, util);
	
	
	
	
	// function to produce an object of models
	function create(schema) {
		
		
		var tables          = Object.keys(schema);
		var models          = {};
		models._relations   = {};
		models._schema      = schema;
		
		
		
		
		
		for(var i = 0; i < tables.length; i++) {
			
			
			var tableName   = tables[i];
			var tableSchema = schema[tableName];
			var tableCols   = Object.keys(tableSchema);
			models._relations[tableName] = [];
			
			
			// extend bookshelf prototype
			var objProto = {
					tableName: tableName
			};
			
			// extend bookshelf class
			var objClass = {};
			
			// loop through the current table columns
			for(var j = 0; j < tableCols.length; j++) {
				
				
				var colName    = tableCols[j];
				var col        = tableSchema[colName];
				
				
				
				
				
				// check if the column has an extendProto property
				if (col.hasOwnProperty(constants.extendProto) &&
						(typeof (col[constants.extendProto]) === 'object' ||
								typeof (col[constants.extendProto]) === 'function')) {
					
					// add the extend value as the value for the current field/column name
					objProto[colName] = col[constants.extendProto];
				}
				
				
				// check if the column has an extendClass property
				else if (col.hasOwnProperty(constants.extendClass) &&
						(typeof (col[constants.extendClass]) === 'object' ||
								typeof (col[constants.extendClass]) === 'function')) {
					
					// add the extend value as the value for the current field/column name
					objClass[colName] = col[constants.extendClass];
				}
				
				
				// check for hasOne relations
				else if (col.hasOwnProperty(constants.hasOne)) {
					
					var hasOne_modelName = col[constants.hasOne];
					var hasOne_fk        = col[constants.foreignKey] || null;
					models._relations[tableName].push(colName);
					
					objProto[colName] = function() {
						return this.hasOne(models[hasOne_modelName], hasOne_fk);
					};
				}
				
				
				// check for hasMany
				else if (col.hasOwnProperty(constants.hasMany)) {
					
					var hasMany_modelName = col[constants.hasMany];
					var hasMany_fk        = col[constants.foreignKey] || null;
					models._relations[tableName].push(colName);
					
					objProto[colName] = function() {
						return this.hasMany(models[hasMany_modelName], hasMany_fk);
					};
				}
				

				// check for belongsTo
				else if (col.hasOwnProperty(constants.belongsTo)) {
					
					var belongsTo_modelName = col[constants.belongsTo];
					var belongsTo_fk        = col[constants.foreignKey] || null;
					models._relations[tableName].push(colName);
					
					objProto[colName] = function() {
						return this.belongsTo(models[belongsTo_modelName], belongsTo_fk);
					};
				}

				
				// check for belongsToMany
				else if (col.hasOwnProperty(constants.belongsToMany)) {

					//var btmArr = [tableName, col[constants.belongsToMany]].sort().join('_');
					//console.log(btmArr);
					
					var btm_modelName = col[constants.belongsToMany];
					var btm_fk        = col[constants.foreignKey] || null;
					var junction      = col[constants.junction] || null;
					var otherKey            = col[constants.otherKey] || null;
					models._relations[tableName].push(colName);

					
					objProto[colName] = function() {
						return this.belongsToMany(models[btm_modelName], junction, btm_fk, otherKey);
					};
				}
			}
			
			
			
			
			
			// set the id attribute
			objProto.idAttribute = util.getIdAttribute(models._schema[tableName]);
			

			
			
			
			// add a function to get relations
			objProto.getRelations = function() {
				return models._relations[this.tableName];
			};
			
			
			
			
			
			// add a function to get resource
			objProto.getResources = function(fetchOpts, jsonOpts) {
				
				
				// set an object for fetch opts if it wasnt provided
				fetchOpts = fetchOpts || {};
				jsonOpts  = jsonOpts || { omitPivot: true };
				
				
				// set the relation for fetch
				fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
						fetchOpts.withReltated : models._relations[this.tableName];
				
				
				// get the view properties as a local variable
				var keep   = this._keep;
				var pretty = this._pretty;
				
				// get the results. use a user defined function to plug into knex for filtering
				// and also prune the results if a view is specified
				return this.fetchAll(fetchOpts).then(function(results) {
					
					var resultObject = dotprune.prune(results.toJSON(jsonOpts), keep);
					
					if (typeof (pretty) === 'object' && pretty.enabled) {
						return JSON.stringify(resultObject, null, pretty.spacing);
					}
					else {
						return resultObject;
					}
				});
			};

			
			
			
			
			// get a single resource by id
			objProto.getResource = function(id, fetchOpts, jsonOpts) {
				
				
				var where = {};
				id = id || [];
				
				
				// set an object for fetch opts if it wasnt provided
				fetchOpts = fetchOpts || {};
				jsonOpts = jsonOpts || { omitPivot: true };
				
				
				// currently only support tables with a primary key
				if (!Array.isArray(id)) {
					
					// set the where object
					where[this.idAttribute] = id;
					
					return this.where(where).getResources(fetchOpts, jsonOpts);
				}
				else {
					return new Promise(function(resolve) {
						resolve(null);
					});
				}
			};

			

			
			
			// save the resource
			objProto.saveResource = function(obj, id) {
				
				var where  = {};
				var idAttr = this.idAttribute;
				var keep   = this._keep;
				var pretty = this._pretty;
				
				id = (obj.hasOwnProperty(this.idAttribute)) ? obj[this.idAttribute] : id || [];
				
				// check if a single id was supplied
				if (!Array.isArray(id)) {
					
					// set the where object
					where[idAttr] = id;
					
					// forge a new instance using the id and save it
					return models[this.tableName].forge(where)
					.save(obj)
					.then(function(model) {
						
						if (typeof (pretty) === 'object' && pretty.enabled) {
							return model.view(keep).pretty(pretty.spacing).getResource(model.attributes[idAttr]);
						}
						else {
							return model.view(keep).getResource(model.attributes[idAttr]);
						}
					});
				}
				else {
					return this.save(obj);
				}
			};
			
			
			
			
			
			// remove the resource and any junction table entries
			objProto.deleteResource = function(id) {
				var where = {};
				// currently only support tables with a primary key
				if (!Array.isArray(id)) {
					
					// set the where object
					where[this.idAttribute] = id;
					
					return this.where(where).destroy();
				}
				else {
					return new Promise(function(resolve) {
						resolve(null);
					});
				}
			};
			
			
			
			
			
			// chain-able view function. if an array is passed as the parameter, use the values in the array
			// as the keep values, otherwise evaluate the object
			objProto.view = function(view) {
				view = view || ''; 
				
				this._keep = (Array.isArray(view)) ? view : util.compileViewFilter(view, this.tableName, models._schema, '');
				return this;
			};
			
			
			
			
			
			// option to pretty print the object
			objProto.pretty = function(spacing) {
				spacing = spacing || '  ';
				
				this._pretty = { enabled: true, spacing: spacing };
				return this;
			}
			
			
			
			
			
			// create model
			models[tableName] = bookshelf.Model.extend(objProto, objClass);
		}
		
		
		// return all of the models
		return models;
	}
	
	
	
	
	
	// return public functions and variables
	return {
		create: create,
		bookshelf: bookshelf,
		knex: knex,
		schemer: schemer,
		constants: constants,
		config: config,
		util: util,
		filter: function (obj, keep) {
			return dotprune.prune(obj, keep);
		},
		prepareSchema: schema.prepareSchema
	};
};