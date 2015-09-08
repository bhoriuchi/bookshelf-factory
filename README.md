

![bookshelf-factory](https://github.com/bhoriuchi/bookshelf-factory/blob/master/public/assets/images/bookshelf-factory.png)
---
**bookshelf-factory** is a tool that allows you to define [bookshelf.js](http://bookshelfjs.org/) models in **JSON** format and create them along with custom get, save, and delete functions that work with deeply nested objects. As of version **1.0.0** support for temporal/versioned models has been included.


* See the **[WIKI](https://github.com/bhoriuchi/bookshelf-factory/wiki)** for full documentation
* And the **[Change Log](https://github.com/bhoriuchi/bookshelf-factory/wiki/Change-Log)** for what's new

# Install
---
```bash
npm install -g bookshelf-factory
```

# Usage
---
```js
// create a database connection config
var config = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	}
};

// require the package passing the config
var factory = require('bookshelf-factory')(config);

```


# Basic Example
---
##### JavaScript
```js
// create a database connection config
var config = {
	"client": "mysql",
	"connection": {
		"host": "127.0.0.1",
		"user": "db",
		"password": "password",
		"database": "test",
		"charset": "utf8"
	}
};

// require the package and pass the db connection config
var factory = require('bookshelf-factory')(config);
var type    = factory.schemer.constants.type;

// define a schema in schemer format
// in this example survivor.id has the views extended property that defines
// views that property belongs to. survivor.groups also has the extended
// property belongsToMany and specifies the model to use for the relationship
var schema = {
        survivor: {
            id: {type: type.integer, primary: true, increments: true, views: ['summary']},
            name: {type: type.string, size: 200, views: ['summary']},
            groups: {belongsToMany: 'group', views: ['summary']},
            station_id: {type: type.integer},
            station: {belongsTo: 'station', views: ['summary']}
        },
        group: {
            id: {type: type.integer, primary: true, increments: true},
            name: {type: type.string, size: 100, views: ['summary']},
        },
        group_survivor: {
            survivor_id: {type: type.integer, primary: true},
            group_id: {type: type.integer, primary: true}
        },
        station: {
            id: {type: type.integer, primary: true, increments: true},
            name: {type: type.string, size: 100}
        }
    };
};

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge().getResources().end().then(function(results) {

    // pretty print the results to the console
    console.log(JSON.stringify(results, null, ' '));
});
```


# Tools
---
Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.