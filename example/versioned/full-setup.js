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


//create locations
function saveLocations(models) {
	return models.location.forge()
	.saveResource([
	    {name: 'Johns House'},
	    {name: 'Janes House'}
	]);
}

//create users
function saveCategories(models) {
	return models.category.forge()
	.saveResource([
	    {name: 'Shopping'},
	    {name: 'Christmas'}
	]);
}

// create items
function saveItems(models) {
	return models.item.forge()
	.saveResource([
	    {name: 'eggs'},
	    {name: 'milk'},
	    {name: 'cheese'},
	    {name: 'apples'},
	    {name: 'oranges'},
	    {name: 'steak'},
	    {name: 'chicken'},
	    {name: 'potato chips'}
	]);
}




// import the modules
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
var promise   = factory.mods.promise;
var models;
// validate the schema
schema = factory.prepareSchema(schema) || {};

// drop the schema
console.log((new Date()).toString() + ' - ' + 'Dropping Tables');
factory.schemer.drop(schema).then(function() {
	
	// create a database
	console.log((new Date()).toString() + ' - ' + 'Syncing Tables');
	return factory.schemer.sync(schema);
})
// create models
.then(function() {
	models = factory.create(schema);
	
	// save locations and categories
	return promise.all(saveLocations(models), saveCategories(models), saveItems(models));
})

// create users
.then(function() {

	return models.user.forge()
	.saveResource([
	    {name: 'John Doe', location: 1},
	    {name: 'Jane Doe', location: 2},
	    {name: 'Mike Doe'}
	])
	.then(function(users) {
		return promise.all(users, function(user) {
			models.user.forge().publish(user.id);
		});
	});
	
})
// create lists
.then(function() {
	
	return models.list.forge()
	.saveResource([
	    {
	    	name: 'Shopping List 1',
	    	description: 'The first shopping list',
	    	items: [1, 3, 5],
	    	shared_with: [1, 2],
	    	owner: 3,
	    	category: 1
	    },
	    {
	    	name: 'Christmas List 1',
	    	description: 'The first christmas list',
	    	items: [2, 4],
	    	shared_with: [3],
	    	owner: 1,
	    	category: 2
	    },
	]);
})
.then()
.then(function() {
	console.log((new Date()).toString() + ' - ' + 'Complete!');
	// exit the app
	process.exit();
});











