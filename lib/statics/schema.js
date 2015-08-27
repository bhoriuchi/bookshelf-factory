// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: schema variables
//

module.exports = {
	_versioned: '_versioned',
	_managed: '_managed',
	_delete: '_delete',
	model: 'model',
	versioned: 'versioned',
	version: 'version',
	protect: 'protect',
	junction: 'junction',
	connectRelation: 'connectRelation',
	views: 'views',
	id: 'id',
	transforms: {
		transform: 'transform',
		saveTransform: 'saveTransform',
		updateTransform: 'updateTransform',
		getTransform: 'getTransform'
	},
	saveTransforms: ['transform', 'saveTransform', 'updateTransform']
};