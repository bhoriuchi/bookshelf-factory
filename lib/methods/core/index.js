// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: core method code
//


module.exports = function(config) {

	// require each module and return it
	return {
		get: require('./get')(config),
		getId: require('./getId')(config),
		save: require('./save')(config),
		clone: require('./clone')(config),
		publish: require('./publish')(config),
		unpublish: require('./unpublish')(config),
		del: require('./delete')(config)
	};
};