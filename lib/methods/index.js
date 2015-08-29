// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: methods
//


module.exports = function(config) {

	
	// require each module and return it
	return {
		view: require('./view')(config),
		getRelations: require('./getRelations')(config),
		getResources: require('./getResources')(config),
		getResource: require('./getResource')(config),
		saveResource: require('./saveResource')(config),
		publish: require('./publish')(config),
		end: require('./end')(config),
		activate: require('./activate')(config),
		deleteResource: require('./deleteResource')(config),
		search: require('./search')(config),
		reset: require('./reset')(config)
	};
};