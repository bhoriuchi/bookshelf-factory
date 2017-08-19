// v0.1.0 group model

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