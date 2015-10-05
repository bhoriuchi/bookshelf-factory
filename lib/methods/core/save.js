// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: save function
//

module.exports = function(config) {

	// constants
	var _ACT        = config.statics.actions;
	var _VER        = config.statics.version;
	var _ERR        = config.statics.errorCodes;
	var _SCMA       = config.statics.schema;
	var _STAT       = config.statics.httpStatus;
	
	// modules
	var _           = config.lodash;
	var promise     = config.promise;
	var methodcore  = config.methodcore;
	var utils       = config.utils;
	var u           = utils.util;
	
	// takes in parameters for the pay-load array
	return function(opts) {
		
		
		// model variables
		var _self     = opts._self;
		var fetchOpts = opts.fetchOpts;
		var jsonOpts  = opts.jsonOpts;
		var keep      = _self._var.keep;
		var idAttr    = _self.idAttribute;
		
		// runtime variables
		var models       = config.models(_self.version);
		
		
		// takes a transaction as its parameter and executes the save
		return function(t) {

			var isTemporal = false;
			
			// set the transaction
			fetchOpts.transacting = t;
			

			
			// loop through each package and attempt to insert or update
			return promise.map(opts.packages, function(pkg) {
				
				
				// determine the patch type
				var parentModel = null;
				var p           = pkg.parent;
				var c           = pkg.child;
				var patch       = (p.method === _ACT.update) ? true : false;
				var useModel    = null;
				
				// set the temporal
				isTemporal = c ? true : false;
				
				// attempt to save the parent model
				return models[p.model].forge(p.where)
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
					return utils.relation.syncRelations(models, p.relations, model, t);
					
				})
				// now look for temporal models and update them
				.then(function() {
					
					// check for child package
					if (isTemporal) {

						// get the child schema
						var cSchema = models._schema[c.model];
						
						// look for groupUnique settings. this will allow a pseudo
						// unique functionality for temporal fields so that child rows
						// can have duplicate values as long as they belong to the same parent
						var groupUnique = {};
						_.forEach(cSchema, function(col, name) {
							if (_.has(col, _SCMA.groupUnique) &&
									_.has(c.payload, name) &&
									_.has(cSchema, col.groupUnique)) {
								groupUnique[name] = col.groupUnique;
							}
						});
						
						// set the child payload's parent_id to the model id
						// and its version to the draft version since this is the
						// only version that can be saved. published versions
						// cannot be modified, only deactivated
						c.payload.parent_id = parentModel.id;
						c.payload.version   = _VER.draft;
						
						// create a query in case we are trying to update
						var cq = models[c.model].forge()
						.query(function(qb) {
							
							qb.where({
								parent_id: parentModel.id
							})
							.andWhere({
								version: _VER.draft
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
								c.payload.id = cModel.id;
							}
							
							// now check for groupUnique
							if (_.keys(groupUnique).length > 0) {
								
								// query 
								return models[c.model].forge()
								.query(function(qb) {
									
									var sql = '';
									
									// loop through each value and build an SQL query
									_.forEach(groupUnique, function(groupBy, name) {
										sql += (sql === '') ? '' : ' or ';
										sql += '(`' + c.model + '`.`' +
											name + '` = \'' + c.payload[name] +'\' and `' +
											c.model + '`.`' + groupBy + '` <> \'' + c.payload[groupBy] + '\') ';
									});
									
									if (sql !== '') {
										qb.whereRaw(sql);
									}
								})
								.fetchAll({transacting: t})
								.then(function(results) {
									
									if (results.length > 0) {
										throw u.newErr(
											_STAT.BAD_REQUEST.code,
											'One or more values in the payload violates the unique constraint(s) of the table',
											_ERR.UNIQUE_FIELD_VIOLATION.code,
											_ERR.UNIQUE_FIELD_VIOLATION.detail
										);
									}
								});
							}
						})
						.then(function() {
							
							// attempt to save the child
							return models[c.model].forge().save(c.payload, {
								transacting: t,
								method: c.method,
								patch: patch
							})
							.then(function(childModel){

								// check if there is a use model, meaning 
								// that a model is being updated
								useModel = useModel || childModel;

								// update relations using the use model
								return utils.relation.syncRelations(models, c.relations, childModel, t);
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
						
						var newFetchOpts     = _.clone(fetchOpts, true);
						
						
						if (isTemporal) {
							newFetchOpts._saving = true;
						}
						
						// save the model
						return models[m.tableName]
						.forge()
						.transaction(t)
						.href(_self._var.href)
						.view(keep)
						.getResource(m.id, newFetchOpts, jsonOpts)
						.end()
						.then(function(results) {
							return results;
						});
					});
				}
			});
		};
	};
};