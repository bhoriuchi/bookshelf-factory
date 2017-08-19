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
var restify   = require('restify');
var factory   = require('../../lib/factory')(config);
var schema    = require('./versioned-schema')(factory.schemer.constants);
var data      = require('./versioned-data');
var models;

// forge all of the model definitions
models = factory.create(schema);



function getLists(req, res, next) {

	models.list.forge()
	.paginate(factory.statics.paginations.offset, req)

	//.search({search: '2', field: 'version'})
	//.view(['id'])
	.getResources({maxDepth: 0})
	.end()
	.then(function(results) {
		res.send(results);
		return next();
	});
}





// set up the restify server with CORS enabled and body/query parsers
var server = restify.createServer();
server.pre(restify.pre.sanitizePath());
server.use(restify.bodyParser({ mapParams: false }));
server.use(restify.queryParser());
server.use(restify.CORS());
server.use(restify.acceptParser(server.acceptable));


// routes
server.get('/lists', getLists);
server.get(/\/datatables\/?.*/, restify.serveStatic({
	directory: __dirname + '/public',
	'default': 'index.html'
}));




//start the server
server.listen(8080, function() {
	console.log('Test Server %s listening at %s', server.name, server.url);
});

