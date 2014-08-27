/*jshint unused:false*/
var dojoConfig = {
	async: true,
	baseUrl: 'http://szafero.github.io/dojo-playground/dist',
	tlmSiblingOfDojo: false,
	isDebug: true,
	packages: [
		'dojo',
		'dojo-playground'
	],
	deps: [ 'dojo-playground' ],
	callback: function (dojoPlayground) {
		dojoPlayground.init();
	}
};
