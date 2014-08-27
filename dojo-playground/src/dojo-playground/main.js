define([
	"exports",
	"dojo/query",
	"dojo/NodeList-dom",
], function (dojoPlayground, query) {
	dojoPlayground.init = function () {
		//	summary:
		//		This function is executed automatically by the loader configuration.
		//		It will be executed after the page has loaded, the DOM is ready, and all
		//		dependencies of this module have been loaded. Use this function to initialize
		//		the application; for instance, creating	a page controller or running the
		//		Dojo parser.

		var acount = query('a');
		console.log(acount.length);
	};
});
