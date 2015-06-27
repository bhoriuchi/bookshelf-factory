// create a database connection config
var config = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	},
	debug: false
};


// import the modules
var factory   = require('../lib/factory')(config);
var schema    = require('./sample-schema')(factory.schemer.constants);
var data      = require('./sample-data');

// validate the schema
schema = factory.prepareSchema(schema) || {};

//console.log(JSON.stringify(schema, null, '  '));

// drop the schema
factory.schemer.drop(schema).then(function() {
	
	// create a database
	return factory.schemer.sync(schema).then(function() {
		// load the data
		return factory.schemer.convertAndLoad(data, schema).then(function() {
			
			// forge all of the model definitions
			var models = factory.create(schema);

			/*
			new models.actor().saveResource({name: 'John Doe'}).then(function(model){
				console.log(model);
				process.exit();
			});
			*/

			
			models.survivor.forge()
			.view('summary')
			.query(function(qb) {
				qb.limit(2);
			})
			.where({station_id: 10})
			.getResources()
			.then(function(results) {

				// pretty print the results
				console.log(JSON.stringify(results, null, ' '));
				process.exit();
				
			});
			
		});
	});
});








