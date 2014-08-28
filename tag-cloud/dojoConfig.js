/*jshint unused:false*/
var dojoConfig = {
	async: true,
	baseUrl: 'http://127.0.0.1:8888',
	tlmSiblingOfDojo: false,
	packages: [
		'dojo',
		'dijit',
		'put-selector',
		'xstyle',
		'dgrid',
		'tag-cloud-bookmarklet',
	],
	deps: [ 'tag-cloud-bookmarklet' ],
	callback: function (tagCloudBookmarklet) {
		tagCloudBookmarklet.init();
	}
};
