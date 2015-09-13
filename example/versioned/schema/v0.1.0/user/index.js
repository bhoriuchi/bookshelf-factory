// v0.1.0 user model

module.exports = function (dream) {
	
	return {
        id: {
            type: dream.schemer.constants.type.integer,
            primary: true,
            increments: true
        },
        name: {
            type: dream.schemer.constants.type.string,
            size: 200
        },
        username: {
            type: dream.schemer.constants.type.string,
            size: 200
        },
        password: {
            type: dream.schemer.constants.type.string,
            size: 500
        }
    };
};