/*jshint unused:false*/
var dojoConfig = {
	async: true,
	baseUrl: 'http://szafero.github.io/dojo-playground/src',
	tlmSiblingOfDojo: false,
	isDebug: true,
	packages: [
		'dojo',
		'dijit',
		'put-selector',
		'xstyle',
		'dgrid',
		'dojo-playground'
	],
	deps: [ 'dojo-playground' ],
	callback: function (dojoPlayground) {
		dojoPlayground.init();
	}
};
