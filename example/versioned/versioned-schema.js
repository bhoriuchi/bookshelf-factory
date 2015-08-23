module.exports = function(c) {
	
	return {
		list: {
			id: {type: c.type.string, primary: true, compositeId: true, views: ['summary']},
			name: {type: c.type.string, size: 100, views: ['summary']},
			description: {type: c.type.string, size: 500, nullable: true, views: ['summary'], transform: function(value) {return value + ' was transformed';}},
			items: {belongsToMany: 'item', nullable: true, versioned: true},
			shared_with: {hasMany: 'user', nullable: true, versioned: false, views: ['summary']},
			owner: {hasOne: 'user', nullable: true, versioned: true},
			category: {belongsTo: 'category', nullable: true, versioned: true}
		},
		item: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100}
		},
		user: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100, views: ['summary']},
			location: {hasOne: 'location', nullable: true, views: ['summary']},
			list: {hasOne: 'list', nullable: true}
		},
		category: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100},
			list: {hasOne: 'list', nullable: true}
		},
		location: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100, views: ['summary']}
		}
    };
};