// v0.1.0 action model that only provides a service

module.exports = function (dream) {
	
	
	return {
        _rest: {
            pluralize: false,
            service: {
                path: '/actions'
            },
            methods: {
                GET: {}
            }
        }
    };
};