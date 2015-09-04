// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Creates bookshelf models using knex-schemer's 
//              schema definition format
//


// export the factory
module.exports = function(config) {

	
	// set up modules that will be used
	var _        = require('lodash');
	var moment   = require('moment');
	var dotprune = require('dotprune');
	var promise  = require('bluebird');
	var uuid     = require('node-uuid');
	var shortId  = require('shortid');
	
	
	// determine the worker id to use in shortId for clustered usage
	var workerId = (
			_.has(config, 'worker.id') &&
			typeof(config.worker.id) === 'number' &&
			config.worker.id >= 0 &&
			config.worker.id <= 16
			) ? config.worker.id : 0;
	
	shortId.worker(workerId);
	
	
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
	
	// import statics module
	var statics     = require('./statics');
	
	// insert the knex-schemer constants into statics
	var _SCMR       = schemer.constants;
	statics.schemer = _SCMR;
	
	// get other constants to use
	var _JTYP       = statics.jsTypes;
	var _SCMA       = statics.schema;
	var _REL        = statics.relations;

	// set up an object to pass to the helper modules
	var mods = {
		lodash: _,
		moment: moment,
		uuid: uuid,
		shortId: shortId,
		bookshelf: bookshelf,
		knex: knex,
		statics: statics,
		schemer: schemer,
		promise: promise,
		dotprune: dotprune
	};
	
	// import the helpers
	mods.utils = require('./utils')(mods);

	
	// function to wrap a chain in a single transaction
	function transaction(chain) {

		// create a bookshelf transaction
		return bookshelf.transaction(function(t) {

			// call the chain function and pass the transaction
			var c = chain(t);

			// check if the user supplied an end function and
			// add it if necessary
			if (typeof(c.then) === _JTYP.funct) {
				return c;
			}
			else {
				return c.end();
			}
		});
	}
	
	// function to get the current time
	function time(opts) {
		
		// set default options
		opts           = opts           || {};
		opts.fetchOpts = opts.fetchOpts || {};
		
		return mods.utils.sql.getTime(opts.fetchOpts).then(function(sysTime) {
			
			if (opts.format !== null && opts.format !== undefined) {
				return moment(sysTime.date).format(opts.format);
			}
			
			return sysTime.date;
		});
	}
	
	
	// function to produce an object of models
	function create(schema, opts) {
		
		// check for create options, default to prepare schema
		opts = opts || {};
		opts.prepareSchema = (opts.prepareSchema === false) ? false : true;
		
		// prepare the schema if specified. the default is to prepare
		schema = opts.prepareSchema ?
				 mods.utils.schema.prepareSchema(schema) : schema;
		schema = schema || {};
		
		// create the global factory models object
		global._factoryModels             = {};
		global._factoryModels._relations  = {};
		global._factoryModels._schema     = schema;

		// import the custom methods
		var methods = require('./methods')(mods);

		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {

			// create an empty relations array for the table schema
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
				if (col.hasOwnProperty(_SCMR.extend.extendProto) &&
						(typeof (col.extendProto) === _JTYP.object ||
								typeof (col.extendProto) === _JTYP.funct)) {

					// add the extend value as the value for the current field/column name
					objProto[colName] = col.extendProto;
				}
				
				// check if the column has an extendClass property
				else if (col.hasOwnProperty(_SCMR.extend.extendClass) &&
						(typeof (col.extendClass) === _JTYP.object ||
								typeof (col.extendClass) === _JTYP.funct)) {
					
					// add the extend value as the value for the current field/column name
					objClass[colName] = col.extendClass;
				}
				
				// check for hasOne relations
				else if (col.hasOwnProperty(_REL.hasOne)) {
					
					// get the model name and foreign key
					var hasOne_modelName = col.hasOne;
					var hasOne_fk        = col.foreignKey || null;
					global._factoryModels._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.hasOne(global._factoryModels[hasOne_modelName], hasOne_fk);
					};
				}
				
				// check for hasMany
				else if (col.hasOwnProperty(_REL.hasMany)) {
					
					// get the model name and foreign key
					var hasMany_modelName = col.hasMany;
					var hasMany_fk        = col.foreignKey || null;
					global._factoryModels._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.hasMany(global._factoryModels[hasMany_modelName], hasMany_fk);
					};
				}
				
				// check for belongsTo
				else if (col.hasOwnProperty(_REL.belongsTo)) {
					
					// get the model name and foreign key
					var belongsTo_modelName = col.belongsTo;
					var belongsTo_fk        = col.foreignKey || null;
					global._factoryModels._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.belongsTo(global._factoryModels[belongsTo_modelName], belongsTo_fk);
					};
				}

				// check for belongsToMany
				else if (col.hasOwnProperty(_REL.belongsToMany)) {
					
					// get the model name, foreign key, other key, and junction table name
					var btm_modelName = col.belongsToMany;
					var btm_fk        = col.foreignKey || null;
					var junction      = col.junction   || null;
					var otherKey      = col.otherKey   || null;
					global._factoryModels._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.belongsToMany(global._factoryModels[btm_modelName], junction, btm_fk, otherKey);
					};
				}
				
				// check for defaults and add them to the models defaults property if they
				// are not an ignor-able field
				if (col.hasOwnProperty(_SCMR.options.defaultTo) && !schemer.util.ignorable(col, colName)) {
					objProto.defaults[colName] = col.defaultTo;
				}
			});
			
			// check for temporal object and add temporal functions
			if (tableSchema.hasOwnProperty(_SCMA._versioned)) {
				objProto.publish     = methods.publish;
				objProto.activate    = methods.activate;
			}
			
			// add custom functions and properties
			objProto.idAttribute     = mods.utils.schema.getIdAttribute(global._factoryModels._schema[tableName]);
			objProto.transaction     = methods.transaction;
			objProto.getRelations    = methods.getRelations;
			objProto.getResources    = methods.getResources;
			objProto.getResource     = methods.getResource;
			objProto.saveResource    = methods.saveResource;
			objProto.cloneResource   = methods.cloneResource;
			objProto.deleteResource  = methods.deleteResource;
			objProto.view            = methods.view;
			objProto.search          = methods.search;
			objProto.reset           = methods.reset;
			objProto.print           = methods.print;
			objProto.end             = methods.end;
			
			// create the model in the global factory store
			global._factoryModels[tableName] = bookshelf.Model.extend(objProto, objClass);
		});
		
		// return all of the models
		return global._factoryModels;
	}
	
	
	// return public functions and variables
	return {
		
		// constants
		config: config,
		statics: statics,
		
		// API methods
		create: create,
		transaction: transaction,
		time: time,
		utils: mods.utils,
		filter: dotprune.prune,
		schemaUtil: mods.utils.schema,
		prepareSchema: mods.utils.schema.prepareSchema,
		
		// modules
		mods: mods,
		knex: knex,
		bookshelf: bookshelf,
		schemer: schemer,

		// models and schema
		models: global._factoryModels,
		getSchema: function() { return global._factoryModels._schema; }
	};
};