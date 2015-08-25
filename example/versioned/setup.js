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

//console.log(JSON.stringify(schema,null,'  '));
//console.log('==============');
//schema = factory.prepareSchema(schema);
//console.log(JSON.stringify(schema,null, '  '));


//console.log('------ Start Schema ---');
//console.log(JSON.stringify(schema, null, '  '));
//console.log('------ End Schema -----');
//console.log(schema);
//process.exit();

// drop the schema
console.log((new Date()).toString() + ' - ' + 'Dropping Tables');
factory.schemer.drop(schema).then(function() {
	
	// create a database
	console.log((new Date()).toString() + ' - ' + 'Syncing Tables');
	return factory.schemer.sync(schema).then(function() {
		// load the data
		console.log((new Date()).toString() + ' - ' + 'Loading Data');
		return factory.schemer.convertAndLoad(data, schema);
	});
})
.then(function() {
	console.log((new Date()).toString() + ' - ' + 'Complete!');
	// exit the app
	process.exit();
});











