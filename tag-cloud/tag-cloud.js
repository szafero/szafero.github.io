(function() {
	var load_to_body = function(src) {
		var script = document.createElement('script');
		script.src = src;
		script.type = 'text/javascript';
		document.getElementsByTagName('body')[0].appendChild(script);
	};
	load_to_body('http://szafero.github.io/dojoConfig.js');
	load_to_body('http://szafero.github.io/dojo/dojo.js');
})();
