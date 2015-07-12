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

//console.log('------ Start Schema ---');
//console.log(JSON.stringify(schema, null, '  '));
//console.log('------ End Schema -----');

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
	
	// print query result for survivor limit 1
	console.log('--------------------------------');
	console.log('Example 1: Request Limit 1');
	console.log(' ');
	console.log(results);
	console.log('--------------------------------');
	
	// save a new survivor
	return models.survivor.forge().view('summary').pretty()
	.saveResource({
		name: 'Jacob',
		station_id: 1,
		groups: [1, 2],
		ignore1: 'x'
	})
	.then(function(results) {
		
		console.log('--------------------------------');
		console.log('Example 2: Save a new Resource');
		console.log(' ');
		console.log(results);
		console.log('--------------------------------');
	})
	.then(function() {
		return models.survivor.forge().view('summary').pretty()
		.saveResource({
			sid: 15,
			station_id: 2,
			notes: 'station updated',
			groups:[4],
			_ignore2: true,
			station: 3
		})
		.then(function(results) {
			
			console.log('--------------------------------');
			console.log('Example 3: Update a new Resource');
			console.log(' ');
			console.log(results);
			console.log('--------------------------------');
		});
	})
	.then(function() {
		// save a new actor
		return models.actor.forge().view().pretty()
		.saveResource({
			name: 'Evangeline Lilly',
			character: 7,
			nicknames: [8, 9, 10]
		})
		.then(function(results) {
			
			console.log('--------------------------------');
			console.log('Example 4: Save a new Actor');
			console.log(' ');
			console.log(results);
			console.log('--------------------------------');
		});
	})
	.then(function() {
		// save a new actor
		return models.survivor.forge().deleteResource(7)
		.then(function(results) {
			
			console.log('--------------------------------');
			console.log('Deleting Kate');
			console.log(' ');
			console.log(results);
			console.log('--------------------------------');
		});
	});
})
.then(function() {
	
	// delete a survivor
	return models.actor.forge().deleteResource(3, {force: true}).then(function(results) {
		console.log('--------------------------------');
		console.log('Example 5: Delete Resource');
		console.log(' ');
		console.log(results);
		console.log('--------------------------------');
	});
})
.then(function() {
	
	// exit the app
	process.exit();
});











