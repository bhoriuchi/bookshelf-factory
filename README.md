

# bookshelf-factory
---
bookshelf-factory is a tool that extends the knex-schemer schema definition format to produce an object containing models for each table defined. Using this tool you can define relationships between models as well as views for specific data. The tool also takes care of withRelated for you and provides a custom getResources function that allows you to combine all of the functionality into 1 function while still allowing you to use knex query functions

# Whats New?
* 6/26/2015
  * Realized that chaining the view and other functions would be better than passing them as arguments, so the getResources function now only takes the parameters you would normally pass to the bookshelf.js fetch functions
  * added chainable view() function
  * added getResource() function that intelligently gets the resource based on its primary key using a specified id
  * added automatic idAttribute assignment based on primary and composite keys
  * added prepareSchema function which will create junction tables and set foreignKey values for you automatically given a relationship
  * updated to version **0.1.1**

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

// define a schema in schemer format
// in this example survivor.id has the views extended property that defines
// views that property belongs to. survivor.groups also has the extended
// property belongsToMany and specifies the model to use for the relationship
var schema = {
        survivor: {
            id: {type: c.type.integer, primary: true, increments: true, views: ['summary']},
            name: {type: c.type.string, size: 200, views: ['summary']},
            groups: {belongsToMany: 'group', views: ['summary']},
            station_id: {type: c.type.integer},
            station: {belongsTo: 'station', views: ['summary']}
        },
        group: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 100, views: ['summary']},
        },
        group_survivor: {
            survivor_id: {type: c.type.integer, primary: true},
            group_id: {type: c.type.integer, primary: true}
        },
        station: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 100}
        }
    };
};

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge().getResources().then(function(results) {

    // pretty print the results to the console
    console.log(JSON.stringify(results, null, ' '));
});
```
##### Output
```js
[
 {
  "id": 1,
  "name": "Hugo Reyes",
  "station_id": 1,
  "groups": [
   {
    "id": 1,
    "name": "castaways",
    "_pivot_survivor_id": 1,
    "_pivot_group_id": 1
   },
   {
    "id": 4,
    "name": "oceanic6",
    "_pivot_survivor_id": 1,
    "_pivot_group_id": 4
   }
  ],
  "station": {
   "id": 1,
   "name": "Flame"
  }
 },
 {
  "id": 2,
  "name": "Sayid Jarrah",
  "station_id": 2,
  "groups": [
   {
    "id": 1,
    "name": "castaways",
    "_pivot_survivor_id": 2,
    "_pivot_group_id": 1
   },
   {
    "id": 4,
    "name": "oceanic6",
    "_pivot_survivor_id": 2,
    "_pivot_group_id": 4
   }
  ],
  "station": {
   "id": 2,
   "name": "Arrow"
  }
 }
]
```

# Schema Definition
---
bookshelf-factory builds on the knex-schemer format for defining database schema by adding additional properties that can be interpreted for relationships and views

##### Format
```js
var schema = {
    <table 1 name>: {
        <column 1 name>: { type: <data type>, [additional column options] },
        <column 2 name>: {
            ignore: true, 
            <relationship type>: <related table>, 
            [additional options] 
        },
        ...
    },
    <table 2 name>: {
        <column 1 name>: { type: <data type>, [additional column options] },
        <column 2 name>: { type: <data type>, [additional column options] },
        ...
    },
    ...
};
```
# Relationships
---
Bookshelf relationships can be defined in the schema using the following options and optional properties

**Relationship Types**
* **hasOne**
  * model name
* **hasMany**
  * model name
* **belongsTo**
  * model name
* **belongsToMany**
  * model name

**Modifiers** (optional)
* **foreignKey** (can be used in combination with any relation)
* **otherKey** (only used with ***belongsToMany***)
* **junction** (junction table name, used with ***belongsToMany***)

##### Example
```js
var schema = {
    survivor: {
        id: {type: c.type.integer, primary: true, increments: true},
        name: {type: c.type.string, size: 200},
        groups: {
            belongsToMany: 'group', 
            foreignKey: 'survivor_id', 
            otherKey: 'group_id', 
            junction: 'group_survivor'
        },
        station: {belongsTo: 'station', foreignKey: 'id'}
    }
};
```

# Extending bookshelf model
---
bookshelf.js allows you to extend its models with protoProps and classProperties (see bookshelf.js extend documentation). bookshelf-factory also allows you to provide this in the schema definition with the following properties

<br>

*note: by default bookshelf-factory already extends idAttribute and tableName for you, along with determining withRelated for each model*


* **extendProto** (gets passed as the protoProps argument in bookshelf.Model.extend())
  * object of properties and their associated values
* **extendClass** (gets passed as the classProperties argument in bookshelf.Model.extend())
  * object of properties and their associated values



# .getResources([options])
---
.getResources is a function added to every model created that combines all of the functionality of bookshelf-factory. The function takes the same arguments as fetchAll because all its really doing is calling fetchAll with the generated relations and then removing any properties that are not part of the view

<br>

see bookshelf.js documentation on [fetchAll](http://bookshelfjs.org/#Model-fetchAll) for more information on arguments

# .getResource(id, [options])
---
.getResource allows you to select a single resource by id. In the background the function is using a where statement to match the id provided with the idAttribute set by the create process. The function takes the same optional options .getResources does


# Views
---
Using the schema from the **Basic Example** you can see that the **views** field has been defined as an array of values. This specifies that this field will be part of that view. The caveat is that related properties need to have their parent property included in the view. In the example of the survivor table schema groups is a related field and if we want groups.name to participate in the summary view when getting the survivor model both survivor.groups and groups.name need to have the summary view defined. If we add the summary view to only the groups column in the survivor schema, all properties of groups will participate in the view

<br>

to actually use a view, simply chaing the view() function before any fetchAll or getResource/getResources functions

<br>

the view takes the name of the view as its argument. If no arguments are specified, all properties will be returned

##### Example
```js
// using the schema from Basic Example

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge()
.view('summary')
.getResources().then(function(results) {

    // pretty print the results to the console
    console.log(JSON.stringify(results, null, ' '));
}); 

