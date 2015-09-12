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
	var qs       = require('qs');
	
	
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
	
	// bookshelf plugins
	bookshelf.plugin('registry');
	
	
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
		registry: {},
		lodash: _,
		qs: qs,
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


	// model selector
	mods.models = function(version) {
		version = version || '0.0.1';
		return mods.registry[version];
	};
	
	
	// import the custom methods
	mods.methods = require('./methods')(mods);
	
	// transaction
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
		
		var methods        = mods.methods;
		
		// check for create options, default to prepare schema
		opts               = opts || {};
		opts.prepareSchema = (opts.prepareSchema === false) ? false : true;
		opts.version       = opts.version || '0.0.1';
		
		// prepare the schema if specified. the default is to prepare
		schema = opts.prepareSchema ?
				 mods.utils.schema.prepareSchema(schema) : schema;
		schema = schema || {};
		
		// create the global factory models object
		mods.registry[opts.version]             = {};
		mods.registry[opts.version]._relations  = {};
		mods.registry[opts.version]._schema     = schema;
		
		// loop through each table
		_.forEach(schema, function(tableSchema, tableName) {

			// create an empty relations array for the table schema
			mods.registry[opts.version]._relations[tableName] = [];

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
					mods.registry[opts.version]._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.hasOne(mods.registry[opts.version][hasOne_modelName], hasOne_fk);
					};
				}
				
				// check for hasMany
				else if (col.hasOwnProperty(_REL.hasMany)) {
					
					// get the model name and foreign key
					var hasMany_modelName = col.hasMany;
					var hasMany_fk        = col.foreignKey || null;
					mods.registry[opts.version]._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.hasMany(mods.registry[opts.version][hasMany_modelName], hasMany_fk);
					};
				}
				
				// check for belongsTo
				else if (col.hasOwnProperty(_REL.belongsTo)) {
					
					// get the model name and foreign key
					var belongsTo_modelName = col.belongsTo;
					var belongsTo_fk        = col.foreignKey || null;
					mods.registry[opts.version]._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.belongsTo(mods.registry[opts.version][belongsTo_modelName], belongsTo_fk);
					};
				}

				// check for belongsToMany
				else if (col.hasOwnProperty(_REL.belongsToMany)) {
					
					// get the model name, foreign key, other key, and junction table name
					var btm_modelName = col.belongsToMany;
					var btm_fk        = col.foreignKey || null;
					var junction      = col.junction   || null;
					var otherKey      = col.otherKey   || null;
					mods.registry[opts.version]._relations[tableName].push(colName);
					
					// add the prototype
					objProto[colName] = function() {
						return this.belongsToMany(mods.registry[opts.version][btm_modelName], junction, btm_fk, otherKey);
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
				objProto.activate    = methods.activate;
				objProto.deactivate  = methods.deactivate;
				objProto.publish     = methods.publish;
				objProto.unpublish   = methods.unpublish;
			}
			
			// add custom functions and properties
			objProto.idAttribute     = mods.utils.schema.getIdAttribute(tableSchema);
			objProto.cloneResource   = methods.cloneResource;
			objProto.deleteResource  = methods.deleteResource;
			objProto.end             = methods.end;
			objProto.getRelations    = methods.getRelations;
			objProto.getResource     = methods.getResource;
			objProto.getResources    = methods.getResources;
			objProto.href            = methods.href;
			objProto.limit           = methods.limit;
			objProto.offset          = methods.offset;
			objProto.order           = methods.order;
			objProto.paginate        = methods.paginate;
			objProto.print           = methods.print;
			objProto.reset           = methods.reset;
			objProto.saveResource    = methods.saveResource;
			objProto.search          = methods.search;
			objProto.transaction     = methods.transaction;
			objProto.version         = opts.version;
			objProto.view            = methods.view;
			objProto._var            = {};

			
			
			// create the model in the global factory store
			mods.registry[opts.version][tableName] = bookshelf.Model.extend(objProto, objClass);
			bookshelf.model(tableName, mods.registry[opts.version][tableName]);
		});
		
		// return all of the models
		return mods.registry[opts.version];
	}
	
	
	// create the factory
	var factory = {
			
		// constants
		config: config,
		statics: statics,
			
		// API methods
		transaction: transaction,
		time: time,
		create: create,
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
		models: mods.models,
		getSchema: function(version) { return mods.models(version); }
	};
	
	
	// return the factory
	return factory;
};