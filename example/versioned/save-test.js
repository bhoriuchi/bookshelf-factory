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
	pool: {
		min: 10,
	    max: 50
	},
	debug: false
};

// import the modules
var promise   = require('bluebird');
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


var obj1 = {
	name: 'My List',
	description: 'my gorcery list',
	use_current: false,
	change_notes: 'Im saving a new list',
	items: [1,3, newItem],
	shared_with: [1, 3],
	owner: 2,
	category: 1
};


var obj2 = {
		name: 'My List2',
		description: 'my gorcery list2',
		use_current: false,
		change_notes: 'Im saving a new list2',
		items: [5,7],
		shared_with: [3],
		owner: 1,
		category: 2
	};

var objArray = [obj1, obj2];


return models.list.forge()
.saveResource(objArray)
.then(function(results) {
	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});










