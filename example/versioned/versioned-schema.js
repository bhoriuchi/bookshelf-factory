module.exports = function(c) {
	
	return {
		list: {
			id: {type: c.type.string, primary: true, compositeId: true, views: ['summary']},
			name: {type: c.type.string, size: 100, unique: true, versioned: true},
			description: {type: c.type.string, size: 500, nullable: true, views: ['summary'], transform: function(value) {return value + ' was transformed';}},
			items: {belongsToMany: 'item', nullable: true, versioned: true},
			shared_with: {hasMany: 'user', nullable: true, versioned: true, views: ['summary']},
			owner: {hasOne: 'user', nullable: true, versioned: true, defaultTo: 1},
			category: {belongsTo: 'category', nullable: true, versioned: true},
			_path: {path: '/lists'},
			_model: {name: 'list'}
		},
		item: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100},
			_path: {path: '/items'}
		},
		user: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100, views: ['summary']},
			location: {hasOne: 'location', nullable: true, views: ['summary']},
			list_owned: {belongsTo: 'list', nullable: true, connectRelation: 'owner', versioned: true},
			_path: {path: '/users'}
		},
		category: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100},
			_path: {path: '/categorys'}
		},
		location: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100, views: ['summary']},
			_path: {path: '/locations'}
		}
    };
};