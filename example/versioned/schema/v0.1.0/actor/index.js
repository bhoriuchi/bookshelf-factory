// v0.1.0 actor model

module.exports = function (dream) {
	
	return {
        id: {type: dream.schemer.constants.type.integer, primary: true, increments: true},
        name: {type: dream.schemer.constants.type.string, size: 200},
        character: {hasOne: 'survivor', nullable: true},
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