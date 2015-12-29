/**
 * bookshelf-factory re-write
 */

module.exports = function(config) {
	
	// set up modules that will be used
	var _            = require('lodash');
	var moment       = require('moment');
	var dotprune     = require('dotprune');
	var promise      = require('bluebird');
	var uuid         = require('node-uuid');
	var shortId      = require('shortid');
	var qs           = require('qs');
	var EventEmitter = require('events').EventEmitter;
	
	// create an environment object
	var env = {
		lodash   : _,
		moment   : moment,
		dotprune : dotprune,
		promise  : promise,
		uuid     : uuid,
		shortId  : shortId,
		qs       : qs,
		emitter  : new EventEmitter()
	};
	
	// import modules
	env.utils = require('./utils');
	
	// create connection objects
	env.utils.connect();
	
	// load bookshelf plugins
	env.bookshelf.plugin('virtuals');
	
};