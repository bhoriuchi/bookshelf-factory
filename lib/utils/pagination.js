// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: pagination Helper function(s)
//



module.exports = function(config) {
	
	// constants
	var _JTYP = config.statics.jsTypes;
	
	// modules
	var _     = config.lodash;
	var utils = config.utils;
	var u     = utils.util;
	
	
	// function to push values into the output or unsorted array
	function addField(field, def, value, arr, un) {
		
		//console.log(field, def, value, arr, un);
		
		// add the total to the output array
		if (field && field.show !== false) {
			
			var fName = field.displayName || def;
			var dOrdr = !isNaN(field.displayOrder) ? parseInt(field.displayOrder, 10) : null;
			
			// check that the order index is not null and less than the length of the array
			// and that the array does not already have an item in the order spot
			if (dOrdr !== null && dOrdr < arr.length && !arr[dOrdr]) {
				arr[dOrdr] = u.newObj(fName, value);
			}
			else {
				un.push(u.newObj(fName, value));
			}
		}
		
		return {
			array: arr,
			unsorted: un
		};
	}
	
	
	// function to return a pagination
	function paginate(opts) {
		
		var models      = global._factoryModels;
		
		var forgedModel = opts.forgedModel;
		var model       = opts.model;
		var cfg         = opts.config;
		var results     = opts.results;
		var t           = opts.transaction;
		var tableName   = opts.tableName;
		var schema      = models._schema[tableName];
		var path        = _.has(schema, '_path.path') ? schema._path.path : tableName;
		var join        = opts.join || '';
		var search      = opts.search || '';
		var published   = opts.published || '';

		
		// get model variables
		var length      = forgedModel._limit;
		var start       = forgedModel._offset;
		var href        = forgedModel._href || '';
		
		// variables
		var page       = {};
		var f          = cfg.fields;
		var transforms = cfg.transforms;
		
		// initialize variables
		var _total, _filtered, r, result, fName, out;
		var recordsTotal, recordsFiltered;
		var pagesTotal, pagesFiltered, currentPage;
		var previous, next, param, uri;
		
		// get the field count
		var fieldCount = Object.keys(cfg.fields).length;
		fieldCount     += Array.isArray(cfg.transforms) ? cfg.transforms.length : 0;
		
		
		// get param names
		var pageParam   = (f.currentPage && f.currentPage.param) ? f.currentPage.param : 'page';
		var startParam  = (f.start && f.start.param)             ? f.start.param       : 'start';
		var lengthParam = (f.length && f.length.param)           ? f.length.param      : 'length';
		
		
		// check for a rows config
		if (opts.config.rows) {
			
			r = cfg.rows;
			
			// update the records with row functions
			for (var i = 0; i < results.length; i++) {
				
				// check for rowId
				if (r.rowId && typeof(r.rowId.get) === _JTYP.funct) {
					fName             = r.rowId.displayName || 'rowId';
					result            = r.rowId.get(forgedModel, results[i]);
					if (result) {
						results[i][fName] = result;
					}
				}
				// check for rowClass
				if (r.rowClass && typeof(r.rowClass.get) === _JTYP.funct) {
					fName             = r.rowClass.displayName || 'rowClass';
					result            = r.rowClass.get(forgedModel, results[i]);
					if (result) {
						results[i][fName] = result;
					}
				}
				// check for rowData
				if (r.rowData && typeof(r.rowData.get) === _JTYP.funct) {
					fName             = r.rowData.displayName || 'rowData';
					result            = r.rowData.get(forgedModel, results[i]);
					if (result) {
						results[i][fName] = result;
					}
				}
				// check for rowAttr
				if (r.rowAttr && typeof(r.rowAttr.get) === _JTYP.funct) {
					fName             = r.rowAttr.displayName || 'rowAttr';
					result            = r.rowAttr.get(forgedModel, results[i]);
					if (result) {
						results[i][fName] = result;
					}
				}
			}
		}
		
		// determine what values need to be queried
		var getTotalRecords    = (f.recordsTotal && f.recordsTotal.show !== false) ||
		                         (f.pagesTotal && f.pagesTotal.show !== false) ?
		                         true : false;
		
		var getFilteredRecords = (f.recordsFiltered && f.recordsFiltered.show !== false) ||
                                 (f.pagesFiltered && f.pagesFiltered.show !== false) ||
                                 (f.next && f.next.show !== null) ? true : false;
		
		// get recordsTotal if part of the pagination, otherwise null
		if (getTotalRecords) {
			_total = model.forge()
			.query(function(qb) {
				qb.count('* as count');
			})
			.fetch({transacting: t});
		}
		else {
			_total = u.wrapPromise(null);
		}
		
		// get the result
		return _total.then(function(rTotal) {

			rTotal = (rTotal && rTotal.attributes && rTotal.attributes.count) ? rTotal.attributes.count : null;

			// convert the result of records total to a number
			recordsTotal = !isNaN(rTotal) ? parseInt(rTotal, 10) : null;
			
			// add the field
			out = addField(f.recordsTotal, 'recordsTotal', recordsTotal, new Array(fieldCount), []);

			// get recordsFiltered, otherwise null
			if (getFilteredRecords) {
				_filtered = model.forge()
				.query(function(qb) {
					
					// get the distinct rows
					qb.count('* as count').distinct(tableName + '.*');
					
					// set the optional SQL
					qb = join      ? qb.joinRaw(join)          : qb;
					qb = search    ? qb.andWhereRaw(search)    : qb;
					qb = published ? qb.andWhereRaw(published) : qb;

				})
				.fetch({transacting: t});
			}
			else {
				_filtered = u.wrapPromise(null);
			}
			
			
			// get the result
			return _filtered.then(function(rFiltered) {
				
				rFiltered = (rFiltered && rFiltered.attributes && rFiltered.attributes.count) ? rFiltered.attributes.count : null;
				
				// convert the result of records total to a number
				recordsFiltered = !isNaN(rFiltered) ? parseInt(rFiltered, 10) : null;
				
				// add the field
				out = addField(f.recordsFiltered, 'recordsFiltered', recordsFiltered, out.array, out.unsorted);
				
				
				// add length
				out = addField(f.length, 'length', length, out.array, out.unsorted);
				
				
				// make some calculations
				if (cfg.usePages === true) {
					
					// get the total pages
					pagesTotal    = Math.ceil(recordsTotal / length);
					
					// add the field
					out = addField(f.pagesTotal, 'pagesTotal', pagesTotal, out.array, out.unsorted);
					
					// get the filtered pages
					pagesFiltered = Math.ceil(recordsFiltered / length);
					
					// add the field
					out = addField(f.pagesFiltered, 'pagesFiltered', pagesFiltered, out.array, out.unsorted);
					
					// get the current page
					currentPage   = Math.ceil(start / length);
					
					// calculate the uri and add the field
					uri = (href !== '') ? href + path + '?' + pageParam + '=' + currentPage +
							'&' + lengthParam + '=' + length : currentPage;
					out = addField(f.currentPage, 'currentPage', uri, out.array, out.unsorted);
					
					// get the previous
					previous = ((currentPage - 1) > 0) ? (currentPage - 1) : null;
					
					// calculate the uri and add the field
					uri = (href !== '' && previous) ? href + path + '?' + pageParam + '=' + previous +
							'&' + lengthParam + '=' + length : previous;
					out = addField(f.previous, 'previous', uri, out.array, out.unsorted);
					
					// get the next
					next = ((currentPage + 1) <= pagesFiltered) ? (currentPage + 1) : null;
					
					// calculate the uri and add the field
					uri = (href !== '' && next) ? href + path + '?' + pageParam + '=' + next +
							'&' + lengthParam + '=' + length : next;
					out = addField(f.next, 'next', uri, out.array, out.unsorted);
					
				}
				else {
					
					// calculate the uri and add the field
					uri = (href !== '' && start) ? href + path + '?' + startParam + '=' + start +
							'&' + lengthParam + '=' + length : start;
					out = addField(f.start, 'start', uri, out.array, out.unsorted);
					
					// add prevous
					previous = ((start - length) > -1) ? (start - length) : null;
					
					// calculate the uri and add the field
					uri = (href !== '' && previous) ? href + path + '?' + startParam + '=' + previous +
							'&' + lengthParam + '=' + length : previous;
					out = addField(f.previous, 'previous', uri, out.array, out.unsorted);
					
					// add next
					next = ((start + length) < recordsFiltered) ? (start + length) : null;
					
					// calculate the uri and add the field
					uri = (href !== '' && previous) ? href + path + '?' + startParam + '=' + next +
							'&' + lengthParam + '=' + length : next;
					out = addField(f.next, 'next', uri, out.array, out.unsorted);
				}

				
				// check for transforms
				if (forgedModel._req && forgedModel._req.params && Array.isArray(transforms)) {
					
					var params = forgedModel._req.params;

					// loop through each transform
					_.forEach(transforms, function(tf) {
						
						// get the transform param
						var tfp = tf.param;
						
						// if there is a param and the request contains the param
						if (tfp && params.hasOwnProperty(tfp)) {

							// set the value by running it through the transform function
							// or if there is no function pass the value through
							var tfval = (typeof(tf.transform) === _JTYP.funct) ? tf.transform(params[tfp]) : params[tfp];
							out = addField(tf, tfp, tfval, out.array, out.unsorted);
						}
					});
				}
				
				
				
				
				// add the data last
				out = addField(f.data, 'data', results, out.array, out.unsorted);

				// merge the data after removing any undefined			
				return _.merge.apply(
					this,
					_.union(
						_.remove(out.array, undefined),
						out.unsorted
					)
				);
			});
		});
	}
	
	
	// return public functions
	return {
		paginate: paginate
	};
};