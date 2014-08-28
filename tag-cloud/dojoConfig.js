/*jshint unused:false*/
var dojoConfig = {
	async: true,
	baseUrl: 'http://szafero.github.io/tag-cloud',
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
