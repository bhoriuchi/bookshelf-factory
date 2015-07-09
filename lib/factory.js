// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Creates bookshelf models using knex-schemer's 
//              schema definition format
//










var _        = require('lodash');
var dotprune = require('dotprune');
var Promise  = require('bluebird');










// export the factory
module.exports = function(config) {
	
	
	// set up variables for modules that can be passed in the config
	var knex, bookshelf, schemer;
	
	
	
	
	
	
	
	
	
	
	// validate the configuration is an object
	if (typeof (config) !== 'object') {
		return null;
	}
	
	
	// check for knex instance
	if (config.hasOwnProperty('knex')) {
		knex = config.knex;
	}
	
	
	// if no knex, check for bookshelf
	else if (config.hasOwnProperty('bookshelf')) {
		knex = config.bookshelf.knex;
	}
	
	// if no bookshelf, check for a db config
	else if (config.hasOwnProperty('client') && config.hasOwnProperty('connection')) {
		knex = require('knex')(config);
	}
	
	// if no knex or bookshelf or db config, return null
	else {
		console.log('Error: Could not find knex, bookshelf, or database config object');
		return null;
	}
	
	
	// set bookshelf and schemer instance
	bookshelf = config.bookshelf || require('bookshelf')(knex);
	schemer   = config.schemer   || require('knex-schemer')(knex);
	

	
	
	
	

	
	
	
	// import the constants
	var constants = require('./static/constants')({
		schemer: schemer,
		lodash: _
	});

	
	
	
	
	
	
	
	
	
	// define relations types
	var relations = [
        constants.hasOne,
        constants.hasMany,
        constants.belongsTo,
        constants.belongsToMany
	];
	
	
	
	
	
	
	
	
	
	
	// set up an object to pass to the helper modules
	var mods = {
		lodash: _,
		bookshelf: bookshelf,
		knex: knex,
		constants: constants,
		relations: relations,
		schemer: schemer,
		promise: Promise,
		dotprune: dotprune
	};
	
	
	
	
	
	
	
	
	
	
	// import the helpers
	var util          = require('./util/util')(mods);
	mods              = _.merge(mods, { util:util });
	var schemaUtil    = require('./util/schema-util')(mods);
	mods              = _.merge(mods, { schema: schemaUtil });

	
	
	
	
	
	
	
	
	
	// function to produce an object of models
	function create(schema) {
		
		
		
		
		
		var STATUS                        = constants.statusCodes;
		global._factoryModels             = {};
		global._factoryModels._relations  = {};
		global._factoryModels._schema     = schema;
		
		
		
		
		
		// import the custom methods
		var methods = require('./methods')(mods);
		
		
		
		
		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {
			
			
			
			
			
			//var tableCols   = Object.keys(tableSchema);
			global._factoryModels._relations[tableName] = [];
			
			
			
			
			
			// extend bookshelf prototype
			var objProto = {
					tableName: tableName,
					defaults: {}
			};
			
			
			
			
			
			// extend bookshelf class
			var objClass = {};
			
			
			
			
			
			// loop through the current table columns
			_.forEach(tableSchema, function(col, colName) {

				
				
				
				
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
					global._factoryModels._relations[tableName].push(colName);
					
					
					objProto[colName] = function() {
						return this.hasOne(global._factoryModels[hasOne_modelName], hasOne_fk);
					};
				}
				
				
				
				
				
				// check for hasMany
				else if (col.hasOwnProperty(constants.hasMany)) {
					
					
					var hasMany_modelName = col[constants.hasMany];
					var hasMany_fk        = col[constants.foreignKey] || null;
					global._factoryModels._relations[tableName].push(colName);
					
					
					objProto[colName] = function() {
						return this.hasMany(global._factoryModels[hasMany_modelName], hasMany_fk);
					};
				}
				

				
				
				
				// check for belongsTo
				else if (col.hasOwnProperty(constants.belongsTo)) {
					
					
					var belongsTo_modelName = col[constants.belongsTo];
					var belongsTo_fk        = col[constants.foreignKey] || null;
					global._factoryModels._relations[tableName].push(colName);
					
					
					objProto[colName] = function() {
						return this.belongsTo(global._factoryModels[belongsTo_modelName], belongsTo_fk);
					};
				}

				
				
				
				
				// check for belongsToMany
				else if (col.hasOwnProperty(constants.belongsToMany)) {
					
					
					var btm_modelName = col[constants.belongsToMany];
					var btm_fk        = col[constants.foreignKey] || null;
					var junction      = col[constants.junction] || null;
					var otherKey      = col[constants.otherKey] || null;
					global._factoryModels._relations[tableName].push(colName);
					

					objProto[colName] = function() {
						return this.belongsToMany(global._factoryModels[btm_modelName], junction, btm_fk, otherKey);
					};
				}
				
				
				
				
				
				// check for defaults and add them to the models defaults property
				if (col.hasOwnProperty(schemer.constants.options.defaultTo)) {
					objProto.defaults[colName] = col[schemer.constants.options.defaultTo];
				}
			});
			

			
				
			
			// add custom functions and properties
			objProto.idAttribute     = util.getIdAttribute(global._factoryModels._schema[tableName]);
			objProto.getRelations    = methods.getRelations;
			objProto.getResources    = methods.getResources;
			objProto.getResource     = methods.getResource;
			objProto.saveResource    = methods.saveResource;
			objProto.deleteResource  = methods.deleteResource;
			objProto.view            = methods.view;
			objProto.pretty          = methods.pretty;
			
			
			
			
			
			// create the model in the global factory store
			global._factoryModels[tableName] = bookshelf.Model.extend(objProto, objClass);
		});
		
		
		// return all of the models
		return global._factoryModels;
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
		filter: dotprune.prune,
		prepareSchema: schemaUtil.prepareSchema
	};
};