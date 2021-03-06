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
	caching: {},
	debug: false
};

// import the modules
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
var models;

// validate the schema
//schema = factory.prepareSchema(schema) || {};


//console.log(schema);
//process.exit();

// forge all of the model definitions
models = factory.create(schema);

//console.log(models._relations);


return models.list.forge().view()
//.search('shopping')
.deleteResource(1, {force: true})
.end()
.then(function(results) {
	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});











