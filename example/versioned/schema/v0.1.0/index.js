// v0.1.0 models

module.exports = function(dream) {
	return {
		whitelist: require('./whitelist')(dream),
		group: require('./group')(dream),
		survivor: require('./survivor')(dream),
		user: require('./user')(dream),
		action: require('./action')(dream),
		actor: require('./actor')(dream)
	};
};
