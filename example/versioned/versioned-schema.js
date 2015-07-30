module.exports = function(c) {
	
	return {
		list: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100},
			description: {type: c.type.string, size: 500, nullable: true},
			items: {belongsToMany: 'item', versioned: true}
		},
		item: {
			id: {type: c.type.integer, primary: true, increments: true},
			name: {type: c.type.string, size: 100}
		}
    };
};