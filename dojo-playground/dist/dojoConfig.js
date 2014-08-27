/*jshint unused:false*/
var dojoConfig = {
	async: true,
	baseUrl: './',
	tlmSiblingOfDojo: false,
	packages: [
		'dojo',
		'dojo-playground'
	],
	deps: [ 'dojo-playground' ],
	callback: function (dojoPlayground) {
		dojoPlayground.init();
	}
};
