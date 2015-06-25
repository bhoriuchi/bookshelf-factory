// create a database connection
var db = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	},
	"debug": false
};





// import the modules
var _         = require('lodash');
var dotprune  = require('dotprune');
var knex      = require('knex')(db);
var bookshelf = require('bookshelf')(knex);
var schemer   = require('knex-schemer')(knex);
var factory   = require('../lib/factory')(bookshelf);
var schema    = require('./schema')(schemer.constants);
var data      = require('./sample-data');


// drop the schema
schemer.drop(schema).then(function() {
	
	// create a database
	return schemer.sync(schema).then(function() {
		// load the data
		return schemer.convertAndLoad(data, schema).then(function() {
			
			// forge all of the model definitions
			var models = factory.create(schema);
			
			var limit1 = function(qb) {
				qb.limit(1);
			};

			
			models.survivor
			.forge()
			.getResources({
				view: 'summary',
				query: function(qb) {
					qb.limit(1);
				}
			})
			.then(function(results) {

				// pretty print the results
				console.log(JSON.stringify(results, null, ' '));
				process.exit();
				
			});
		});
	});
});








