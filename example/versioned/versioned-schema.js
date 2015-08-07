module.exports = function(c) {
	
	return {
		list: {
			id: {type: c.type.string, primary: true, compositeId: true},
			name: {type: c.type.string, size: 100},
			description: {type: c.type.string, size: 500, nullable: true},
			items: {belongsToMany: 'item', nullable: true, versioned: true},
			shared_with: {hasMany: 'user', nullable: true, versioned: true},
			owner: {hasOne: 'user', nullable: true, versioned: false},
			category: {belongsTo: 'category', nullable: true, versioned: true}
		},
		item: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100}
		},
		user: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100},
			location: {hasOne: 'location', nullable: true}
		},
		category: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100}
		},
		location: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100}
		}
    };
};