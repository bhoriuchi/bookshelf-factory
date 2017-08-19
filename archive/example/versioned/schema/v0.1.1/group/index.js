// v0.1.1 group model

module.exports = function (dream) {
	
	return {
        id: {
            type: dream.schemer.constants.type.integer,
            primary: true,
            increments: true
        },
        name: {
            type: dream.schemer.constants.type.string,
            size: 100,
            views: ['summary']
        },
        station: {
            hasOne: 'station',
            nullable: true
        },
        _rest: {
            methods: {
                HEAD: {},
                GET: {},
                POST: {},
                PUT: {},
                DELETE: {}
            }
        }
    };
};