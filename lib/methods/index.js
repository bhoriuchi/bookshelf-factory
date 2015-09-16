// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: methods
//


module.exports = function(config) {

	// require the core method code
	config.methodcore = require('./core')(config);
	
	// require each module and return it
	return {
		activate: require('./activate')(config),
		cloneResource: require('./cloneResource')(config),
		deactivate: require('./deactivate')(config),
		deleteResource: require('./deleteResource')(config),
		end: require('./end')(config),
		getRelations: require('./getRelations')(config),
		getResource: require('./getResource')(config),
		getResources: require('./getResources')(config),
		href: require('./href')(config),
		limit: require('./limit')(config),
		newModel: require('./newModel')(config),
		offset: require('./offset')(config),
		order: require('./order')(config),
		paginate: require('./paginate')(config),
		print: require('./print')(config),
		publish: require('./publish')(config),
		reset: require('./reset')(config),
		saveResource: require('./saveResource')(config),
		search: require('./search')(config),
		transaction: require('./transaction')(config),
		unpublish: require('./unpublish')(config),
		view: require('./view')(config)
	};
};