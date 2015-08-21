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


//console.log(schema);
//process.exit();

// forge all of the model definitions
models = factory.create(schema);

//console.log(models._relations);

var newItem = {
	name: 'vodka'
};


var obj = {
	name: 'My List',
	description: 'my gorcery list',
	use_current: false,
	change_notes: 'Im saving a new list',
	items: [1,3,5,7, newItem],
	shared_with: [1, 3],
	owner: 2,
	category: 1
};




return models.list.forge().pretty()
.saveResource(obj)
.then(function(results) {
	console.log(results);
})
.then(function() {
	// exit the app
	process.exit();
});










