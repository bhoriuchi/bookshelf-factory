// Author: Branden Horiuchi <bhoriuchi@gmail.com>
// Description: methods
//

module.exports = {
	RESOURCE_REFERENCED: {
		code: 'ER_RESOURCE_REFERENCED',
		detail: 'The resource is still being referenced by another, use the {force: true} option to attempt reference removal'
	},
	BAD_REQUEST_BODY: {
		code: 'ER_BAD_REQUEST_BODY',
		detail: 'The request body contained invalid or incomplete data'
	}
};