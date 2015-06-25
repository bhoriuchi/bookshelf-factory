module.exports = function(c) {
	
	return {
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
        },
        actor: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 200},
            character: {hasOne: 'survivor', foreignKey: 'id'}
        }
    };
};