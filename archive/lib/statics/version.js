// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: Version variables
//

module.exports = {
	draft: 0,
	parent: {
		active: 'active',
		use_current: 'use_current',
		current_version: 'current_version'
	},
	child: {
		id: 'id',
		parent_id: 'parent_id',
		published: 'published',
		version: 'version',
		valid_from: 'valid_from',
		valid_to: 'valid_to',
		change_notes: 'change_notes'
	},
	type: {
		parent: 'parent',
		child: 'child',
		relation: 'relation'
	}
};