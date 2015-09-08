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
var shortid   = require('shortid');
var models;


var listname = 'My List - ' + shortid.generate();

// validate the schema
//schema = factory.prepareSchema(schema) || {};
var obj = {
	name: listname,
	description: 'my gorcery list',
	use_current: false,
	change_notes: 'Im saving a new list',
	items: [1,3],
	shared_with: [1, 2],
	owner: 2,
	category: 1
};
			
// forge all of the model definitions
models = factory.create(schema);

// create a chain transaction
return factory.transaction(function(t) {
	
	return models.list.forge()
	.transaction(t)
	//.deactivate('list-N1lX8sVU6');
	//.activate('list-N1lX8sVU6', {force: true});
	
	.saveResource(obj)
	.publish({force: true})
	.saveResource({shared_with: [2,3]})
	.publish({force: true});

	//.end({returnModel: true});
})
.then(function(results) {
	
	return results;
	//.reset({results: false})
	//.print({wrapText: '=================='})
	//.deleteResource({force: true})
	//.end();
})
.then(function(results) {
	console.log(JSON.stringify(results, null, '  '));
})
.caught(function(e) {
	console.log(e);
})
.then(function() {
	process.exit();
});











