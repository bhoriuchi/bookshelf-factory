module.exports = function(c) {
	
	return {
        survivor: {
            sid: {type: c.type.integer, primary: true, increments: true, views: ['summary']},
            name: {type: c.type.string, size: 100, views: ['summary']},
            groups: {belongsToMany: 'group', views: ['summary']},
            notes: {type: c.type.string, size: 200, nullable: true, defaultTo: 'default notes', views: ['summary']},
            ignore1: {ignore: true},
            _ignore2: {value: false}
        },
        group: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 100, views: ['summary']},
            station: {hasOne: 'station', nullable: true, connectRelation: 'group'}
        },
        station: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 100},
            group: {belongsTo: 'group', nullable: true}
        },
        actor: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 200},
            character: {hasOne: 'survivor', nullable: true},
            nicknames: {hasMany: 'nickname', nullable: true}
        },
        nickname: {
            id: {type: c.type.integer, primary: true, increments: true},
            name: {type: c.type.string, size: 200}
        }
    };
};