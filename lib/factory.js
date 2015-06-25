// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Creates bookshelf models using knex-schemer's 
//              schema definition format
//

var dotprune = require('dotprune');
var _        = require('lodash');

module.exports = function(bookshelf) {
	
	
	// define constants used for lookup in schema
	var constants = {
			extendProto: 'extendProto',
			extendClass: 'extendClass',
			hasOne: 'hasOne',
			hasMany: 'hasMany',
			belongsTo: 'belongsTo',
			belongsToMany: 'belongsToMany',
			model: 'model',
			foreignKey: 'foreignKey',
			table: 'table',
			otherKey: 'otherKey',
			views: 'views'
	};
	
	
	// define relations types array. this will be used 
	// in the getRelations function
	var relations = [
        constants.hasOne,
        constants.hasMany,
        constants.belongsTo,
        constants.belongsToMany
	];
	
	
	// import the util helper
	var util = require('./util')({
		lodash: _,
		constants: constants,
		relations: relations
	});
	
	
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
				
				
				var colName = tableCols[j];
				var col     = tableSchema[colName];
				
				
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
					
					var btm_modelName = col[constants.belongsToMany];
					var btm_fk        = col[constants.foreignKey] || null;
					var table         = col[constants.table] || null;
					var ok            = col[constants.otherKey] || null;
					models._relations[tableName].push(colName);
					
					objProto[colName] = function() {
						return this.belongsToMany(models[btm_modelName], table, btm_fk, ok);
					};
				}
			}
			
			// add a function to get relations
			objProto.getRelations = function() {
				return models._relations[this.tableName];
			};
			
			
			// add a function to get resource
			objProto.getResources = function(args) {
				
				
				// if no args were supplied, create an empty object
				args          = args || {};
				
				
				// set defaults if arguments are missing
				var view      = args.view || '';
				var fetchOpts = args.fetchOpts || {};
				var query     = args.query || function(qb) { };
				var where     = args.where || {};
				
				
				// set the relation for fetch
				fetchOpts.withRelated = (fetchOpts.hasOwnProperty('withRelated')) ?
						fetchOpts.withReltated : models._relations[this.tableName];
				
				
				// get the view properties
				var keep = util.compileViewFilter(view, this.tableName, models._schema, '');
				
				
				// get the results. use a user defined function to plug into knex for filtering
				// and also prune the results if a view is specified
				return this.query(query).where(where).fetchAll(fetchOpts).then(function(results) {
					return dotprune.prune(results.toJSON(), keep);
				});
			};
			
			
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
		constants: constants,
		util: util,
		filter: function (obj, keep) {
			return dotprune.prune(obj, keep);
		}
	};
};