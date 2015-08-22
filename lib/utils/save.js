// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: save function
//

module.exports = function(config) {

	var _           = config.lodash;
	var promise     = config.promise;
	var utils       = config.utils;
	var dev         = config.constants.versioned.dev_version;
	var METHOD      = config.constants.methods;
	var u           = utils.util;
	var useModel    = null;
	
	// takes in parameters for the payload array
	return function(opts) {
		
		// takes a transaction as its parameter and executes the save
		return function(t) {
			
			opts.fetchOpts.transacting = t;
			
			// loop through each package and attempt to insert or update
			return promise.map(opts.packages, function(pkg) {
				
				// determine the patch type
				var parentModel = null;
				var p           = pkg.parent;
				var c           = pkg.child;
				var patch       = (p.method === METHOD.update) ? true : false; 
				
				// attempt to save the parent model
				return opts.models[p.model].forge(p.where)
				.save(p.payload, {
					transacting: t,
					method: p.method,
					patch: patch
				})
				// now update relations
				.then(function(model) {

					// store the parent model
					parentModel = model;
					
					// attempt to update each relation then return the model
					return utils.relation.syncRelations(p.relations, model, t);
					
				})
				// now look for versioned models and update them
				.then(function() {
					
					// check for child package
					if (c) {
						
						// set the child payload's parent_id to the model id
						// and its version to the dev version since this is the
						// only version that can be saved. published versions
						// cannot be modified, only deactivated
						c.payload.parent_id = parentModel.id;
						c.payload.version   = dev;
						
						// create a query in case we are trying to update
						var cq = opts.models[c.model].forge()
						.query(function(qb) {
							
							qb.where({
								parent_id: parentModel.id
							})
							.andWhere({
								version: dev
							});
						});
						
						// attempt to fetch the child model
						return cq.fetch({transacting: t}).then(function(cModel) {
							
							// if the there is a result, set the use model to that result
							// this is a workaround for an issue in bookshelf where updating
							// an existing record does not return its complete data, specifically
							// the full relation data
							if (cModel) {
								useModel = cModel;
							}
							
							// attempt to save the child
							return cq.save(c.payload, {
								transacting: t,
								method: c.method,
								patch: patch
							})
							.then(function(childModel){
								
								useModel = useModel || childModel;

								// update relations using the use model
								return utils.relation.syncRelations(c.relations, useModel, t);
							});
						});
					}
				})
				.then(function() {
					return parentModel;
				});
			})
			.then(function(model) {
				
				// check for results
				if (model && Array.isArray(model) && model.length > 0) {
					
					// attempt to call a getResource on each one of the 
					// models to get their result and map the results
					return promise.map(model, function(m) {
						
						// save the model
						return m.view(opts.keep)
						.getResource(m.attributes[opts.idAttr], {_saving: true, transacting: t});
					});
				}
			});
		};
	};
};