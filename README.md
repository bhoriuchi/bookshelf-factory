

# bookshelf-factory
---
bookshelf-factory is a tool that extends the knex-schemer schema definition format to produce an object containing models for each table defined. Using this tool you can define relationships between models as well as views for specific data. The tool also takes care of withRelated for you and provides a custom getResources function that allows you to combine all of the functionality into 1 function while still allowing you to use knex query functions

# Install
---
```bash
npm install -g bookshelf-factory
```

# Basic Example

##### JavaScript
```js
// require the package
var factory = require('bookshelf-factory');

// define a schema in schemer format
// in this example survivor.id has the views extended property that defines
// views that property belongs to. survivor.groups also has the extended
// property belongsToMany and specifies that the group table will be used
// as a junction table
var schema = {
        survivor: {
            id: {type: c.type.integer, primary: true, increments: true, views: ['summary']},
            name: {type: c.type.string, size: 200, views: ['summary']},
            groups: {ignore: true, belongsToMany: 'group', views: ['summary']},
            station_id: {type: c.type.integer},
            station: {ignore: true, belongsTo: 'station', views: ['summary']}
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

# .getResources
---
.getResources is a function added to every model created that combines all of the functionality of bookshelf-factory. The function takes an object as its argument. If the argument is not provided all resources in the model will be returned unfiltered. There are no required arguments

##### Argument format
```js
var args = {
    view: <the view name>,
    query: <a function that uses bookshelf's query builder>,
    where: <an object with the column and column value>,
    fetchOpts: <an object containing fetch options>
};
```

# Views
---
Using the schema from the **Basic Example** you can see that the **views** field has been defined as an array of values. This specifies that this field will be part of that view. The caveat is that related properties need to have their parent property included in the view. In the example of the survivor table schema groups is a related field and if we want groups.name to participate in the summary view when getting the survivor model both survivor.groups and groups.name need to have the summary view defined. If we add the summary view to only the groups column in the survivor schema, all properties of groups will participate in the view 

##### Example
```js
// using the schema from Basic Example

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge().getResources({
    view: 'summary'
}).then(function(results) {

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


# Plugging into knex
---
Using the .getResources function, set the **query** argument to a bookshelf query builder function

##### Example to return 1 result using knex query builder
```js
// using the schema from Basic Example

// call the create function to create all the models
var models = factory.create(schema);

// forge the model and get all of its resources
models.survivor.forge().getResources({
    view: 'summary',
    query: function(qb) {
        qb.limit(1)
    }
}).then(function(results) {

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
 }
]
```





### Tools

Created with [Nodeclipse](https://github.com/Nodeclipse/nodeclipse-1)
 ([Eclipse Marketplace](http://marketplace.eclipse.org/content/nodeclipse), [site](http://www.nodeclipse.org))   

Nodeclipse is free open-source project that grows with your contributions.