```
##### Output
Notice that the id field has been removed from the group objects
```js
[
 {
  "id": 1,
  "name": "Hugo Reyes",
  "groups": [
   {
    "name": "castaways"
   },
   {
    "name": "oceanic6"
   }
  ],
  "station": {
   "id": 1,
   "name": "Flame"
  }
 },
 {
  "id": 2,
  "name": "Sayid Jarrah",
  "groups": [
   {
    "name": "castaways"
   },
   {
    "name": "oceanic6"
   }
  ],
  "station": {
   "id": 2,
   "name": "Arrow"
  }
 }
]
```


# Using bookshelf.js chainable functions
---
The models created by bookshelf-forge are no different from models you would create normally except that they have a few functions and properties automatically created for you. Because of this approach, you can use all of the normal chainable functions you would in bookshelf.js

##### Example to return 1 result using the query builder
```js
// using the schema from Basic Example

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge()
.view('summary')
.query(function(qb) {
    qb.limit(1)
})
.where({station_id: 10})
.getResources().then(function(results) {

    // pretty print the results to the console
    console.log(JSON.stringify(results, null, ' '));
}); 
```
##### Output
```js
[
 {
  "sid": 12,
  "name": "Charlie Pace",
  "groups": [
   {
    "name": "castaways"
   }
  ],
  "station": {
   "id": 10,
   "name": "Lamp Post"
  }
 },
 {
  "sid": 13,
  "name": "Libby Smith",
  "groups": [
   {
    "name": "castaways"
   },
   {
    "name": "tailies"
   }
  ],
  "station": {
   "id": 10,
   "name": "Lamp Post"
  }
 }
]
```

# .prepareSchema(schema)
---
The prepareSchema function allows you to off-load some of the work behind figuring out where to put foreignKeys, what to name them, and what junction tables to create. Simply define your relationship type.

##### Example
```js
// define a schema with relationships
var schema = {
    survivor: {
        sid: {type: c.type.integer, primary: true, increments: true, views: ['summary']},
        name: {type: c.type.string, size: 200, views: ['summary']},
        groups: {belongsToMany: 'group', views: ['summary']},
        station_id: {type: c.type.integer},
        station: {belongsTo: 'station', views: ['summary']}
    },
    group: {
        id: {type: c.type.integer, primary: true, increments: true},
        name: {type: c.type.string, size: 100, views: ['summary']},
    },
    station: {
        id: {type: c.type.integer, primary: true, increments: true},
        name: {type: c.type.string, size: 100}
    },
    actor: {
        id: {type: c.type.integer, primary: true, increments: true},
        name: {type: c.type.string, size: 200},
        character: {hasOne: 'survivor', nullable: true}
    }
};

// prepare the schema
schema = factory.prepareSchema(schema);

// print the prepared schema
console.log(JSON.stringify(schema, null, '  '));

```

##### Output
```js
{
  "survivor": {
    "sid": {
      "type": "integer",
      "primary": true,
      "increments": true,
      "views": [
        "summary"
      ]
    },
    "name": {
      "type": "string",
      "size": 200,
      "views": [
        "summary"
      ]
    },
    "groups": {
      "belongsToMany": "group",
      "views": [
        "summary"
      ],
      "foreignKey": "survivor_sid",
      "junction": "group_survivor",
      "otherKey": "group_id"
    },
    "station_id": {
      "type": "integer"
    },
    "station": {
      "belongsTo": "station",
      "views": [
        "summary"
      ],
      "foreignKey": "station_id"
    },
    "actor_id": {
      "type": "integer",
      "nullable": true
    }
  },
  "group": {
    "id": {
      "type": "integer",
      "primary": true,
      "increments": true
    },
    "name": {
      "type": "string",
      "size": 100,
      "views": [
        "summary"
      ]
    }
  },
  "station": {
    "id": {
      "type": "integer",
      "primary": true,
      "increments": true
    },
    "name": {
      "type": "string",
      "size": 100
    }
  },
  "actor": {
    "id": {
      "type": "integer",
      "primary": true,
      "increments": true
    },
    "name": {
      "type": "string",
      "size": 200
    },
    "character": {
      "hasOne": "survivor",
      "nullable": true,
      "foreignKey": "actor_id"
    }
  },
  "group_survivor": {
    "survivor_sid": {
      "type": "integer"
    },
    "group_id": {
      "type": "integer"
    }
  }
}

```

You can see that the junction table group_survivor was created along with several properties added to the schema for each model in a relationship.


# Tools
---
Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.