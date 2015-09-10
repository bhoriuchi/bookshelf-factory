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
//schema = factory.prepareSchema(schema) || {};


//console.log(schema);
//process.exit();

// forge all of the model definitions
models = factory.create(schema);

//console.log(models._relations);

var override = [
    {
    	type: 'list',
    	id: 'list-41elXfUBT',
    	version: '1441555200228'
    }
];


var params = {
		  "draw": "1",
		  "columns": [
		    {
		      "data": "id",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    },
		    {
		      "data": "name",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    },
		    {
		      "data": "description",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    },
		    {
		      "data": "active",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    },
		    {
		      "data": "current_version",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    },
		    {
		      "data": "version",
		      "name": "",
		      "searchable": "true",
		      "orderable": "true",
		      "search": {
		        "value": "",
		        "regex": "false"
		      }
		    }
		  ],
		  "order": [
		    {
		      "column": "0",
		      "dir": "asc"
		    }
		  ],
		  "start": "0",
		  "length": "10",
		  "search": {
		    "value": "",
		    "regex": "false"
		  },
		  "_": "1441901038412"
		};

var req = {params: params};


return models.list.forge()
//.href('https://api.server.com')
.paginate(factory.statics.paginations.datatables, req)
//.search({search: '2', field: 'version'})
//.view(['id'])
.getResources({maxDepth: 0})
//.getResource('list-Nkx2ZlWua', {maxDepth: 0})
.end()
.then(function(results) {
	console.log(JSON.stringify(results, null, '  '));
})
.then(function() {
	// exit the app
	process.exit();
});











