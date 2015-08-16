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
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
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
		return factory.schemer.convertAndLoad(data, schema);
	});
})
.then(function() {
	
	// exit the app
	process.exit();
});











