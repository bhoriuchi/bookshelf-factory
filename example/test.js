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
var models;
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
			models = factory.create(schema);

			// create a new model
			return models.survivor.forge()
			.query(function(qb) {
				qb.limit(1);
			})
			.view(['sid', 'name', 'station.name'])
			.pretty()
			.getResource(1);
			
		});
	});
})
.then(function(results) {
	
	console.log(results);
	
	return models.survivor.forge().view('summary').pretty()
	.saveResource({name: 'Jacob', station_id: 1})
	.then(function(results) {
		console.log(results);
	});
})
.then(function() {
	return models.survivor.forge().deleteResource(1).then(function(results) {
		console.log(results);
	});
})
.then(function() {
	process.exit();
});











