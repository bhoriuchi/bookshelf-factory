// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: methods
//


module.exports = function(config) {

	// require the core method code
	config.methodcore = require('./core')(config);
	
	// require each module and return it
	return {
		view: require('./view')(config),
		getRelations: require('./getRelations')(config),
		getResources: require('./getResources')(config),
		getResource: require('./getResource')(config),
		saveResource: require('./saveResource')(config),
		cloneResource: require('./cloneResource')(config),
		publish: require('./publish')(config),
		unpublish: require('./unpublish')(config),
		end: require('./end')(config),
		activate: require('./activate')(config),
		deactivate: require('./deactivate')(config),
		deleteResource: require('./deleteResource')(config),
		href: require('./href')(config),
		search: require('./search')(config),
		reset: require('./reset')(config),
		print: require('./print')(config),
		transaction: require('./transaction')(config)
	};
};