require({cache:{
'dojo/query':function(){
define(["./_base/kernel", "./has", "./dom", "./on", "./_base/array", "./_base/lang", "./selector/_loader", "./selector/_loader!default"],
	function(dojo, has, dom, on, array, lang, loader, defaultEngine){

	"use strict";

	has.add("array-extensible", function(){
		// test to see if we can extend an array (not supported in old IE)
		return lang.delegate([], {length: 1}).length == 1 && !has("bug-for-in-skips-shadowed");
	});
	
	var ap = Array.prototype, aps = ap.slice, apc = ap.concat, forEach = array.forEach;

	var tnl = function(/*Array*/ a, /*dojo/NodeList?*/ parent, /*Function?*/ NodeListCtor){
		// summary:
		//		decorate an array to make it look like a `dojo/NodeList`.
		// a:
		//		Array of nodes to decorate.
		// parent:
		//		An optional parent NodeList that generated the current
		//		list of nodes. Used to call _stash() so the parent NodeList
		//		can be accessed via end() later.
		// NodeListCtor:
		//		An optional constructor function to use for any
		//		new NodeList calls. This allows a certain chain of
		//		NodeList calls to use a different object than dojo/NodeList.
		var nodeList = new (NodeListCtor || this._NodeListCtor || nl)(a);
		return parent ? nodeList._stash(parent) : nodeList;
	};

	var loopBody = function(f, a, o){
		a = [0].concat(aps.call(a, 0));
		o = o || dojo.global;
		return function(node){
			a[0] = node;
			return f.apply(o, a);
		};
	};

	// adapters

	var adaptAsForEach = function(f, o){
		// summary:
		//		adapts a single node function to be used in the forEach-type
		//		actions. The initial object is returned from the specialized
		//		function.
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			this.forEach(loopBody(f, arguments, o));
			return this;	// Object
		};
	};

	var adaptAsMap = function(f, o){
		// summary:
		//		adapts a single node function to be used in the map-type
		//		actions. The return is a new array of values, as via `dojo/_base/array.map`
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			return this.map(loopBody(f, arguments, o));
		};
	};

	var adaptAsFilter = function(f, o){
		// summary:
		//		adapts a single node function to be used in the filter-type actions
		// f: Function
		//		a function to adapt
		// o: Object?
		//		an optional context for f
		return function(){
			return this.filter(loopBody(f, arguments, o));
		};
	};

	var adaptWithCondition = function(f, g, o){
		// summary:
		//		adapts a single node function to be used in the map-type
		//		actions, behaves like forEach() or map() depending on arguments
		// f: Function
		//		a function to adapt
		// g: Function
		//		a condition function, if true runs as map(), otherwise runs as forEach()
		// o: Object?
		//		an optional context for f and g
		return function(){
			var a = arguments, body = loopBody(f, a, o);
			if(g.call(o || dojo.global, a)){
				return this.map(body);	// self
			}
			this.forEach(body);
			return this;	// self
		};
	};

	var NodeList = function(array){
		// summary:
		//		Array-like object which adds syntactic
		//		sugar for chaining, common iteration operations, animation, and
		//		node manipulation. NodeLists are most often returned as the
		//		result of dojo/query() calls.
		// description:
		//		NodeList instances provide many utilities that reflect
		//		core Dojo APIs for Array iteration and manipulation, DOM
		//		manipulation, and event handling. Instead of needing to dig up
		//		functions in the dojo package, NodeLists generally make the
		//		full power of Dojo available for DOM manipulation tasks in a
		//		simple, chainable way.
		// example:
		//		create a node list from a node
		//		|	require(["dojo/query", "dojo/dom"
		//		|	], function(query, dom){
		//		|		query.NodeList(dom.byId("foo"));
		//		|	});
		// example:
		//		get a NodeList from a CSS query and iterate on it
		//		|	require(["dojo/on", "dojo/dom"
		//		|	], function(on, dom){
		//		|		var l = query(".thinger");
		//		|		l.forEach(function(node, index, nodeList){
		//		|			console.log(index, node.innerHTML);
		//		|		});
		//		|	});
		// example:
		//		use native and Dojo-provided array methods to manipulate a
		//		NodeList without needing to use dojo.* functions explicitly:
		//		|	require(["dojo/query", "dojo/dom-construct", "dojo/dom"
		//		|	], function(query, domConstruct, dom){
		//		|		var l = query(".thinger");
		//		|		// since NodeLists are real arrays, they have a length
		//		|		// property that is both readable and writable and
		//		|		// push/pop/shift/unshift methods
		//		|		console.log(l.length);
		//		|		l.push(domConstruct.create("span"));
		//		|
		//		|		// dojo's normalized array methods work too:
		//		|		console.log( l.indexOf(dom.byId("foo")) );
		//		|		// ...including the special "function as string" shorthand
		//		|		console.log( l.every("item.nodeType == 1") );
		//		|
		//		|		// NodeLists can be [..] indexed, or you can use the at()
		//		|		// function to get specific items wrapped in a new NodeList:
		//		|		var node = l[3]; // the 4th element
		//		|		var newList = l.at(1, 3); // the 2nd and 4th elements
		//		|	});
		// example:
		//		chainability is a key advantage of NodeLists:
		//		|	require(["dojo/query", "dojo/NodeList-dom"
		//		|	], function(query){
		//		|		query(".thinger")
		//		|			.onclick(function(e){ /* ... */ })
		//		|			.at(1, 3, 8) // get a subset
		//		|				.style("padding", "5px")
		//		|				.forEach(console.log);
		//		|	});

		var isNew = this instanceof nl && has("array-extensible");
		if(typeof array == "number"){
			array = Array(array);
		}
		var nodeArray = (array && "length" in array) ? array : arguments;
		if(isNew || !nodeArray.sort){
			// make sure it's a real array before we pass it on to be wrapped 
			var target = isNew ? this : [],
				l = target.length = nodeArray.length;
			for(var i = 0; i < l; i++){
				target[i] = nodeArray[i];
			}
			if(isNew){
				// called with new operator, this means we are going to use this instance and push
				// the nodes on to it. This is usually much faster since the NodeList properties
				//	don't need to be copied (unless the list of nodes is extremely large).
				return target;
			}
			nodeArray = target;
		}
		// called without new operator, use a real array and copy prototype properties,
		// this is slower and exists for back-compat. Should be removed in 2.0.
		lang._mixin(nodeArray, nlp);
		nodeArray._NodeListCtor = function(array){
			// call without new operator to preserve back-compat behavior
			return nl(array);
		};
		return nodeArray;
	};
	
	var nl = NodeList, nlp = nl.prototype = 
		has("array-extensible") ? [] : {};// extend an array if it is extensible

	// expose adapters and the wrapper as private functions

	nl._wrap = nlp._wrap = tnl;
	nl._adaptAsMap = adaptAsMap;
	nl._adaptAsForEach = adaptAsForEach;
	nl._adaptAsFilter  = adaptAsFilter;
	nl._adaptWithCondition = adaptWithCondition;

	// mass assignment

	// add array redirectors
	forEach(["slice", "splice"], function(name){
		var f = ap[name];
		//Use a copy of the this array via this.slice() to allow .end() to work right in the splice case.
		// CANNOT apply ._stash()/end() to splice since it currently modifies
		// the existing this array -- it would break backward compatibility if we copy the array before
		// the splice so that we can use .end(). So only doing the stash option to this._wrap for slice.
		nlp[name] = function(){ return this._wrap(f.apply(this, arguments), name == "slice" ? this : null); };
	});
	// concat should be here but some browsers with native NodeList have problems with it

	// add array.js redirectors
	forEach(["indexOf", "lastIndexOf", "every", "some"], function(name){
		var f = array[name];
		nlp[name] = function(){ return f.apply(dojo, [this].concat(aps.call(arguments, 0))); };
	});

	lang.extend(NodeList, {
		// copy the constructors
		constructor: nl,
		_NodeListCtor: nl,
		toString: function(){
			// Array.prototype.toString can't be applied to objects, so we use join
			return this.join(",");
		},
		_stash: function(parent){
			// summary:
			//		private function to hold to a parent NodeList. end() to return the parent NodeList.
			//
			// example:
			//		How to make a `dojo/NodeList` method that only returns the third node in
			//		the dojo/NodeList but allows access to the original NodeList by using this._stash:
			//	|	require(["dojo/query", "dojo/_base/lang", "dojo/NodeList", "dojo/NodeList-dom"
			//	|	], function(query, lang){
			//	|		lang.extend(NodeList, {
			//	|			third: function(){
			//	|				var newNodeList = NodeList(this[2]);
			//	|				return newNodeList._stash(this);
			//	|			}
			//	|		});
			//	|		// then see how _stash applies a sub-list, to be .end()'ed out of
			//	|		query(".foo")
			//	|			.third()
			//	|				.addClass("thirdFoo")
			//	|			.end()
			//	|			// access to the orig .foo list
			//	|			.removeClass("foo")
			//	|	});
			//
			this._parent = parent;
			return this; // dojo/NodeList
		},

		on: function(eventName, listener){
			// summary:
			//		Listen for events on the nodes in the NodeList. Basic usage is:
			//
			// example:
			//		|	require(["dojo/query"
			//		|	], function(query){
			//		|		query(".my-class").on("click", listener);
			//			This supports event delegation by using selectors as the first argument with the event names as
			//			pseudo selectors. For example:
			//		| 		query("#my-list").on("li:click", listener);
			//			This will listen for click events within `<li>` elements that are inside the `#my-list` element.
			//			Because on supports CSS selector syntax, we can use comma-delimited events as well:
			//		| 		query("#my-list").on("li button:mouseover, li:click", listener);
			//		|	});
			var handles = this.map(function(node){
				return on(node, eventName, listener); // TODO: apply to the NodeList so the same selector engine is used for matches
			});
			handles.remove = function(){
				for(var i = 0; i < handles.length; i++){
					handles[i].remove();
				}
			};
			return handles;
		},

		end: function(){
			// summary:
			//		Ends use of the current `NodeList` by returning the previous NodeList
			//		that generated the current NodeList.
			// description:
			//		Returns the `NodeList` that generated the current `NodeList`. If there
			//		is no parent NodeList, an empty NodeList is returned.
			// example:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("a")
			//	|			.filter(".disabled")
			//	|				// operate on the anchors that only have a disabled class
			//	|				.style("color", "grey")
			//	|			.end()
			//	|			// jump back to the list of anchors
			//	|			.style(...)
			//	|	});
			//
			if(this._parent){
				return this._parent;
			}else{
				//Just return empty list.
				return new this._NodeListCtor(0);
			}
		},

		// http://developer.mozilla.org/en/docs/Core_JavaScript_1.5_Reference:Global_Objects:Array#Methods

		// FIXME: handle return values for #3244
		//		http://trac.dojotoolkit.org/ticket/3244

		// FIXME:
		//		need to wrap or implement:
		//			join (perhaps w/ innerHTML/outerHTML overload for toString() of items?)
		//			reduce
		//			reduceRight

		/*=====
		slice: function(begin, end){
			// summary:
			//		Returns a new NodeList, maintaining this one in place
			// description:
			//		This method behaves exactly like the Array.slice method
			//		with the caveat that it returns a `dojo/NodeList` and not a
			//		raw Array. For more details, see Mozilla's [slice
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/slice)
			// begin: Integer
			//		Can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// end: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			return this._wrap(a.slice.apply(this, arguments));
		},

		splice: function(index, howmany, item){
			// summary:
			//		Returns a new NodeList, manipulating this NodeList based on
			//		the arguments passed, potentially splicing in new elements
			//		at an offset, optionally deleting elements
			// description:
			//		This method behaves exactly like the Array.splice method
			//		with the caveat that it returns a `dojo/NodeList` and not a
			//		raw Array. For more details, see Mozilla's [splice
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/splice)
			//		For backwards compatibility, calling .end() on the spliced NodeList
			//		does not return the original NodeList -- splice alters the NodeList in place.
			// index: Integer
			//		begin can be a positive or negative integer, with positive
			//		integers noting the offset to begin at, and negative
			//		integers denoting an offset from the end (i.e., to the left
			//		of the end)
			// howmany: Integer?
			//		Optional parameter to describe what position relative to
			//		the NodeList's zero index to end the slice at. Like begin,
			//		can be positive or negative.
			// item: Object...?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList
			return this._wrap(a.splice.apply(this, arguments));	// dojo/NodeList
		},

		indexOf: function(value, fromIndex){
			// summary:
			//		see `dojo/_base/array.indexOf()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList
			// value: Object
			//		The value to search for.
			// fromIndex: Integer?
			//		The location to start searching from. Optional. Defaults to 0.
			// description:
			//		For more details on the behavior of indexOf, see Mozilla's
			//		[indexOf
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/indexOf)
			// returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.indexOf(this, value, fromIndex); // Integer
		},

		lastIndexOf: function(value, fromIndex){
			// summary:
			//		see `dojo/_base/array.lastIndexOf()`. The primary difference is that the
			//		acted-on array is implicitly this NodeList
			// description:
			//		For more details on the behavior of lastIndexOf, see
			//		Mozilla's [lastIndexOf
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/lastIndexOf)
			// value: Object
			//		The value to search for.
			// fromIndex: Integer?
			//		The location to start searching from. Optional. Defaults to 0.
			// returns:
			//		Positive Integer or 0 for a match, -1 of not found.
			return d.lastIndexOf(this, value, fromIndex); // Integer
		},

		every: function(callback, thisObject){
			// summary:
			//		see `dojo/_base/array.every()` and the [Array.every
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/every).
			//		Takes the same structure of arguments and returns as
			//		dojo/_base/array.every() with the caveat that the passed array is
			//		implicitly this NodeList
			// callback: Function
			//		the callback
			// thisObject: Object?
			//		the context
			return d.every(this, callback, thisObject); // Boolean
		},

		some: function(callback, thisObject){
			// summary:
			//		Takes the same structure of arguments and returns as
			//		`dojo/_base/array.some()` with the caveat that the passed array is
			//		implicitly this NodeList.  See `dojo/_base/array.some()` and Mozilla's
			//		[Array.some
			//		documentation](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/some).
			// callback: Function
			//		the callback
			// thisObject: Object?
			//		the context
			return d.some(this, callback, thisObject); // Boolean
		},
		=====*/

		concat: function(item){
			// summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		as well as items passed in as parameters
			// description:
			//		This method behaves exactly like the Array.concat method
			//		with the caveat that it returns a `NodeList` and not a
			//		raw Array. For more details, see the [Array.concat
			//		docs](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/concat)
			// item: Object?
			//		Any number of optional parameters may be passed in to be
			//		spliced into the NodeList

			//return this._wrap(apc.apply(this, arguments));
			// the line above won't work for the native NodeList, or for Dojo NodeLists either :-(

			// implementation notes:
			// Array.concat() doesn't recognize native NodeLists or Dojo NodeLists
			// as arrays, and so does not inline them into a unioned array, but
			// appends them as single entities. Both the original NodeList and the
			// items passed in as parameters must be converted to raw Arrays
			// and then the concatenation result may be re-_wrap()ed as a Dojo NodeList.

			var t = aps.call(this, 0),
				m = array.map(arguments, function(a){
					return aps.call(a, 0);
				});
			return this._wrap(apc.apply(t, m), this);	// dojo/NodeList
		},

		map: function(/*Function*/ func, /*Function?*/ obj){
			// summary:
			//		see `dojo/_base/array.map()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList and the return is a
			//		NodeList (a subclass of Array)
			return this._wrap(array.map(this, func, obj), this); // dojo/NodeList
		},

		forEach: function(callback, thisObj){
			// summary:
			//		see `dojo/_base/array.forEach()`. The primary difference is that the acted-on
			//		array is implicitly this NodeList. If you want the option to break out
			//		of the forEach loop, use every() or some() instead.
			forEach(this, callback, thisObj);
			// non-standard return to allow easier chaining
			return this; // dojo/NodeList
		},
		filter: function(/*String|Function*/ filter){
			// summary:
			//		"masks" the built-in javascript filter() method (supported
			//		in Dojo via `dojo/_base/array.filter`) to support passing a simple
			//		string filter in addition to supporting filtering function
			//		objects.
			// filter:
			//		If a string, a CSS rule like ".thinger" or "div > span".
			// example:
			//		"regular" JS filter syntax as exposed in `dojo/_base/array.filter`:
			//		|	require(["dojo/query", "dojo/NodeList-dom"
			//		|	], function(query){
			//		|		query("*").filter(function(item){
			//		|			// highlight every paragraph
			//		|			return (item.nodeName == "p");
			//		|		}).style("backgroundColor", "yellow");
			//		|	});
			// example:
			//		the same filtering using a CSS selector
			//		|	require(["dojo/query", "dojo/NodeList-dom"
			//		|	], function(query){
			//		|		query("*").filter("p").styles("backgroundColor", "yellow");
			//		|	});

			var a = arguments, items = this, start = 0;
			if(typeof filter == "string"){ // inline'd type check
				items = query._filterResult(this, a[0]);
				if(a.length == 1){
					// if we only got a string query, pass back the filtered results
					return items._stash(this); // dojo/NodeList
				}
				// if we got a callback, run it over the filtered items
				start = 1;
			}
			return this._wrap(array.filter(items, a[start], a[start + 1]), this);	// dojo/NodeList
		},
		instantiate: function(/*String|Object*/ declaredClass, /*Object?*/ properties){
			// summary:
			//		Create a new instance of a specified class, using the
			//		specified properties and each node in the NodeList as a
			//		srcNodeRef.
			// example:
			//		Grabs all buttons in the page and converts them to dijit/form/Button's.
			//	|	var buttons = query("button").instantiate(Button, {showLabel: true});
			var c = lang.isFunction(declaredClass) ? declaredClass : lang.getObject(declaredClass);
			properties = properties || {};
			return this.forEach(function(node){
				new c(properties, node);
			});	// dojo/NodeList
		},
		at: function(/*===== index =====*/){
			// summary:
			//		Returns a new NodeList comprised of items in this NodeList
			//		at the given index or indices.
			//
			// index: Integer...
			//		One or more 0-based indices of items in the current
			//		NodeList. A negative index will start at the end of the
			//		list and go backwards.
			//
			// example:
			//	Shorten the list to the first, second, and third elements
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("a").at(0, 1, 2).forEach(fn);
			//	|	});
			//
			// example:
			//	Retrieve the first and last elements of a unordered list:
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("ul > li").at(0, -1).forEach(cb);
			//	|	});
			//
			// example:
			//	Do something for the first element only, but end() out back to
			//	the original list and continue chaining:
			//	|	require(["dojo/query"
			//	|	], function(query){
			//	|		query("a").at(0).onclick(fn).end().forEach(function(n){
			//	|			console.log(n); // all anchors on the page.
			//	|	})
			//	|	});

			var t = new this._NodeListCtor(0);
			forEach(arguments, function(i){
				if(i < 0){ i = this.length + i; }
				if(this[i]){ t.push(this[i]); }
			}, this);
			return t._stash(this); // dojo/NodeList
		}
	});

	function queryForEngine(engine, NodeList){
		var query = function(/*String*/ query, /*String|DOMNode?*/ root){
			// summary:
			//		Returns nodes which match the given CSS selector, searching the
			//		entire document by default but optionally taking a node to scope
			//		the search by. Returns an instance of NodeList.
			if(typeof root == "string"){
				root = dom.byId(root);
				if(!root){
					return new NodeList([]);
				}
			}
			var results = typeof query == "string" ? engine(query, root) : query ? (query.end && query.on) ? query : [query] : [];
			if(results.end && results.on){
				// already wrapped
				return results;
			}
			return new NodeList(results);
		};
		query.matches = engine.match || function(node, selector, root){
			// summary:
			//		Test to see if a node matches a selector
			return query.filter([node], selector, root).length > 0;
		};
		// the engine provides a filtering function, use it to for matching
		query.filter = engine.filter || function(nodes, selector, root){
			// summary:
			//		Filters an array of nodes. Note that this does not guarantee to return a NodeList, just an array.
			return query(selector, root).filter(function(node){
				return array.indexOf(nodes, node) > -1;
			});
		};
		if(typeof engine != "function"){
			var search = engine.search;
			engine = function(selector, root){
				// Slick does it backwards (or everyone else does it backwards, probably the latter)
				return search(root || document, selector);
			};
		}
		return query;
	}
	var query = queryForEngine(defaultEngine, NodeList);
	/*=====
	query = function(selector, context){
		// summary:
		//		This modules provides DOM querying functionality. The module export is a function
		//		that can be used to query for DOM nodes by CSS selector and returns a NodeList
		//		representing the matching nodes.
		// selector: String
		//		A CSS selector to search for.
		// context: String|DomNode?
		//		An optional context to limit the searching scope. Only nodes under `context` will be
		//		scanned.
		// example:
		//		add an onclick handler to every submit button in the document
		//		which causes the form to be sent via Ajax instead:
		//	|	require(["dojo/query", "dojo/request", "dojo/dom-form", "dojo/dom-construct", "dojo/dom-style"
		//	|	], function(query, request, domForm, domConstruct, domStyle){
		//	|		query("input[type='submit']").on("click", function(e){
		//	|			e.preventDefault(); // prevent sending the form
		//	|			var btn = e.target;
		//	|			request.post("http://example.com/", {
		//	|				data: domForm.toObject(btn.form)
		//	|			}).then(function(response){
		//	|				// replace the form with the response
		//	|				domConstruct.create(div, {innerHTML: response}, btn.form, "after");
		//	|				domStyle.set(btn.form, "display", "none");
		//	|			});
		//	|		});
		//	|	});
		//
		// description:
		//		dojo/query is responsible for loading the appropriate query engine and wrapping
		//		its results with a `NodeList`. You can use dojo/query with a specific selector engine
		//		by using it as a plugin. For example, if you installed the sizzle package, you could
		//		use it as the selector engine with:
		//		|	require(["dojo/query!sizzle"], function(query){
		//		|		query("div")...
		//
		//		The id after the ! can be a module id of the selector engine or one of the following values:
		//
		//		- acme: This is the default engine used by Dojo base, and will ensure that the full
		//		Acme engine is always loaded.
		//
		//		- css2: If the browser has a native selector engine, this will be used, otherwise a
		//		very minimal lightweight selector engine will be loaded that can do simple CSS2 selectors
		//		(by #id, .class, tag, and [name=value] attributes, with standard child or descendant (>)
		//		operators) and nothing more.
		//
		//		- css2.1: If the browser has a native selector engine, this will be used, otherwise the
		//		full Acme engine will be loaded.
		//
		//		- css3: If the browser has a native selector engine with support for CSS3 pseudo
		//		selectors (most modern browsers except IE8), this will be used, otherwise the
		//		full Acme engine will be loaded.
		//
		//		- Or the module id of a selector engine can be used to explicitly choose the selector engine
		//
		//		For example, if you are using CSS3 pseudo selectors in module, you can specify that
		//		you will need support them with:
		//		|	require(["dojo/query!css3"], function(query){
		//		|		query('#t > h3:nth-child(odd)')...
		//
		//		You can also choose the selector engine/load configuration by setting the query-selector:
		//		For example:
		//		|	<script data-dojo-config="query-selector:'css3'" src="dojo.js"></script>
		//
		return new NodeList(); // dojo/NodeList
	 };
	 =====*/

	// the query that is returned from this module is slightly different than dojo.query,
	// because dojo.query has to maintain backwards compatibility with returning a
	// true array which has performance problems. The query returned from the module
	// does not use true arrays, but rather inherits from Array, making it much faster to
	// instantiate.
	dojo.query = queryForEngine(defaultEngine, function(array){
		// call it without the new operator to invoke the back-compat behavior that returns a true array
		return NodeList(array);	// dojo/NodeList
	});

	query.load = function(id, parentRequire, loaded){
		// summary:
		//		can be used as AMD plugin to conditionally load new query engine
		// example:
		//	|	require(["dojo/query!custom"], function(qsa){
		//	|		// loaded selector/custom.js as engine
		//	|		qsa("#foobar").forEach(...);
		//	|	});
		loader.load(id, parentRequire, function(engine){
			loaded(queryForEngine(engine, NodeList));
		});
	};

	dojo._filterQueryResult = query._filterResult = function(nodes, selector, root){
		return new NodeList(query.filter(nodes, selector, root));
	};
	dojo.NodeList = query.NodeList = NodeList;
	return query;
});

},
'dojo/selector/acme':function(){
define([
	"../dom", "../sniff", "../_base/array", "../_base/lang", "../_base/window"
], function(dom, has, array, lang, win){

	// module:
	//		dojo/selector/acme

/*
	acme architectural overview:

		acme is a relatively full-featured CSS3 query library. It is
		designed to take any valid CSS3 selector and return the nodes matching
		the selector. To do this quickly, it processes queries in several
		steps, applying caching where profitable.

		The steps (roughly in reverse order of the way they appear in the code):
			1.) check to see if we already have a "query dispatcher"
				- if so, use that with the given parameterization. Skip to step 4.
			2.) attempt to determine which branch to dispatch the query to:
				- JS (optimized DOM iteration)
				- native (FF3.1+, Safari 3.1+, IE 8+)
			3.) tokenize and convert to executable "query dispatcher"
				- this is where the lion's share of the complexity in the
					system lies. In the DOM version, the query dispatcher is
					assembled as a chain of "yes/no" test functions pertaining to
					a section of a simple query statement (".blah:nth-child(odd)"
					but not "div div", which is 2 simple statements). Individual
					statement dispatchers are cached (to prevent re-definition)
					as are entire dispatch chains (to make re-execution of the
					same query fast)
			4.) the resulting query dispatcher is called in the passed scope
					(by default the top-level document)
				- for DOM queries, this results in a recursive, top-down
					evaluation of nodes based on each simple query section
				- for native implementations, this may mean working around spec
					bugs. So be it.
			5.) matched nodes are pruned to ensure they are unique (if necessary)
*/


	////////////////////////////////////////////////////////////////////////
	// Toolkit aliases
	////////////////////////////////////////////////////////////////////////

	// if you are extracting acme for use in your own system, you will
	// need to provide these methods and properties. No other porting should be
	// necessary, save for configuring the system to use a class other than
	// dojo/NodeList as the return instance instantiator
	var trim = 			lang.trim;
	var each = 			array.forEach;

	var getDoc = function(){ return win.doc; };
	// NOTE(alex): the spec is idiotic. CSS queries should ALWAYS be case-sensitive, but nooooooo
	var cssCaseBug = (getDoc().compatMode) == "BackCompat";

	////////////////////////////////////////////////////////////////////////
	// Global utilities
	////////////////////////////////////////////////////////////////////////


	var specials = ">~+";

	// global thunk to determine whether we should treat the current query as
	// case sensitive or not. This switch is flipped by the query evaluator
	// based on the document passed as the context to search.
	var caseSensitive = false;

	// how high?
	var yesman = function(){ return true; };

	////////////////////////////////////////////////////////////////////////
	// Tokenizer
	////////////////////////////////////////////////////////////////////////

	var getQueryParts = function(query){
		// summary:
		//		state machine for query tokenization
		// description:
		//		instead of using a brittle and slow regex-based CSS parser,
		//		acme implements an AST-style query representation. This
		//		representation is only generated once per query. For example,
		//		the same query run multiple times or under different root nodes
		//		does not re-parse the selector expression but instead uses the
		//		cached data structure. The state machine implemented here
		//		terminates on the last " " (space) character and returns an
		//		ordered array of query component structures (or "parts"). Each
		//		part represents an operator or a simple CSS filtering
		//		expression. The structure for parts is documented in the code
		//		below.


		// NOTE:
		//		this code is designed to run fast and compress well. Sacrifices
		//		to readability and maintainability have been made.  Your best
		//		bet when hacking the tokenizer is to put The Donnas on *really*
		//		loud (may we recommend their "Spend The Night" release?) and
		//		just assume you're gonna make mistakes. Keep the unit tests
		//		open and run them frequently. Knowing is half the battle ;-)
		if(specials.indexOf(query.slice(-1)) >= 0){
			// if we end with a ">", "+", or "~", that means we're implicitly
			// searching all children, so make it explicit
			query += " * ";
		}else{
			// if you have not provided a terminator, one will be provided for
			// you...
			query += " ";
		}

		var ts = function(/*Integer*/ s, /*Integer*/ e){
			// trim and slice.

			// take an index to start a string slice from and an end position
			// and return a trimmed copy of that sub-string
			return trim(query.slice(s, e));
		};

		// the overall data graph of the full query, as represented by queryPart objects
		var queryParts = [];


		// state keeping vars
		var inBrackets = -1, inParens = -1, inMatchFor = -1,
			inPseudo = -1, inClass = -1, inId = -1, inTag = -1, currentQuoteChar,
			lc = "", cc = "", pStart;

		// iteration vars
		var x = 0, // index in the query
			ql = query.length,
			currentPart = null, // data structure representing the entire clause
			_cp = null; // the current pseudo or attr matcher

		// several temporary variables are assigned to this structure during a
		// potential sub-expression match:
		//		attr:
		//			a string representing the current full attribute match in a
		//			bracket expression
		//		type:
		//			if there's an operator in a bracket expression, this is
		//			used to keep track of it
		//		value:
		//			the internals of parenthetical expression for a pseudo. for
		//			:nth-child(2n+1), value might be "2n+1"

		var endTag = function(){
			// called when the tokenizer hits the end of a particular tag name.
			// Re-sets state variables for tag matching and sets up the matcher
			// to handle the next type of token (tag or operator).
			if(inTag >= 0){
				var tv = (inTag == x) ? null : ts(inTag, x); // .toLowerCase();
				currentPart[ (specials.indexOf(tv) < 0) ? "tag" : "oper" ] = tv;
				inTag = -1;
			}
		};

		var endId = function(){
			// called when the tokenizer might be at the end of an ID portion of a match
			if(inId >= 0){
				currentPart.id = ts(inId, x).replace(/\\/g, "");
				inId = -1;
			}
		};

		var endClass = function(){
			// called when the tokenizer might be at the end of a class name
			// match. CSS allows for multiple classes, so we augment the
			// current item with another class in its list
			if(inClass >= 0){
				currentPart.classes.push(ts(inClass + 1, x).replace(/\\/g, ""));
				inClass = -1;
			}
		};

		var endAll = function(){
			// at the end of a simple fragment, so wall off the matches
			endId();
			endTag();
			endClass();
		};

		var endPart = function(){
			endAll();
			if(inPseudo >= 0){
				currentPart.pseudos.push({ name: ts(inPseudo + 1, x) });
			}
			// hint to the selector engine to tell it whether or not it
			// needs to do any iteration. Many simple selectors don't, and
			// we can avoid significant construction-time work by advising
			// the system to skip them
			currentPart.loops = (
					currentPart.pseudos.length ||
					currentPart.attrs.length ||
					currentPart.classes.length	);

			currentPart.oquery = currentPart.query = ts(pStart, x); // save the full expression as a string


			// otag/tag are hints to suggest to the system whether or not
			// it's an operator or a tag. We save a copy of otag since the
			// tag name is cast to upper-case in regular HTML matches. The
			// system has a global switch to figure out if the current
			// expression needs to be case sensitive or not and it will use
			// otag or tag accordingly
			currentPart.otag = currentPart.tag = (currentPart["oper"]) ? null : (currentPart.tag || "*");

			if(currentPart.tag){
				// if we're in a case-insensitive HTML doc, we likely want
				// the toUpperCase when matching on element.tagName. If we
				// do it here, we can skip the string op per node
				// comparison
				currentPart.tag = currentPart.tag.toUpperCase();
			}

			// add the part to the list
			if(queryParts.length && (queryParts[queryParts.length-1].oper)){
				// operators are always infix, so we remove them from the
				// list and attach them to the next match. The evaluator is
				// responsible for sorting out how to handle them.
				currentPart.infixOper = queryParts.pop();
				currentPart.query = currentPart.infixOper.query + " " + currentPart.query;
				/*
				console.debug(	"swapping out the infix",
								currentPart.infixOper,
								"and attaching it to",
								currentPart);
				*/
			}
			queryParts.push(currentPart);

			currentPart = null;
		};

		// iterate over the query, character by character, building up a
		// list of query part objects
		for(; lc=cc, cc=query.charAt(x), x < ql; x++){
			//		cc: the current character in the match
			//		lc: the last character (if any)

			// someone is trying to escape something, so don't try to match any
			// fragments. We assume we're inside a literal.
			if(lc == "\\"){ continue; }
			if(!currentPart){ // a part was just ended or none has yet been created
				// NOTE: I hate all this alloc, but it's shorter than writing tons of if's
				pStart = x;
				//	rules describe full CSS sub-expressions, like:
				//		#someId
				//		.className:first-child
				//	but not:
				//		thinger > div.howdy[type=thinger]
				//	the indidual components of the previous query would be
				//	split into 3 parts that would be represented a structure like:
				//		[
				//			{
				//				query: "thinger",
				//				tag: "thinger",
				//			},
				//			{
				//				query: "div.howdy[type=thinger]",
				//				classes: ["howdy"],
				//				infixOper: {
				//					query: ">",
				//					oper: ">",
				//				}
				//			},
				//		]
				currentPart = {
					query: null, // the full text of the part's rule
					pseudos: [], // CSS supports multiple pseud-class matches in a single rule
					attrs: [],	// CSS supports multi-attribute match, so we need an array
					classes: [], // class matches may be additive, e.g.: .thinger.blah.howdy
					tag: null,	// only one tag...
					oper: null, // ...or operator per component. Note that these wind up being exclusive.
					id: null,	// the id component of a rule
					getTag: function(){
						return caseSensitive ? this.otag : this.tag;
					}
				};

				// if we don't have a part, we assume we're going to start at
				// the beginning of a match, which should be a tag name. This
				// might fault a little later on, but we detect that and this
				// iteration will still be fine.
				inTag = x;
			}

			// Skip processing all quoted characters.
			// If we are inside quoted text then currentQuoteChar stores the character that began the quote,
			// thus that character that will end it.
			if(currentQuoteChar){
				if(cc == currentQuoteChar){
					currentQuoteChar = null;
				}
				continue;
			}else if (cc == "'" || cc == '"'){
				currentQuoteChar = cc;
				continue;
			}

			if(inBrackets >= 0){
				// look for a the close first
				if(cc == "]"){ // if we're in a [...] clause and we end, do assignment
					if(!_cp.attr){
						// no attribute match was previously begun, so we
						// assume this is an attribute existence match in the
						// form of [someAttributeName]
						_cp.attr = ts(inBrackets+1, x);
					}else{
						// we had an attribute already, so we know that we're
						// matching some sort of value, as in [attrName=howdy]
						_cp.matchFor = ts((inMatchFor||inBrackets+1), x);
					}
					var cmf = _cp.matchFor;
					if(cmf){
						// try to strip quotes from the matchFor value. We want
						// [attrName=howdy] to match the same
						//	as [attrName = 'howdy' ]
						if(	(cmf.charAt(0) == '"') || (cmf.charAt(0) == "'") ){
							_cp.matchFor = cmf.slice(1, -1);
						}
					}
					// remove backslash escapes from an attribute match, since DOM
					// querying will get attribute values without backslashes
					if(_cp.matchFor){
						_cp.matchFor = _cp.matchFor.replace(/\\/g, "");
					}

					// end the attribute by adding it to the list of attributes.
					currentPart.attrs.push(_cp);
					_cp = null; // necessary?
					inBrackets = inMatchFor = -1;
				}else if(cc == "="){
					// if the last char was an operator prefix, make sure we
					// record it along with the "=" operator.
					var addToCc = ("|~^$*".indexOf(lc) >=0 ) ? lc : "";
					_cp.type = addToCc+cc;
					_cp.attr = ts(inBrackets+1, x-addToCc.length);
					inMatchFor = x+1;
				}
				// now look for other clause parts
			}else if(inParens >= 0){
				// if we're in a parenthetical expression, we need to figure
				// out if it's attached to a pseudo-selector rule like
				// :nth-child(1)
				if(cc == ")"){
					if(inPseudo >= 0){
						_cp.value = ts(inParens+1, x);
					}
					inPseudo = inParens = -1;
				}
			}else if(cc == "#"){
				// start of an ID match
				endAll();
				inId = x+1;
			}else if(cc == "."){
				// start of a class match
				endAll();
				inClass = x;
			}else if(cc == ":"){
				// start of a pseudo-selector match
				endAll();
				inPseudo = x;
			}else if(cc == "["){
				// start of an attribute match.
				endAll();
				inBrackets = x;
				// provide a new structure for the attribute match to fill-in
				_cp = {
					/*=====
					attr: null, type: null, matchFor: null
					=====*/
				};
			}else if(cc == "("){
				// we really only care if we've entered a parenthetical
				// expression if we're already inside a pseudo-selector match
				if(inPseudo >= 0){
					// provide a new structure for the pseudo match to fill-in
					_cp = {
						name: ts(inPseudo+1, x),
						value: null
					};
					currentPart.pseudos.push(_cp);
				}
				inParens = x;
			}else if(
				(cc == " ") &&
				// if it's a space char and the last char is too, consume the
				// current one without doing more work
				(lc != cc)
			){
				endPart();
			}
		}
		return queryParts;
	};


	////////////////////////////////////////////////////////////////////////
	// DOM query infrastructure
	////////////////////////////////////////////////////////////////////////

	var agree = function(first, second){
		// the basic building block of the yes/no chaining system. agree(f1,
		// f2) generates a new function which returns the boolean results of
		// both of the passed functions to a single logical-anded result. If
		// either are not passed, the other is used exclusively.
		if(!first){ return second; }
		if(!second){ return first; }

		return function(){
			return first.apply(window, arguments) && second.apply(window, arguments);
		};
	};

	var getArr = function(i, arr){
		// helps us avoid array alloc when we don't need it
		var r = arr||[]; // FIXME: should this be 'new d._NodeListCtor()' ?
		if(i){ r.push(i); }
		return r;
	};

	var _isElement = function(n){ return (1 == n.nodeType); };

	// FIXME: need to coalesce _getAttr with defaultGetter
	var blank = "";
	var _getAttr = function(elem, attr){
		if(!elem){ return blank; }
		if(attr == "class"){
			return elem.className || blank;
		}
		if(attr == "for"){
			return elem.htmlFor || blank;
		}
		if(attr == "style"){
			return elem.style.cssText || blank;
		}
		return (caseSensitive ? elem.getAttribute(attr) : elem.getAttribute(attr, 2)) || blank;
	};

	var attrs = {
		"*=": function(attr, value){
			return function(elem){
				// E[foo*="bar"]
				//		an E element whose "foo" attribute value contains
				//		the substring "bar"
				return (_getAttr(elem, attr).indexOf(value)>=0);
			};
		},
		"^=": function(attr, value){
			// E[foo^="bar"]
			//		an E element whose "foo" attribute value begins exactly
			//		with the string "bar"
			return function(elem){
				return (_getAttr(elem, attr).indexOf(value)==0);
			};
		},
		"$=": function(attr, value){
			// E[foo$="bar"]
			//		an E element whose "foo" attribute value ends exactly
			//		with the string "bar"
			return function(elem){
				var ea = " "+_getAttr(elem, attr);
				var lastIndex = ea.lastIndexOf(value);
				return lastIndex > -1 && (lastIndex==(ea.length-value.length));
			};
		},
		"~=": function(attr, value){
			// E[foo~="bar"]
			//		an E element whose "foo" attribute value is a list of
			//		space-separated values, one of which is exactly equal
			//		to "bar"

			// return "[contains(concat(' ',@"+attr+",' '), ' "+ value +" ')]";
			var tval = " "+value+" ";
			return function(elem){
				var ea = " "+_getAttr(elem, attr)+" ";
				return (ea.indexOf(tval)>=0);
			};
		},
		"|=": function(attr, value){
			// E[hreflang|="en"]
			//		an E element whose "hreflang" attribute has a
			//		hyphen-separated list of values beginning (from the
			//		left) with "en"
			var valueDash = value+"-";
			return function(elem){
				var ea = _getAttr(elem, attr);
				return (
					(ea == value) ||
					(ea.indexOf(valueDash)==0)
				);
			};
		},
		"=": function(attr, value){
			return function(elem){
				return (_getAttr(elem, attr) == value);
			};
		}
	};

	// avoid testing for node type if we can. Defining this in the negative
	// here to avoid negation in the fast path.
	var _noNES = (typeof getDoc().firstChild.nextElementSibling == "undefined");
	var _ns = !_noNES ? "nextElementSibling" : "nextSibling";
	var _ps = !_noNES ? "previousElementSibling" : "previousSibling";
	var _simpleNodeTest = (_noNES ? _isElement : yesman);

	var _lookLeft = function(node){
		// look left
		while(node = node[_ps]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var _lookRight = function(node){
		// look right
		while(node = node[_ns]){
			if(_simpleNodeTest(node)){ return false; }
		}
		return true;
	};

	var getNodeIndex = function(node){
		var root = node.parentNode;
		root = root.nodeType != 7 ? root : root.nextSibling; // PROCESSING_INSTRUCTION_NODE
		var i = 0,
			tret = root.children || root.childNodes,
			ci = (node["_i"]||node.getAttribute("_i")||-1),
			cl = (root["_l"]|| (typeof root.getAttribute !== "undefined" ? root.getAttribute("_l") : -1));

		if(!tret){ return -1; }
		var l = tret.length;

		// we calculate the parent length as a cheap way to invalidate the
		// cache. It's not 100% accurate, but it's much more honest than what
		// other libraries do
		if( cl == l && ci >= 0 && cl >= 0 ){
			// if it's legit, tag and release
			return ci;
		}

		// else re-key things
		if(has("ie") && typeof root.setAttribute !== "undefined"){
			root.setAttribute("_l", l);
		}else{
			root["_l"] = l;
		}
		ci = -1;
		for(var te = root["firstElementChild"]||root["firstChild"]; te; te = te[_ns]){
			if(_simpleNodeTest(te)){
				if(has("ie")){
					te.setAttribute("_i", ++i);
				}else{
					te["_i"] = ++i;
				}
				if(node === te){
					// NOTE:
					//	shortcutting the return at this step in indexing works
					//	very well for benchmarking but we avoid it here since
					//	it leads to potential O(n^2) behavior in sequential
					//	getNodexIndex operations on a previously un-indexed
					//	parent. We may revisit this at a later time, but for
					//	now we just want to get the right answer more often
					//	than not.
					ci = i;
				}
			}
		}
		return ci;
	};

	var isEven = function(elem){
		return !((getNodeIndex(elem)) % 2);
	};

	var isOdd = function(elem){
		return ((getNodeIndex(elem)) % 2);
	};

	var pseudos = {
		"checked": function(name, condition){
			return function(elem){
				return !!("checked" in elem ? elem.checked : elem.selected);
			};
		},
		"disabled": function(name, condition){
			return function(elem){
				return elem.disabled;
			};
		},
		"enabled": function(name, condition){
			return function(elem){
				return !elem.disabled;
			};
		},
		"first-child": function(){ return _lookLeft; },
		"last-child": function(){ return _lookRight; },
		"only-child": function(name, condition){
			return function(node){
				return _lookLeft(node) && _lookRight(node);
			};
		},
		"empty": function(name, condition){
			return function(elem){
				// DomQuery and jQuery get this wrong, oddly enough.
				// The CSS 3 selectors spec is pretty explicit about it, too.
				var cn = elem.childNodes;
				var cnl = elem.childNodes.length;
				// if(!cnl){ return true; }
				for(var x=cnl-1; x >= 0; x--){
					var nt = cn[x].nodeType;
					if((nt === 1)||(nt == 3)){ return false; }
				}
				return true;
			};
		},
		"contains": function(name, condition){
			var cz = condition.charAt(0);
			if( cz == '"' || cz == "'" ){ //remove quote
				condition = condition.slice(1, -1);
			}
			return function(elem){
				return (elem.innerHTML.indexOf(condition) >= 0);
			};
		},
		"not": function(name, condition){
			var p = getQueryParts(condition)[0];
			var ignores = { el: 1 };
			if(p.tag != "*"){
				ignores.tag = 1;
			}
			if(!p.classes.length){
				ignores.classes = 1;
			}
			var ntf = getSimpleFilterFunc(p, ignores);
			return function(elem){
				return (!ntf(elem));
			};
		},
		"nth-child": function(name, condition){
			var pi = parseInt;
			// avoid re-defining function objects if we can
			if(condition == "odd"){
				return isOdd;
			}else if(condition == "even"){
				return isEven;
			}
			// FIXME: can we shorten this?
			if(condition.indexOf("n") != -1){
				var tparts = condition.split("n", 2);
				var pred = tparts[0] ? ((tparts[0] == '-') ? -1 : pi(tparts[0])) : 1;
				var idx = tparts[1] ? pi(tparts[1]) : 0;
				var lb = 0, ub = -1;
				if(pred > 0){
					if(idx < 0){
						idx = (idx % pred) && (pred + (idx % pred));
					}else if(idx>0){
						if(idx >= pred){
							lb = idx - idx % pred;
						}
						idx = idx % pred;
					}
				}else if(pred<0){
					pred *= -1;
					// idx has to be greater than 0 when pred is negative;
					// shall we throw an error here?
					if(idx > 0){
						ub = idx;
						idx = idx % pred;
					}
				}
				if(pred > 0){
					return function(elem){
						var i = getNodeIndex(elem);
						return (i>=lb) && (ub<0 || i<=ub) && ((i % pred) == idx);
					};
				}else{
					condition = idx;
				}
			}
			var ncount = pi(condition);
			return function(elem){
				return (getNodeIndex(elem) == ncount);
			};
		}
	};

	var defaultGetter = (has("ie") < 9 || has("ie") == 9 && has("quirks")) ? function(cond){
		var clc = cond.toLowerCase();
		if(clc == "class"){ cond = "className"; }
		return function(elem){
			return (caseSensitive ? elem.getAttribute(cond) : elem[cond]||elem[clc]);
		};
	} : function(cond){
		return function(elem){
			return (elem && elem.getAttribute && elem.hasAttribute(cond));
		};
	};

	var getSimpleFilterFunc = function(query, ignores){
		// generates a node tester function based on the passed query part. The
		// query part is one of the structures generated by the query parser
		// when it creates the query AST. The "ignores" object specifies which
		// (if any) tests to skip, allowing the system to avoid duplicating
		// work where it may have already been taken into account by other
		// factors such as how the nodes to test were fetched in the first
		// place
		if(!query){ return yesman; }
		ignores = ignores||{};

		var ff = null;

		if(!("el" in ignores)){
			ff = agree(ff, _isElement);
		}

		if(!("tag" in ignores)){
			if(query.tag != "*"){
				ff = agree(ff, function(elem){
					return (elem && ((caseSensitive ? elem.tagName : elem.tagName.toUpperCase()) == query.getTag()));
				});
			}
		}

		if(!("classes" in ignores)){
			each(query.classes, function(cname, idx, arr){
				// get the class name
				/*
				var isWildcard = cname.charAt(cname.length-1) == "*";
				if(isWildcard){
					cname = cname.substr(0, cname.length-1);
				}
				// I dislike the regex thing, even if memoized in a cache, but it's VERY short
				var re = new RegExp("(?:^|\\s)" + cname + (isWildcard ? ".*" : "") + "(?:\\s|$)");
				*/
				var re = new RegExp("(?:^|\\s)" + cname + "(?:\\s|$)");
				ff = agree(ff, function(elem){
					return re.test(elem.className);
				});
				ff.count = idx;
			});
		}

		if(!("pseudos" in ignores)){
			each(query.pseudos, function(pseudo){
				var pn = pseudo.name;
				if(pseudos[pn]){
					ff = agree(ff, pseudos[pn](pn, pseudo.value));
				}
			});
		}

		if(!("attrs" in ignores)){
			each(query.attrs, function(attr){
				var matcher;
				var a = attr.attr;
				// type, attr, matchFor
				if(attr.type && attrs[attr.type]){
					matcher = attrs[attr.type](a, attr.matchFor);
				}else if(a.length){
					matcher = defaultGetter(a);
				}
				if(matcher){
					ff = agree(ff, matcher);
				}
			});
		}

		if(!("id" in ignores)){
			if(query.id){
				ff = agree(ff, function(elem){
					return (!!elem && (elem.id == query.id));
				});
			}
		}

		if(!ff){
			if(!("default" in ignores)){
				ff = yesman;
			}
		}
		return ff;
	};

	var _nextSibling = function(filterFunc){
		return function(node, ret, bag){
			while(node = node[_ns]){
				if(_noNES && (!_isElement(node))){ continue; }
				if(
					(!bag || _isUnique(node, bag)) &&
					filterFunc(node)
				){
					ret.push(node);
				}
				break;
			}
			return ret;
		};
	};

	var _nextSiblings = function(filterFunc){
		return function(root, ret, bag){
			var te = root[_ns];
			while(te){
				if(_simpleNodeTest(te)){
					if(bag && !_isUnique(te, bag)){
						break;
					}
					if(filterFunc(te)){
						ret.push(te);
					}
				}
				te = te[_ns];
			}
			return ret;
		};
	};

	// get an array of child *elements*, skipping text and comment nodes
	var _childElements = function(filterFunc){
		filterFunc = filterFunc||yesman;
		return function(root, ret, bag){
			// get an array of child elements, skipping text and comment nodes
			var te, x = 0, tret = root.children || root.childNodes;
			while(te = tret[x++]){
				if(
					_simpleNodeTest(te) &&
					(!bag || _isUnique(te, bag)) &&
					(filterFunc(te, x))
				){
					ret.push(te);
				}
			}
			return ret;
		};
	};

	// test to see if node is below root
	var _isDescendant = function(node, root){
		var pn = node.parentNode;
		while(pn){
			if(pn == root){
				break;
			}
			pn = pn.parentNode;
		}
		return !!pn;
	};

	var _getElementsFuncCache = {};

	var getElementsFunc = function(query){
		var retFunc = _getElementsFuncCache[query.query];
		// if we've got a cached dispatcher, just use that
		if(retFunc){ return retFunc; }
		// else, generate a new on

		// NOTE:
		//		this function returns a function that searches for nodes and
		//		filters them.  The search may be specialized by infix operators
		//		(">", "~", or "+") else it will default to searching all
		//		descendants (the " " selector). Once a group of children is
		//		found, a test function is applied to weed out the ones we
		//		don't want. Many common cases can be fast-pathed. We spend a
		//		lot of cycles to create a dispatcher that doesn't do more work
		//		than necessary at any point since, unlike this function, the
		//		dispatchers will be called every time. The logic of generating
		//		efficient dispatchers looks like this in pseudo code:
		//
		//		# if it's a purely descendant query (no ">", "+", or "~" modifiers)
		//		if infixOperator == " ":
		//			if only(id):
		//				return def(root):
		//					return d.byId(id, root);
		//
		//			elif id:
		//				return def(root):
		//					return filter(d.byId(id, root));
		//
		//			elif cssClass && getElementsByClassName:
		//				return def(root):
		//					return filter(root.getElementsByClassName(cssClass));
		//
		//			elif only(tag):
		//				return def(root):
		//					return root.getElementsByTagName(tagName);
		//
		//			else:
		//				# search by tag name, then filter
		//				return def(root):
		//					return filter(root.getElementsByTagName(tagName||"*"));
		//
		//		elif infixOperator == ">":
		//			# search direct children
		//			return def(root):
		//				return filter(root.children);
		//
		//		elif infixOperator == "+":
		//			# search next sibling
		//			return def(root):
		//				return filter(root.nextElementSibling);
		//
		//		elif infixOperator == "~":
		//			# search rightward siblings
		//			return def(root):
		//				return filter(nextSiblings(root));

		var io = query.infixOper;
		var oper = (io ? io.oper : "");
		// the default filter func which tests for all conditions in the query
		// part. This is potentially inefficient, so some optimized paths may
		// re-define it to test fewer things.
		var filterFunc = getSimpleFilterFunc(query, { el: 1 });
		var qt = query.tag;
		var wildcardTag = ("*" == qt);
		var ecs = getDoc()["getElementsByClassName"];

		if(!oper){
			// if there's no infix operator, then it's a descendant query. ID
			// and "elements by class name" variants can be accelerated so we
			// call them out explicitly:
			if(query.id){
				// testing shows that the overhead of yesman() is acceptable
				// and can save us some bytes vs. re-defining the function
				// everywhere.
				filterFunc = (!query.loops && wildcardTag) ?
					yesman :
					getSimpleFilterFunc(query, { el: 1, id: 1 });

				retFunc = function(root, arr){
					var te = dom.byId(query.id, (root.ownerDocument||root));
					if(!te || !filterFunc(te)){ return; }
					if(9 == root.nodeType){ // if root's a doc, we just return directly
						return getArr(te, arr);
					}else{ // otherwise check ancestry
						if(_isDescendant(te, root)){
							return getArr(te, arr);
						}
					}
				};
			}else if(
				ecs &&
				// isAlien check. Workaround for Prototype.js being totally evil/dumb.
				/\{\s*\[native code\]\s*\}/.test(String(ecs)) &&
				query.classes.length &&
				!cssCaseBug
			){
				// it's a class-based query and we've got a fast way to run it.

				// ignore class and ID filters since we will have handled both
				filterFunc = getSimpleFilterFunc(query, { el: 1, classes: 1, id: 1 });
				var classesString = query.classes.join(" ");
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tret = root.getElementsByClassName(classesString);
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};

			}else if(!wildcardTag && !query.loops){
				// it's tag only. Fast-path it.
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					var tag = query.getTag(),
						tret = tag ? root.getElementsByTagName(tag) : [];
					while((te = tret[x++])){
						if(_isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}else{
				// the common case:
				//		a descendant selector without a fast path. By now it's got
				//		to have a tag selector, even if it's just "*" so we query
				//		by that and filter
				filterFunc = getSimpleFilterFunc(query, { el: 1, tag: 1, id: 1 });
				retFunc = function(root, arr, bag){
					var ret = getArr(0, arr), te, x=0;
					// we use getTag() to avoid case sensitivity issues
					var tag = query.getTag(),
						tret = tag ? root.getElementsByTagName(tag) : [];
					while((te = tret[x++])){
						if(filterFunc(te, root) && _isUnique(te, bag)){
							ret.push(te);
						}
					}
					return ret;
				};
			}
		}else{
			// the query is scoped in some way. Instead of querying by tag we
			// use some other collection to find candidate nodes
			var skipFilters = { el: 1 };
			if(wildcardTag){
				skipFilters.tag = 1;
			}
			filterFunc = getSimpleFilterFunc(query, skipFilters);
			if("+" == oper){
				retFunc = _nextSibling(filterFunc);
			}else if("~" == oper){
				retFunc = _nextSiblings(filterFunc);
			}else if(">" == oper){
				retFunc = _childElements(filterFunc);
			}
		}
		// cache it and return
		return _getElementsFuncCache[query.query] = retFunc;
	};

	var filterDown = function(root, queryParts){
		// NOTE:
		//		this is the guts of the DOM query system. It takes a list of
		//		parsed query parts and a root and finds children which match
		//		the selector represented by the parts
		var candidates = getArr(root), qp, x, te, qpl = queryParts.length, bag, ret;

		for(var i = 0; i < qpl; i++){
			ret = [];
			qp = queryParts[i];
			x = candidates.length - 1;
			if(x > 0){
				// if we have more than one root at this level, provide a new
				// hash to use for checking group membership but tell the
				// system not to post-filter us since we will already have been
				// guaranteed to be unique
				bag = {};
				ret.nozip = true;
			}
			var gef = getElementsFunc(qp);
			for(var j = 0; (te = candidates[j]); j++){
				// for every root, get the elements that match the descendant
				// selector, adding them to the "ret" array and filtering them
				// via membership in this level's bag. If there are more query
				// parts, then this level's return will be used as the next
				// level's candidates
				gef(te, ret, bag);
			}
			if(!ret.length){ break; }
			candidates = ret;
		}
		return ret;
	};

	////////////////////////////////////////////////////////////////////////
	// the query runner
	////////////////////////////////////////////////////////////////////////

	// these are the primary caches for full-query results. The query
	// dispatcher functions are generated then stored here for hash lookup in
	// the future
	var _queryFuncCacheDOM = {},
		_queryFuncCacheQSA = {};

	// this is the second level of splitting, from full-length queries (e.g.,
	// "div.foo .bar") into simple query expressions (e.g., ["div.foo",
	// ".bar"])
	var getStepQueryFunc = function(query){
		var qparts = getQueryParts(trim(query));

		// if it's trivial, avoid iteration and zipping costs
		if(qparts.length == 1){
			// we optimize this case here to prevent dispatch further down the
			// chain, potentially slowing things down. We could more elegantly
			// handle this in filterDown(), but it's slower for simple things
			// that need to be fast (e.g., "#someId").
			var tef = getElementsFunc(qparts[0]);
			return function(root){
				var r = tef(root, []);
				if(r){ r.nozip = true; }
				return r;
			};
		}

		// otherwise, break it up and return a runner that iterates over the parts recursively
		return function(root){
			return filterDown(root, qparts);
		};
	};

	// NOTES:
	//	* we can't trust QSA for anything but document-rooted queries, so
	//	  caching is split into DOM query evaluators and QSA query evaluators
	//	* caching query results is dirty and leak-prone (or, at a minimum,
	//	  prone to unbounded growth). Other toolkits may go this route, but
	//	  they totally destroy their own ability to manage their memory
	//	  footprint. If we implement it, it should only ever be with a fixed
	//	  total element reference # limit and an LRU-style algorithm since JS
	//	  has no weakref support. Caching compiled query evaluators is also
	//	  potentially problematic, but even on large documents the size of the
	//	  query evaluators is often < 100 function objects per evaluator (and
	//	  LRU can be applied if it's ever shown to be an issue).
	//	* since IE's QSA support is currently only for HTML documents and even
	//	  then only in IE 8's "standards mode", we have to detect our dispatch
	//	  route at query time and keep 2 separate caches. Ugg.

	// we need to determine if we think we can run a given query via
	// querySelectorAll or if we'll need to fall back on DOM queries to get
	// there. We need a lot of information about the environment and the query
	// to make the determination (e.g. does it support QSA, does the query in
	// question work in the native QSA impl, etc.).

	// IE QSA queries may incorrectly include comment nodes, so we throw the
	// zipping function into "remove" comments mode instead of the normal "skip
	// it" which every other QSA-clued browser enjoys
	var noZip = has("ie") ? "commentStrip" : "nozip";

	var qsa = "querySelectorAll";
	var qsaAvail = !!getDoc()[qsa];

	//Don't bother with n+3 type of matches, IE complains if we modify those.
	var infixSpaceRe = /\\[>~+]|n\+\d|([^ \\])?([>~+])([^ =])?/g;
	var infixSpaceFunc = function(match, pre, ch, post){
		return ch ? (pre ? pre + " " : "") + ch + (post ? " " + post : "") : /*n+3*/ match;
	};
	
	//Don't apply the infixSpaceRe to attribute value selectors
	var attRe = /([^[]*)([^\]]*])?/g;
	var attFunc = function(match, nonAtt, att){
		return nonAtt.replace(infixSpaceRe, infixSpaceFunc) + (att||"");
	};
	var getQueryFunc = function(query, forceDOM){
		//Normalize query. The CSS3 selectors spec allows for omitting spaces around
		//infix operators, >, ~ and +
		//Do the work here since detection for spaces is used as a simple "not use QSA"
		//test below.
		query = query.replace(attRe, attFunc);

		if(qsaAvail){
			// if we've got a cached variant and we think we can do it, run it!
			var qsaCached = _queryFuncCacheQSA[query];
			if(qsaCached && !forceDOM){ return qsaCached; }
		}

		// else if we've got a DOM cached variant, assume that we already know
		// all we need to and use it
		var domCached = _queryFuncCacheDOM[query];
		if(domCached){ return domCached; }

		// TODO:
		//		today we're caching DOM and QSA branches separately so we
		//		recalc useQSA every time. If we had a way to tag root+query
		//		efficiently, we'd be in good shape to do a global cache.

		var qcz = query.charAt(0);
		var nospace = (-1 == query.indexOf(" "));

		// byId searches are wicked fast compared to QSA, even when filtering
		// is required
		if( (query.indexOf("#") >= 0) && (nospace) ){
			forceDOM = true;
		}

		var useQSA = (
			qsaAvail && (!forceDOM) &&
			// as per CSS 3, we can't currently start w/ combinator:
			//		http://www.w3.org/TR/css3-selectors/#w3cselgrammar
			(specials.indexOf(qcz) == -1) &&
			// IE's QSA impl sucks on pseudos
			(!has("ie") || (query.indexOf(":") == -1)) &&

			(!(cssCaseBug && (query.indexOf(".") >= 0))) &&

			// FIXME:
			//		need to tighten up browser rules on ":contains" and "|=" to
			//		figure out which aren't good
			//		Latest webkit (around 531.21.8) does not seem to do well with :checked on option
			//		elements, even though according to spec, selected options should
			//		match :checked. So go nonQSA for it:
			//		http://bugs.dojotoolkit.org/ticket/5179
			(query.indexOf(":contains") == -1) && (query.indexOf(":checked") == -1) &&
			(query.indexOf("|=") == -1) // some browsers don't grok it
		);

		// TODO:
		//		if we've got a descendant query (e.g., "> .thinger" instead of
		//		just ".thinger") in a QSA-able doc, but are passed a child as a
		//		root, it should be possible to give the item a synthetic ID and
		//		trivially rewrite the query to the form "#synid > .thinger" to
		//		use the QSA branch


		if(useQSA){
			var tq = (specials.indexOf(query.charAt(query.length-1)) >= 0) ?
						(query + " *") : query;
			return _queryFuncCacheQSA[query] = function(root){
				try{
					// the QSA system contains an egregious spec bug which
					// limits us, effectively, to only running QSA queries over
					// entire documents.  See:
					//		http://ejohn.org/blog/thoughts-on-queryselectorall/
					//	despite this, we can also handle QSA runs on simple
					//	selectors, but we don't want detection to be expensive
					//	so we're just checking for the presence of a space char
					//	right now. Not elegant, but it's cheaper than running
					//	the query parser when we might not need to
					if(!((9 == root.nodeType) || nospace)){ throw ""; }
					var r = root[qsa](tq);
					// skip expensive duplication checks and just wrap in a NodeList
					r[noZip] = true;
					return r;
				}catch(e){
					// else run the DOM branch on this query, ensuring that we
					// default that way in the future
					return getQueryFunc(query, true)(root);
				}
			};
		}else{
			// DOM branch
			var parts = query.match(/([^\s,](?:"(?:\\.|[^"])+"|'(?:\\.|[^'])+'|[^,])*)/g);
			return _queryFuncCacheDOM[query] = ((parts.length < 2) ?
				// if not a compound query (e.g., ".foo, .bar"), cache and return a dispatcher
				getStepQueryFunc(query) :
				// if it *is* a complex query, break it up into its
				// constituent parts and return a dispatcher that will
				// merge the parts when run
				function(root){
					var pindex = 0, // avoid array alloc for every invocation
						ret = [],
						tp;
					while((tp = parts[pindex++])){
						ret = ret.concat(getStepQueryFunc(tp)(root));
					}
					return ret;
				}
			);
		}
	};

	var _zipIdx = 0;

	// NOTE:
	//		this function is Moo inspired, but our own impl to deal correctly
	//		with XML in IE
	var _nodeUID = has("ie") ? function(node){
		if(caseSensitive){
			// XML docs don't have uniqueID on their nodes
			return (node.getAttribute("_uid") || node.setAttribute("_uid", ++_zipIdx) || _zipIdx);

		}else{
			return node.uniqueID;
		}
	} :
	function(node){
		return (node._uid || (node._uid = ++_zipIdx));
	};

	// determine if a node in is unique in a "bag". In this case we don't want
	// to flatten a list of unique items, but rather just tell if the item in
	// question is already in the bag. Normally we'd just use hash lookup to do
	// this for us but IE's DOM is busted so we can't really count on that. On
	// the upside, it gives us a built in unique ID function.
	var _isUnique = function(node, bag){
		if(!bag){ return 1; }
		var id = _nodeUID(node);
		if(!bag[id]){ return bag[id] = 1; }
		return 0;
	};

	// attempt to efficiently determine if an item in a list is a dupe,
	// returning a list of "uniques", hopefully in document order
	var _zipIdxName = "_zipIdx";
	var _zip = function(arr){
		if(arr && arr.nozip){ return arr; }

		if(!arr || !arr.length){ return []; }
		if(arr.length < 2){ return [arr[0]]; }

		var ret = [];

		_zipIdx++;

		// we have to fork here for IE and XML docs because we can't set
		// expandos on their nodes (apparently). *sigh*
		var x, te;
		if(has("ie") && caseSensitive){
			var szidx = _zipIdx+"";
			for(x = 0; x < arr.length; x++){
				if((te = arr[x]) && te.getAttribute(_zipIdxName) != szidx){
					ret.push(te);
					te.setAttribute(_zipIdxName, szidx);
				}
			}
		}else if(has("ie") && arr.commentStrip){
			try{
				for(x = 0; x < arr.length; x++){
					if((te = arr[x]) && _isElement(te)){
						ret.push(te);
					}
				}
			}catch(e){ /* squelch */ }
		}else{
			for(x = 0; x < arr.length; x++){
				if((te = arr[x]) && te[_zipIdxName] != _zipIdx){
					ret.push(te);
					te[_zipIdxName] = _zipIdx;
				}
			}
		}
		return ret;
	};

	// the main executor
	var query = function(/*String*/ query, /*String|DOMNode?*/ root){
		// summary:
		//		Returns nodes which match the given CSS3 selector, searching the
		//		entire document by default but optionally taking a node to scope
		//		the search by. Returns an array.
		// description:
		//		dojo.query() is the swiss army knife of DOM node manipulation in
		//		Dojo. Much like Prototype's "$$" (bling-bling) function or JQuery's
		//		"$" function, dojo.query provides robust, high-performance
		//		CSS-based node selector support with the option of scoping searches
		//		to a particular sub-tree of a document.
		//
		//		Supported Selectors:
		//		--------------------
		//
		//		acme supports a rich set of CSS3 selectors, including:
		//
		//		- class selectors (e.g., `.foo`)
		//		- node type selectors like `span`
		//		- ` ` descendant selectors
		//		- `>` child element selectors
		//		- `#foo` style ID selectors
		//		- `*` universal selector
		//		- `~`, the preceded-by sibling selector
		//		- `+`, the immediately preceded-by sibling selector
		//		- attribute queries:
		//			- `[foo]` attribute presence selector
		//			- `[foo='bar']` attribute value exact match
		//			- `[foo~='bar']` attribute value list item match
		//			- `[foo^='bar']` attribute start match
		//			- `[foo$='bar']` attribute end match
		//			- `[foo*='bar']` attribute substring match
		//		- `:first-child`, `:last-child`, and `:only-child` positional selectors
		//		- `:empty` content emtpy selector
		//		- `:checked` pseudo selector
		//		- `:nth-child(n)`, `:nth-child(2n+1)` style positional calculations
		//		- `:nth-child(even)`, `:nth-child(odd)` positional selectors
		//		- `:not(...)` negation pseudo selectors
		//
		//		Any legal combination of these selectors will work with
		//		`dojo.query()`, including compound selectors ("," delimited).
		//		Very complex and useful searches can be constructed with this
		//		palette of selectors and when combined with functions for
		//		manipulation presented by dojo/NodeList, many types of DOM
		//		manipulation operations become very straightforward.
		//
		//		Unsupported Selectors:
		//		----------------------
		//
		//		While dojo.query handles many CSS3 selectors, some fall outside of
		//		what's reasonable for a programmatic node querying engine to
		//		handle. Currently unsupported selectors include:
		//
		//		- namespace-differentiated selectors of any form
		//		- all `::` pseduo-element selectors
		//		- certain pseudo-selectors which don't get a lot of day-to-day use:
		//			- `:root`, `:lang()`, `:target`, `:focus`
		//		- all visual and state selectors:
		//			- `:root`, `:active`, `:hover`, `:visited`, `:link`,
		//				  `:enabled`, `:disabled`
		//			- `:*-of-type` pseudo selectors
		//
		//		dojo.query and XML Documents:
		//		-----------------------------
		//
		//		`dojo.query` (as of dojo 1.2) supports searching XML documents
		//		in a case-sensitive manner. If an HTML document is served with
		//		a doctype that forces case-sensitivity (e.g., XHTML 1.1
		//		Strict), dojo.query() will detect this and "do the right
		//		thing". Case sensitivity is dependent upon the document being
		//		searched and not the query used. It is therefore possible to
		//		use case-sensitive queries on strict sub-documents (iframes,
		//		etc.) or XML documents while still assuming case-insensitivity
		//		for a host/root document.
		//
		//		Non-selector Queries:
		//		---------------------
		//
		//		If something other than a String is passed for the query,
		//		`dojo.query` will return a new `dojo/NodeList` instance
		//		constructed from that parameter alone and all further
		//		processing will stop. This means that if you have a reference
		//		to a node or NodeList, you can quickly construct a new NodeList
		//		from the original by calling `dojo.query(node)` or
		//		`dojo.query(list)`.
		//
		// query:
		//		The CSS3 expression to match against. For details on the syntax of
		//		CSS3 selectors, see <http://www.w3.org/TR/css3-selectors/#selectors>
		// root:
		//		A DOMNode (or node id) to scope the search from. Optional.
		// returns: Array
		// example:
		//		search the entire document for elements with the class "foo":
		//	|	require(["dojo/query"], function(query) {
		//	|	    query(".foo").forEach(function(q) { console.log(q); });
		//	|	});
		//		these elements will match:
		//	|	<span class="foo"></span>
		//	|	<span class="foo bar"></span>
		//	|	<p class="thud foo"></p>
		// example:
		//		search the entire document for elements with the classes "foo" *and* "bar":
		//	|	require(["dojo/query"], function(query) {
		//	|	    query(".foo.bar").forEach(function(q) { console.log(q); });
		//	|	});
		
		//		these elements will match:
		//	|	<span class="foo bar"></span>
		//		while these will not:
		//	|	<span class="foo"></span>
		//	|	<p class="thud foo"></p>
		// example:
		//		find `<span>` elements which are descendants of paragraphs and
		//		which have a "highlighted" class:
		//	|	require(["dojo/query"], function(query) {
		//	|	    query("p span.highlighted").forEach(function(q) { console.log(q); });
		//	|	});
		//		the innermost span in this fragment matches:
		//	|	<p class="foo">
		//	|		<span>...
		//	|			<span class="highlighted foo bar">...</span>
		//	|		</span>
		//	|	</p>
		// example:
		//		set an "odd" class on all odd table rows inside of the table
		//		`#tabular_data`, using the `>` (direct child) selector to avoid
		//		affecting any nested tables:
		//	|	require(["dojo/query"], function(query) {    
		//	|	    query("#tabular_data > tbody > tr:nth-child(odd)").addClass("odd");
		//	|	);
		// example:
		//		remove all elements with the class "error" from the document:
		//	|	require(["dojo/query"], function(query) {
		//	|	    query(".error").orphan();
		//	|	);
		// example:
		//		add an onclick handler to every submit button in the document
		//		which causes the form to be sent via Ajax instead:
		//	|	require(["dojo/query", "dojo/request", "dojo/dom-construct", "dojo/dom-style"
		//	|	], function (query, request, domConstruct, domStyle) {
		//	|	    query("input[type='submit']").on("click", function (e) {
		//	|	        e.stopPropagation();
		//	|	        e.preventDefault();
		//	|	        var btn = e.target;
		//	|	        request.post("", { data: btn.form, timeout: 2000 })
		//	|	        .then(function (data) {
		//	|	            // replace the form with the response
		//	|	            domConstruct.create("div", { innerHTML: data }, btn.form, "after");
		//	|	            domStyle.set(btn.form, "display", "none");
		//	|	        });
		//	|	    });
		//	|	});


		root = root || getDoc();

		// throw the big case sensitivity switch
		var od = root.ownerDocument || root;	// root is either Document or a node inside the document
		caseSensitive = (od.createElement("div").tagName === "div");

		// NOTE:
		//		adding "true" as the 2nd argument to getQueryFunc is useful for
		//		testing the DOM branch without worrying about the
		//		behavior/performance of the QSA branch.
		var r = getQueryFunc(query)(root);

		// FIXME:
		//		need to investigate this branch WRT #8074 and #8075
		if(r && r.nozip){
			return r;
		}
		return _zip(r); // dojo/NodeList
	};
	query.filter = function(/*Node[]*/ nodeList, /*String*/ filter, /*String|DOMNode?*/ root){
		// summary:
		//		function for filtering a NodeList based on a selector, optimized for simple selectors
		var tmpNodeList = [],
			parts = getQueryParts(filter),
			filterFunc =
				(parts.length == 1 && !/[^\w#\.]/.test(filter)) ?
				getSimpleFilterFunc(parts[0]) :
				function(node){
					return array.indexOf(query(filter, dom.byId(root)), node) != -1;
				};
		for(var x = 0, te; te = nodeList[x]; x++){
			if(filterFunc(te)){ tmpNodeList.push(te); }
		}
		return tmpNodeList;
	};
	return query;
});

},
'dojo/html':function(){
define(["./_base/kernel", "./_base/lang", "./_base/array", "./_base/declare", "./dom", "./dom-construct", "./parser"],
	function(kernel, lang, darray, declare, dom, domConstruct, parser){
	// module:
	//		dojo/html

	// the parser might be needed..

	// idCounter is incremented with each instantiation to allow assignment of a unique id for tracking, logging purposes
	var idCounter = 0;

	var html = {
		// summary:
		//		TODOC

		_secureForInnerHtml: function(/*String*/ cont){
			// summary:
			//		removes !DOCTYPE and title elements from the html string.
			//
			//		khtml is picky about dom faults, you can't attach a style or `<title>` node as child of body
			//		must go into head, so we need to cut out those tags
			// cont:
			//		An html string for insertion into the dom
			//
			return cont.replace(/(?:\s*<!DOCTYPE\s[^>]+>|<title[^>]*>[\s\S]*?<\/title>)/ig, ""); // String
		},

		// Deprecated, should use dojo/dom-constuct.empty() directly, remove in 2.0.
		_emptyNode: domConstruct.empty,

		_setNodeContent: function(/*DomNode*/ node, /*String|DomNode|NodeList*/ cont){
			// summary:
			//		inserts the given content into the given node
			// node:
			//		the parent element
			// content:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo/NodeList, Array or other enumerable list of nodes

			// always empty
			domConstruct.empty(node);

			if(cont){
				if(typeof cont == "string"){
					cont = domConstruct.toDom(cont, node.ownerDocument);
				}
				if(!cont.nodeType && lang.isArrayLike(cont)){
					// handle as enumerable, but it may shrink as we enumerate it
					for(var startlen=cont.length, i=0; i<cont.length; i=startlen==cont.length ? i+1 : 0){
						domConstruct.place( cont[i], node, "last");
					}
				}else{
					// pass nodes, documentFragments and unknowns through to dojo.place
					domConstruct.place(cont, node, "last");
				}
			}

			// return DomNode
			return node;
		},

		// we wrap up the content-setting operation in a object
		_ContentSetter: declare("dojo.html._ContentSetter", null, {
			// node: DomNode|String
			//		An node which will be the parent element that we set content into
			node: "",

			// content: String|DomNode|DomNode[]
			//		The content to be placed in the node. Can be an HTML string, a node reference, or a enumerable list of nodes
			content: "",

			// id: String?
			//		Usually only used internally, and auto-generated with each instance
			id: "",

			// cleanContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of <html>, <body> wrapper before injection
			cleanContent: false,

			// extractContent: Boolean
			//		Should the content be treated as a full html document,
			//		and the real content stripped of `<html> <body>` wrapper before injection
			extractContent: false,

			// parseContent: Boolean
			//		Should the node by passed to the parser after the new content is set
			parseContent: false,

			// parserScope: String
			//		Flag passed to parser.	Root for attribute names to search for.	  If scopeName is dojo,
			//		will search for data-dojo-type (or dojoType).  For backwards compatibility
			//		reasons defaults to dojo._scopeName (which is "dojo" except when
			//		multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			parserScope: kernel._scopeName,

			// startup: Boolean
			//		Start the child widgets after parsing them.	  Only obeyed if parseContent is true.
			startup: true,

			// lifecycle methods
			constructor: function(/*Object*/ params, /*String|DomNode*/ node){
				// summary:
				//		Provides a configurable, extensible object to wrap the setting on content on a node
				//		call the set() method to actually set the content..

				// the original params are mixed directly into the instance "this"
				lang.mixin(this, params || {});

				// give precedence to params.node vs. the node argument
				// and ensure its a node, not an id string
				node = this.node = dom.byId( this.node || node );

				if(!this.id){
					this.id = [
						"Setter",
						(node) ? node.id || node.tagName : "",
						idCounter++
					].join("_");
				}
			},
			set: function(/* String|DomNode|NodeList? */ cont, /*Object?*/ params){
				// summary:
				//		front-end to the set-content sequence
				// cont:
				//		An html string, node or enumerable list of nodes for insertion into the dom
				//		If not provided, the object's content property will be used
				if(undefined !== cont){
					this.content = cont;
				}
				// in the re-use scenario, set needs to be able to mixin new configuration
				if(params){
					this._mixin(params);
				}

				this.onBegin();
				this.setContent();

				var ret = this.onEnd();

				if(ret && ret.then){
					// Make dojox/html/_ContentSetter.set() return a Promise that resolves when load and parse complete.
					return ret;
				}else{
					// Vanilla dojo/html._ContentSetter.set() returns a DOMNode for back compat.   For 2.0, switch it to
					// return a Deferred like above.
					return this.node;
				}
			},

			setContent: function(){
				// summary:
				//		sets the content on the node

				var node = this.node;
				if(!node){
					// can't proceed
					throw new Error(this.declaredClass + ": setContent given no node");
				}
				try{
					node = html._setNodeContent(node, this.content);
				}catch(e){
					// check if a domfault occurs when we are appending this.errorMessage
					// like for instance if domNode is a UL and we try append a DIV

					// FIXME: need to allow the user to provide a content error message string
					var errMess = this.onContentError(e);
					try{
						node.innerHTML = errMess;
					}catch(e){
						console.error('Fatal ' + this.declaredClass + '.setContent could not change content due to '+e.message, e);
					}
				}
				// always put back the node for the next method
				this.node = node; // DomNode
			},

			empty: function(){
				// summary:
				//		cleanly empty out existing content

				// If there is a parse in progress, cancel it.
				if(this.parseDeferred){
					if(!this.parseDeferred.isResolved()){
						this.parseDeferred.cancel();
					}
					delete this.parseDeferred;
				}

				// destroy any widgets from a previous run
				// NOTE: if you don't want this you'll need to empty
				// the parseResults array property yourself to avoid bad things happening
				if(this.parseResults && this.parseResults.length){
					darray.forEach(this.parseResults, function(w){
						if(w.destroy){
							w.destroy();
						}
					});
					delete this.parseResults;
				}
				// this is fast, but if you know its already empty or safe, you could
				// override empty to skip this step
				domConstruct.empty(this.node);
			},

			onBegin: function(){
				// summary:
				//		Called after instantiation, but before set();
				//		It allows modification of any of the object properties -
				//		including the node and content provided - before the set operation actually takes place
				//		This default implementation checks for cleanContent and extractContent flags to
				//		optionally pre-process html string content
				var cont = this.content;

				if(lang.isString(cont)){
					if(this.cleanContent){
						cont = html._secureForInnerHtml(cont);
					}

					if(this.extractContent){
						var match = cont.match(/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im);
						if(match){ cont = match[1]; }
					}
				}

				// clean out the node and any cruft associated with it - like widgets
				this.empty();

				this.content = cont;
				return this.node; // DomNode
			},

			onEnd: function(){
				// summary:
				//		Called after set(), when the new content has been pushed into the node
				//		It provides an opportunity for post-processing before handing back the node to the caller
				//		This default implementation checks a parseContent flag to optionally run the dojo parser over the new content
				if(this.parseContent){
					// populates this.parseResults and this.parseDeferred if you need those..
					this._parse();
				}
				return this.node; // DomNode
				// TODO: for 2.0 return a Promise indicating that the parse completed.
			},

			tearDown: function(){
				// summary:
				//		manually reset the Setter instance if its being re-used for example for another set()
				// description:
				//		tearDown() is not called automatically.
				//		In normal use, the Setter instance properties are simply allowed to fall out of scope
				//		but the tearDown method can be called to explicitly reset this instance.
				delete this.parseResults;
				delete this.parseDeferred;
				delete this.node;
				delete this.content;
			},

			onContentError: function(err){
				return "Error occurred setting content: " + err;
			},

			onExecError: function(err){
				return "Error occurred executing scripts: " + err;
			},

			_mixin: function(params){
				// mix properties/methods into the instance
				// TODO: the intention with tearDown is to put the Setter's state
				// back to that of the original constructor (vs. deleting/resetting everything regardless of ctor params)
				// so we could do something here to move the original properties aside for later restoration
				var empty = {}, key;
				for(key in params){
					if(key in empty){ continue; }
					// TODO: here's our opportunity to mask the properties we don't consider configurable/overridable
					// .. but history shows we'll almost always guess wrong
					this[key] = params[key];
				}
			},
			_parse: function(){
				// summary:
				//		runs the dojo parser over the node contents, storing any results in this.parseResults
				//		and the parse promise in this.parseDeferred
				//		Any errors resulting from parsing are passed to _onError for handling

				var rootNode = this.node;
				try{
					// store the results (widgets, whatever) for potential retrieval
					var inherited = {};
					darray.forEach(["dir", "lang", "textDir"], function(name){
						if(this[name]){
							inherited[name] = this[name];
						}
					}, this);
					var self = this;
					this.parseDeferred = parser.parse({
						rootNode: rootNode,
						noStart: !this.startup,
						inherited: inherited,
						scope: this.parserScope
					}).then(function(results){
							return self.parseResults = results;
						}, function(e){
							self._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
						});
				}catch(e){
					this._onError('Content', e, "Error parsing in _ContentSetter#" + this.id);
				}
			},

			_onError: function(type, err, consoleText){
				// summary:
				//		shows user the string that is returned by on[type]Error
				//		override/implement on[type]Error and return your own string to customize
				var errText = this['on' + type + 'Error'].call(this, err);
				if(consoleText){
					console.error(consoleText, err);
				}else if(errText){ // a empty string won't change current content
					html._setNodeContent(this.node, errText, true);
				}
			}
		}), // end declare()

		set: function(/*DomNode*/ node, /*String|DomNode|NodeList*/ cont, /*Object?*/ params){
			// summary:
			//		inserts (replaces) the given content into the given node. dojo/dom-construct.place(cont, node, "only")
			//		may be a better choice for simple HTML insertion.
			// description:
			//		Unless you need to use the params capabilities of this method, you should use
			//		dojo/dom-construct.place(cont, node, "only"). dojo/dom-construct..place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo/dom-construct..place does not handle NodeList insertions
			//		dojo/dom-construct.place(cont, node, "only"). dojo/dom-construct.place() has more robust support for injecting
			//		an HTML string into the DOM, but it only handles inserting an HTML string as DOM
			//		elements, or inserting a DOM node. dojo/dom-construct.place does not handle NodeList insertions
			//		or the other capabilities as defined by the params object for this method.
			// node:
			//		the parent element that will receive the content
			// cont:
			//		the content to be set on the parent element.
			//		This can be an html string, a node reference or a NodeList, dojo/NodeList, Array or other enumerable list of nodes
			// params:
			//		Optional flags/properties to configure the content-setting. See dojo/html/_ContentSetter
			// example:
			//		A safe string/node/nodelist content replacement/injection with hooks for extension
			//		Example Usage:
			//	|	html.set(node, "some string");
			//	|	html.set(node, contentNode, {options});
			//	|	html.set(node, myNode.childNodes, {options});
			if(undefined == cont){
				console.warn("dojo.html.set: no cont argument provided, using empty string");
				cont = "";
			}
			if(!params){
				// simple and fast
				return html._setNodeContent(node, cont, true);
			}else{
				// more options but slower
				// note the arguments are reversed in order, to match the convention for instantiation via the parser
				var op = new html._ContentSetter(lang.mixin(
					params,
					{ content: cont, node: node }
				));
				return op.set();
			}
		}
	};
	lang.setObject("dojo.html", html);

	return html;
});

},
'dojo/_base/declare':function(){
define(["./kernel", "../has", "./lang"], function(dojo, has, lang){
	// module:
	//		dojo/_base/declare

	var mix = lang.mixin, op = Object.prototype, opts = op.toString,
		xtor = new Function, counter = 0, cname = "constructor";

	function err(msg, cls){ throw new Error("declare" + (cls ? " " + cls : "") + ": " + msg); }

	// C3 Method Resolution Order (see http://www.python.org/download/releases/2.3/mro/)
	function c3mro(bases, className){
		var result = [], roots = [{cls: 0, refs: []}], nameMap = {}, clsCount = 1,
			l = bases.length, i = 0, j, lin, base, top, proto, rec, name, refs;

		// build a list of bases naming them if needed
		for(; i < l; ++i){
			base = bases[i];
			if(!base){
				err("mixin #" + i + " is unknown. Did you use dojo.require to pull it in?", className);
			}else if(opts.call(base) != "[object Function]"){
				err("mixin #" + i + " is not a callable constructor.", className);
			}
			lin = base._meta ? base._meta.bases : [base];
			top = 0;
			// add bases to the name map
			for(j = lin.length - 1; j >= 0; --j){
				proto = lin[j].prototype;
				if(!proto.hasOwnProperty("declaredClass")){
					proto.declaredClass = "uniqName_" + (counter++);
				}
				name = proto.declaredClass;
				if(!nameMap.hasOwnProperty(name)){
					nameMap[name] = {count: 0, refs: [], cls: lin[j]};
					++clsCount;
				}
				rec = nameMap[name];
				if(top && top !== rec){
					rec.refs.push(top);
					++top.count;
				}
				top = rec;
			}
			++top.count;
			roots[0].refs.push(top);
		}

		// remove classes without external references recursively
		while(roots.length){
			top = roots.pop();
			result.push(top.cls);
			--clsCount;
			// optimization: follow a single-linked chain
			while(refs = top.refs, refs.length == 1){
				top = refs[0];
				if(!top || --top.count){
					// branch or end of chain => do not end to roots
					top = 0;
					break;
				}
				result.push(top.cls);
				--clsCount;
			}
			if(top){
				// branch
				for(i = 0, l = refs.length; i < l; ++i){
					top = refs[i];
					if(!--top.count){
						roots.push(top);
					}
				}
			}
		}
		if(clsCount){
			err("can't build consistent linearization", className);
		}

		// calculate the superclass offset
		base = bases[0];
		result[0] = base ?
			base._meta && base === result[result.length - base._meta.bases.length] ?
				base._meta.bases.length : 1 : 0;

		return result;
	}

	function inherited(args, a, f){
		var name, chains, bases, caller, meta, base, proto, opf, pos,
			cache = this._inherited = this._inherited || {};

		// crack arguments
		if(typeof args == "string"){
			name = args;
			args = a;
			a = f;
		}
		f = 0;

		caller = args.callee;
		name = name || caller.nom;
		if(!name){
			err("can't deduce a name to call inherited()", this.declaredClass);
		}

		meta = this.constructor._meta;
		bases = meta.bases;

		pos = cache.p;
		if(name != cname){
			// method
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				base = bases[0];
				meta = base._meta;
				if(meta.hidden[name] !== caller){
					// error detection
					chains = meta.chains;
					if(chains && typeof chains[name] == "string"){
						err("calling chained method with inherited: " + name, this.declaredClass);
					}
					// find caller
					do{
						meta = base._meta;
						proto = base.prototype;
						if(meta && (proto[name] === caller && proto.hasOwnProperty(name) || meta.hidden[name] === caller)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
					pos = base ? pos : -1;
				}
			}
			// find next
			base = bases[++pos];
			if(base){
				proto = base.prototype;
				if(base._meta && proto.hasOwnProperty(name)){
					f = proto[name];
				}else{
					opf = op[name];
					do{
						proto = base.prototype;
						f = proto[name];
						if(f && (base._meta ? proto.hasOwnProperty(name) : f !== opf)){
							break;
						}
					}while(base = bases[++pos]); // intentional assignment
				}
			}
			f = base && f || op[name];
		}else{
			// constructor
			if(cache.c !== caller){
				// cache bust
				pos = 0;
				meta = bases[0]._meta;
				if(meta && meta.ctor !== caller){
					// error detection
					chains = meta.chains;
					if(!chains || chains.constructor !== "manual"){
						err("calling chained constructor with inherited", this.declaredClass);
					}
					// find caller
					while(base = bases[++pos]){ // intentional assignment
						meta = base._meta;
						if(meta && meta.ctor === caller){
							break;
						}
					}
					pos = base ? pos : -1;
				}
			}
			// find next
			while(base = bases[++pos]){	// intentional assignment
				meta = base._meta;
				f = meta ? meta.ctor : base;
				if(f){
					break;
				}
			}
			f = base && f;
		}

		// cache the found super method
		cache.c = f;
		cache.p = pos;

		// now we have the result
		if(f){
			return a === true ? f : f.apply(this, a || args);
		}
		// intentionally no return if a super method was not found
	}

	function getInherited(name, args){
		if(typeof name == "string"){
			return this.__inherited(name, args, true);
		}
		return this.__inherited(name, true);
	}

	function inherited__debug(args, a1, a2){
		var f = this.getInherited(args, a1);
		if(f){ return f.apply(this, a2 || a1 || args); }
		// intentionally no return if a super method was not found
	}

	var inheritedImpl = dojo.config.isDebug ? inherited__debug : inherited;

	// emulation of "instanceof"
	function isInstanceOf(cls){
		var bases = this.constructor._meta.bases;
		for(var i = 0, l = bases.length; i < l; ++i){
			if(bases[i] === cls){
				return true;
			}
		}
		return this instanceof cls;
	}

	function mixOwn(target, source){
		// add props adding metadata for incoming functions skipping a constructor
		for(var name in source){
			if(name != cname && source.hasOwnProperty(name)){
				target[name] = source[name];
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				if(name != cname && source.hasOwnProperty(name)){
					  target[name] = source[name];
				}
			}
		}
	}

	// implementation of safe mixin function
	function safeMixin(target, source){
		// summary:
		//		Mix in properties skipping a constructor and decorating functions
		//		like it is done by declare().
		// target: Object
		//		Target object to accept new properties.
		// source: Object
		//		Source object for new properties.
		// description:
		//		This function is used to mix in properties like lang.mixin does,
		//		but it skips a constructor property and decorates functions like
		//		declare() does.
		//
		//		It is meant to be used with classes and objects produced with
		//		declare. Functions mixed in with dojo.safeMixin can use
		//		this.inherited() like normal methods.
		//
		//		This function is used to implement extend() method of a constructor
		//		produced with declare().
		//
		// example:
		//	|	var A = declare(null, {
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m1");
		//	|		}
		//	|	});
		//	|	B.extend({
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	dojo.safeMixin(x, {
		//	|		m1: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m1");
		//	|		},
		//	|		m2: function(){
		//	|			this.inherited(arguments);
		//	|			console.log("X.m2");
		//	|		}
		//	|	});
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m1
		//	|	// B.m1
		//	|	// X.m1

		var name, t;
		// add props adding metadata for incoming functions skipping a constructor
		for(name in source){
			t = source[name];
			if((t !== op[name] || !(name in op)) && name != cname){
				if(opts.call(t) == "[object Function]"){
					// non-trivial function method => attach its name
					t.nom = name;
				}
				target[name] = t;
			}
		}
		if(has("bug-for-in-skips-shadowed")){
			for(var extraNames= lang._extraNames, i= extraNames.length; i;){
				name = extraNames[--i];
				t = source[name];
				if((t !== op[name] || !(name in op)) && name != cname){
					if(opts.call(t) == "[object Function]"){
						// non-trivial function method => attach its name
						  t.nom = name;
					}
					target[name] = t;
				}
			}
		}
		return target;
	}

	function extend(source){
		declare.safeMixin(this.prototype, source);
		return this;
	}

    function createSubclass(mixins, props){
        // crack parameters
        if(!(mixins instanceof Array || typeof mixins == 'function')){
            props = mixins;
            mixins = undefined;
        }

        props = props || {};
        mixins = mixins || [];

        return declare([this].concat(mixins), props);
    }

	// chained constructor compatible with the legacy declare()
	function chainedConstructor(bases, ctorSpecial){
		return function(){
			var a = arguments, args = a, a0 = a[0], f, i, m,
				l = bases.length, preArgs;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial && (a0 && a0.preamble || this.preamble)){
				// full blown ritual
				preArgs = new Array(bases.length);
				// prepare parameters
				preArgs[0] = a;
				for(i = 0;;){
					// process the preamble of the 1st argument
					a0 = a[0];
					if(a0){
						f = a0.preamble;
						if(f){
							a = f.apply(this, a) || a;
						}
					}
					// process the preamble of this class
					f = bases[i].prototype;
					f = f.hasOwnProperty("preamble") && f.preamble;
					if(f){
						a = f.apply(this, a) || a;
					}
					// one peculiarity of the preamble:
					// it is called if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
					if(++i == l){
						break;
					}
					preArgs[i] = a;
				}
			}
			// 2) call all non-trivial constructors using prepared arguments
			for(i = l - 1; i >= 0; --i){
				f = bases[i];
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, preArgs ? preArgs[i] : a);
				}
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, args);
			}
		};
	}


	// chained constructor compatible with the legacy declare()
	function singleConstructor(ctor, ctorSpecial){
		return function(){
			var a = arguments, t = a, a0 = a[0], f;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) call two types of the preamble
			if(ctorSpecial){
				// full blown ritual
				if(a0){
					// process the preamble of the 1st argument
					f = a0.preamble;
					if(f){
						t = f.apply(this, t) || t;
					}
				}
				f = this.preamble;
				if(f){
					// process the preamble of this class
					f.apply(this, t);
					// one peculiarity of the preamble:
					// it is called even if it is not needed,
					// e.g., there is no constructor to call
					// let's watch for the last constructor
					// (see ticket #9795)
				}
			}
			// 2) call a constructor
			if(ctor){
				ctor.apply(this, a);
			}
			// 3) continue the original ritual: call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	// plain vanilla constructor (can use inherited() to call its base constructor)
	function simpleConstructor(bases){
		return function(){
			var a = arguments, i = 0, f, m;

			if(!(this instanceof a.callee)){
				// not called via new, so force it
				return applyNew(a);
			}

			//this._inherited = {};
			// perform the shaman's rituals of the original declare()
			// 1) do not call the preamble
			// 2) call the top constructor (it can use this.inherited())
			for(; f = bases[i]; ++i){ // intentional assignment
				m = f._meta;
				f = m ? m.ctor : f;
				if(f){
					f.apply(this, a);
					break;
				}
			}
			// 3) call the postscript
			f = this.postscript;
			if(f){
				f.apply(this, a);
			}
		};
	}

	function chain(name, bases, reversed){
		return function(){
			var b, m, f, i = 0, step = 1;
			if(reversed){
				i = bases.length - 1;
				step = -1;
			}
			for(; b = bases[i]; i += step){ // intentional assignment
				m = b._meta;
				f = (m ? m.hidden : b.prototype)[name];
				if(f){
					f.apply(this, arguments);
				}
			}
		};
	}

	// forceNew(ctor)
	// return a new object that inherits from ctor.prototype but
	// without actually running ctor on the object.
	function forceNew(ctor){
		// create object with correct prototype using a do-nothing
		// constructor
		xtor.prototype = ctor.prototype;
		var t = new xtor;
		xtor.prototype = null;	// clean up
		return t;
	}

	// applyNew(args)
	// just like 'new ctor()' except that the constructor and its arguments come
	// from args, which must be an array or an arguments object
	function applyNew(args){
		// create an object with ctor's prototype but without
		// calling ctor on it.
		var ctor = args.callee, t = forceNew(ctor);
		// execute the real constructor on the new object
		ctor.apply(t, args);
		return t;
	}

	function declare(className, superclass, props){
		// summary:
		//		Create a feature-rich constructor from compact notation.
		// className: String?
		//		The optional name of the constructor (loosely, a "class")
		//		stored in the "declaredClass" property in the created prototype.
		//		It will be used as a global name for a created constructor.
		// superclass: Function|Function[]
		//		May be null, a Function, or an Array of Functions. This argument
		//		specifies a list of bases (the left-most one is the most deepest
		//		base).
		// props: Object
		//		An object whose properties are copied to the created prototype.
		//		Add an instance-initialization function by making it a property
		//		named "constructor".
		// returns: dojo/_base/declare.__DeclareCreatedObject
		//		New constructor function.
		// description:
		//		Create a constructor using a compact notation for inheritance and
		//		prototype extension.
		//
		//		Mixin ancestors provide a type of multiple inheritance.
		//		Prototypes of mixin ancestors are copied to the new class:
		//		changes to mixin prototypes will not affect classes to which
		//		they have been mixed in.
		//
		//		Ancestors can be compound classes created by this version of
		//		declare(). In complex cases all base classes are going to be
		//		linearized according to C3 MRO algorithm
		//		(see http://www.python.org/download/releases/2.3/mro/ for more
		//		details).
		//
		//		"className" is cached in "declaredClass" property of the new class,
		//		if it was supplied. The immediate super class will be cached in
		//		"superclass" property of the new class.
		//
		//		Methods in "props" will be copied and modified: "nom" property
		//		(the declared name of the method) will be added to all copied
		//		functions to help identify them for the internal machinery. Be
		//		very careful, while reusing methods: if you use the same
		//		function under different names, it can produce errors in some
		//		cases.
		//
		//		It is possible to use constructors created "manually" (without
		//		declare()) as bases. They will be called as usual during the
		//		creation of an instance, their methods will be chained, and even
		//		called by "this.inherited()".
		//
		//		Special property "-chains-" governs how to chain methods. It is
		//		a dictionary, which uses method names as keys, and hint strings
		//		as values. If a hint string is "after", this method will be
		//		called after methods of its base classes. If a hint string is
		//		"before", this method will be called before methods of its base
		//		classes.
		//
		//		If "constructor" is not mentioned in "-chains-" property, it will
		//		be chained using the legacy mode: using "after" chaining,
		//		calling preamble() method before each constructor, if available,
		//		and calling postscript() after all constructors were executed.
		//		If the hint is "after", it is chained as a regular method, but
		//		postscript() will be called after the chain of constructors.
		//		"constructor" cannot be chained "before", but it allows
		//		a special hint string: "manual", which means that constructors
		//		are not going to be chained in any way, and programmer will call
		//		them manually using this.inherited(). In the latter case
		//		postscript() will be called after the construction.
		//
		//		All chaining hints are "inherited" from base classes and
		//		potentially can be overridden. Be very careful when overriding
		//		hints! Make sure that all chained methods can work in a proposed
		//		manner of chaining.
		//
		//		Once a method was chained, it is impossible to unchain it. The
		//		only exception is "constructor". You don't need to define a
		//		method in order to supply a chaining hint.
		//
		//		If a method is chained, it cannot use this.inherited() because
		//		all other methods in the hierarchy will be called automatically.
		//
		//		Usually constructors and initializers of any kind are chained
		//		using "after" and destructors of any kind are chained as
		//		"before". Note that chaining assumes that chained methods do not
		//		return any value: any returned value will be discarded.
		//
		// example:
		//	|	declare("my.classes.bar", my.classes.foo, {
		//	|		// properties to be added to the class prototype
		//	|		someValue: 2,
		//	|		// initialization function
		//	|		constructor: function(){
		//	|			this.myComplicatedObject = new ReallyComplicatedObject();
		//	|		},
		//	|		// other functions
		//	|		someMethod: function(){
		//	|			doStuff();
		//	|		}
		//	|	});
		//
		// example:
		//	|	var MyBase = declare(null, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass1 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyClass2 = declare(MyBase, {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//	|	var MyDiamond = declare([MyClass1, MyClass2], {
		//	|		// constructor, properties, and methods go here
		//	|		// ...
		//	|	});
		//
		// example:
		//	|	var F = function(){ console.log("raw constructor"); };
		//	|	F.prototype.method = function(){
		//	|		console.log("raw method");
		//	|	};
		//	|	var A = declare(F, {
		//	|		constructor: function(){
		//	|			console.log("A.constructor");
		//	|		},
		//	|		method: function(){
		//	|			console.log("before calling F.method...");
		//	|			this.inherited(arguments);
		//	|			console.log("...back in A");
		//	|		}
		//	|	});
		//	|	new A().method();
		//	|	// will print:
		//	|	// raw constructor
		//	|	// A.constructor
		//	|	// before calling F.method...
		//	|	// raw method
		//	|	// ...back in A
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			destroy: "before"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			console.log("B.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("B.destroy");
		//	|		}
		//	|	});
		//	|	var C = declare(B, {
		//	|		constructor: function(){
		//	|			console.log("C.constructor");
		//	|		},
		//	|		destroy: function(){
		//	|			console.log("C.destroy");
		//	|		}
		//	|	});
		//	|	new C().destroy();
		//	|	// prints:
		//	|	// B.constructor
		//	|	// C.constructor
		//	|	// C.destroy
		//	|	// B.destroy
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			constructor: "manual"
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		constructor: function(){
		//	|			// ...
		//	|			// call the base constructor with new parameters
		//	|			this.inherited(arguments, [1, 2, 3]);
		//	|			// ...
		//	|		}
		//	|	});
		//
		// example:
		//	|	var A = declare(null, {
		//	|		"-chains-": {
		//	|			m1: "before"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("A.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("A.m2");
		//	|		}
		//	|	});
		//	|	var B = declare(A, {
		//	|		"-chains-": {
		//	|			m2: "after"
		//	|		},
		//	|		m1: function(){
		//	|			console.log("B.m1");
		//	|		},
		//	|		m2: function(){
		//	|			console.log("B.m2");
		//	|		}
		//	|	});
		//	|	var x = new B();
		//	|	x.m1();
		//	|	// prints:
		//	|	// B.m1
		//	|	// A.m1
		//	|	x.m2();
		//	|	// prints:
		//	|	// A.m2
		//	|	// B.m2

		// crack parameters
		if(typeof className != "string"){
			props = superclass;
			superclass = className;
			className = "";
		}
		props = props || {};

		var proto, i, t, ctor, name, bases, chains, mixins = 1, parents = superclass;

		// build a prototype
		if(opts.call(superclass) == "[object Array]"){
			// C3 MRO
			bases = c3mro(superclass, className);
			t = bases[0];
			mixins = bases.length - t;
			superclass = bases[mixins];
		}else{
			bases = [0];
			if(superclass){
				if(opts.call(superclass) == "[object Function]"){
					t = superclass._meta;
					bases = bases.concat(t ? t.bases : superclass);
				}else{
					err("base class is not a callable constructor.", className);
				}
			}else if(superclass !== null){
				err("unknown base class. Did you use dojo.require to pull it in?", className);
			}
		}
		if(superclass){
			for(i = mixins - 1;; --i){
				proto = forceNew(superclass);
				if(!i){
					// stop if nothing to add (the last base)
					break;
				}
				// mix in properties
				t = bases[i];
				(t._meta ? mixOwn : mix)(proto, t.prototype);
				// chain in new constructor
				ctor = new Function;
				ctor.superclass = superclass;
				ctor.prototype = proto;
				superclass = proto.constructor = ctor;
			}
		}else{
			proto = {};
		}
		// add all properties
		declare.safeMixin(proto, props);
		// add constructor
		t = props.constructor;
		if(t !== op.constructor){
			t.nom = cname;
			proto.constructor = t;
		}

		// collect chains and flags
		for(i = mixins - 1; i; --i){ // intentional assignment
			t = bases[i]._meta;
			if(t && t.chains){
				chains = mix(chains || {}, t.chains);
			}
		}
		if(proto["-chains-"]){
			chains = mix(chains || {}, proto["-chains-"]);
		}

		// build ctor
		t = !chains || !chains.hasOwnProperty(cname);
		bases[0] = ctor = (chains && chains.constructor === "manual") ? simpleConstructor(bases) :
			(bases.length == 1 ? singleConstructor(props.constructor, t) : chainedConstructor(bases, t));

		// add meta information to the constructor
		ctor._meta  = {bases: bases, hidden: props, chains: chains,
			parents: parents, ctor: props.constructor};
		ctor.superclass = superclass && superclass.prototype;
		ctor.extend = extend;
		ctor.createSubclass = createSubclass;
		ctor.prototype = proto;
		proto.constructor = ctor;

		// add "standard" methods to the prototype
		proto.getInherited = getInherited;
		proto.isInstanceOf = isInstanceOf;
		proto.inherited    = inheritedImpl;
		proto.__inherited  = inherited;

		// add name if specified
		if(className){
			proto.declaredClass = className;
			lang.setObject(className, ctor);
		}

		// build chains and add them to the prototype
		if(chains){
			for(name in chains){
				if(proto[name] && typeof chains[name] == "string" && name != cname){
					t = proto[name] = chain(name, bases, chains[name] === "after");
					t.nom = name;
				}
			}
		}
		// chained methods do not return values
		// no need to chain "invisible" functions

		return ctor;	// Function
	}

	/*=====
	declare.__DeclareCreatedObject = {
		// summary:
		//		dojo/_base/declare() returns a constructor `C`.   `new C()` returns an Object with the following
		//		methods, in addition to the methods and properties specified via the arguments passed to declare().

		inherited: function(name, args, newArgs){
			// summary:
			//		Calls a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// newArgs: Object?
			//		If "true", the found function will be returned without
			//		executing it.
			//		If Array, it will be used to call a super method. Otherwise
			//		"args" will be used.
			// returns:
			//		Whatever is returned by a super method, or a super method itself,
			//		if "true" was specified as newArgs.
			// description:
			//		This method is used inside method of classes produced with
			//		declare() to call a super method (next in the chain). It is
			//		used for manually controlled chaining. Consider using the regular
			//		chaining, because it is faster. Use "this.inherited()" only in
			//		complex cases.
			//
			//		This method cannot me called from automatically chained
			//		constructors including the case of a special (legacy)
			//		constructor chaining. It cannot be called from chained methods.
			//
			//		If "this.inherited()" cannot find the next-in-chain method, it
			//		does nothing and returns "undefined". The last method in chain
			//		can be a default method implemented in Object, which will be
			//		called last.
			//
			//		If "name" is specified, it is assumed that the method that
			//		received "args" is the parent method for this call. It is looked
			//		up in the chain list and if it is found the next-in-chain method
			//		is called. If it is not found, the first-in-chain method is
			//		called.
			//
			//		If "name" is not specified, it will be derived from the calling
			//		method (using a methoid property "nom").
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method1: function(a, b, c){
			//	|			this.inherited(arguments);
			//	|		},
			//	|		method2: function(a, b){
			//	|			return this.inherited(arguments, [a + b]);
			//	|		}
			//	|	});
			//	|	// next method is not in the chain list because it is added
			//	|	// manually after the class was created.
			//	|	B.prototype.method3 = function(){
			//	|		console.log("This is a dynamically-added method.");
			//	|		this.inherited("method3", arguments);
			//	|	};
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.inherited(arguments, true);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		getInherited: function(name, args){
			// summary:
			//		Returns a super method.
			// name: String?
			//		The optional method name. Should be the same as the caller's
			//		name. Usually "name" is specified in complex dynamic cases, when
			//		the calling method was dynamically added, undecorated by
			//		declare(), and it cannot be determined.
			// args: Arguments
			//		The caller supply this argument, which should be the original
			//		"arguments".
			// returns:
			//		Returns a super method (Function) or "undefined".
			// description:
			//		This method is a convenience method for "this.inherited()".
			//		It uses the same algorithm but instead of executing a super
			//		method, it returns it, or "undefined" if not found.
			//
			// example:
			//	|	var B = declare(A, {
			//	|		method: function(a, b){
			//	|			var super = this.getInherited(arguments);
			//	|			// ...
			//	|			if(!super){
			//	|				console.log("there is no super method");
			//	|				return 0;
			//	|			}
			//	|			return super.apply(this, arguments);
			//	|		}
			//	|	});
			return	{};	// Object
		},

		isInstanceOf: function(cls){
			// summary:
			//		Checks the inheritance chain to see if it is inherited from this
			//		class.
			// cls: Function
			//		Class constructor.
			// returns:
			//		"true", if this object is inherited from this class, "false"
			//		otherwise.
			// description:
			//		This method is used with instances of classes produced with
			//		declare() to determine of they support a certain interface or
			//		not. It models "instanceof" operator.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var B = declare(null, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var C = declare([A, B], {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|	var D = declare(A, {
			//	|		// constructor, properties, and methods go here
			//	|		// ...
			//	|	});
			//	|
			//	|	var a = new A(), b = new B(), c = new C(), d = new D();
			//	|
			//	|	console.log(a.isInstanceOf(A)); // true
			//	|	console.log(b.isInstanceOf(A)); // false
			//	|	console.log(c.isInstanceOf(A)); // true
			//	|	console.log(d.isInstanceOf(A)); // true
			//	|
			//	|	console.log(a.isInstanceOf(B)); // false
			//	|	console.log(b.isInstanceOf(B)); // true
			//	|	console.log(c.isInstanceOf(B)); // true
			//	|	console.log(d.isInstanceOf(B)); // false
			//	|
			//	|	console.log(a.isInstanceOf(C)); // false
			//	|	console.log(b.isInstanceOf(C)); // false
			//	|	console.log(c.isInstanceOf(C)); // true
			//	|	console.log(d.isInstanceOf(C)); // false
			//	|
			//	|	console.log(a.isInstanceOf(D)); // false
			//	|	console.log(b.isInstanceOf(D)); // false
			//	|	console.log(c.isInstanceOf(D)); // false
			//	|	console.log(d.isInstanceOf(D)); // true
			return	{};	// Object
		},

		extend: function(source){
			// summary:
			//		Adds all properties and methods of source to constructor's
			//		prototype, making them available to all instances created with
			//		constructor. This method is specific to constructors created with
			//		declare().
			// source: Object
			//		Source object which properties are going to be copied to the
			//		constructor's prototype.
			// description:
			//		Adds source properties to the constructor's prototype. It can
			//		override existing properties.
			//
			//		This method is similar to dojo.extend function, but it is specific
			//		to constructors produced by declare(). It is implemented
			//		using dojo.safeMixin, and it skips a constructor property,
			//		and properly decorates copied functions.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "Popokatepetl"
			//	|	});
			//	|	A.extend({
			//	|		m1: function(){},
			//	|		m2: function(){},
			//	|		f1: true,
			//	|		d1: 42
			//	|	});
		},

		createSubclass: function(mixins, props){
			// summary:
			//		Create a subclass of the declared class from a list of base classes.
			// mixins: Function[]
			//		Specifies a list of bases (the left-most one is the most deepest
			//		base).
			// props: Object?
			//		An optional object whose properties are copied to the created prototype.
			// returns: dojo/_base/declare.__DeclareCreatedObject
			//		New constructor function.
			// description:
			//		Create a constructor using a compact notation for inheritance and
			//		prototype extension.
			//
			//		Mixin ancestors provide a type of multiple inheritance.
			//		Prototypes of mixin ancestors are copied to the new class:
			//		changes to mixin prototypes will not affect classes to which
			//		they have been mixed in.
			//
			// example:
			//	|	var A = declare(null, {
			//	|		m1: function(){},
			//	|		s1: "bar"
			//	|	});
			//	|	var B = declare(null, {
			//	|		m2: function(){},
			//	|		s2: "foo"
			//	|	});
			//	|	var C = declare(null, {
			//	|	});
			//	|	var D1 = A.createSubclass([B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d1 = new D1();
			//	|
			//	|	// this is equivalent to:
			//	|	var D2 = declare([A, B, C], {
			//	|		m1: function(){},
			//	|		d1: 42
			//	|	});
			//	|	var d2 = new D2();
		}
	};
	=====*/

	// For back-compat, remove for 2.0
	dojo.safeMixin = declare.safeMixin = safeMixin;
	dojo.declare = declare;

	return declare;
});

},
'dojo/dom-construct':function(){
define(["exports", "./_base/kernel", "./sniff", "./_base/window", "./dom", "./dom-attr"],
		function(exports, dojo, has, win, dom, attr){
	// module:
	//		dojo/dom-construct
	// summary:
	//		This module defines the core dojo DOM construction API.

	// TODOC: summary not showing up in output, see https://github.com/csnover/js-doc-parse/issues/42

	// support stuff for toDom()
	var tagWrap = {
			option: ["select"],
			tbody: ["table"],
			thead: ["table"],
			tfoot: ["table"],
			tr: ["table", "tbody"],
			td: ["table", "tbody", "tr"],
			th: ["table", "thead", "tr"],
			legend: ["fieldset"],
			caption: ["table"],
			colgroup: ["table"],
			col: ["table", "colgroup"],
			li: ["ul"]
		},
		reTag = /<\s*([\w\:]+)/,
		masterNode = {}, masterNum = 0,
		masterName = "__" + dojo._scopeName + "ToDomId";

	// generate start/end tag strings to use
	// for the injection for each special tag wrap case.
	for(var param in tagWrap){
		if(tagWrap.hasOwnProperty(param)){
			var tw = tagWrap[param];
			tw.pre = param == "option" ? '<select multiple="multiple">' : "<" + tw.join("><") + ">";
			tw.post = "</" + tw.reverse().join("></") + ">";
			// the last line is destructive: it reverses the array,
			// but we don't care at this point
		}
	}

	var html5domfix;
	if(has("ie") <= 8){
		html5domfix = function(doc){
			doc.__dojo_html5_tested = "yes";
			var div = create('div', {innerHTML: "<nav>a</nav>", style: {visibility: "hidden"}}, doc.body);
			if(div.childNodes.length !== 1){
				('abbr article aside audio canvas details figcaption figure footer header ' +
				'hgroup mark meter nav output progress section summary time video').replace(
					/\b\w+\b/g, function(n){
						doc.createElement(n);
					}
				);
			}
			destroy(div);
		}
	}

	function _insertBefore(/*DomNode*/ node, /*DomNode*/ ref){
		var parent = ref.parentNode;
		if(parent){
			parent.insertBefore(node, ref);
		}
	}

	function _insertAfter(/*DomNode*/ node, /*DomNode*/ ref){
		// summary:
		//		Try to insert node after ref
		var parent = ref.parentNode;
		if(parent){
			if(parent.lastChild == ref){
				parent.appendChild(node);
			}else{
				parent.insertBefore(node, ref.nextSibling);
			}
		}
	}

	exports.toDom = function toDom(frag, doc){
		// summary:
		//		instantiates an HTML fragment returning the corresponding DOM.
		// frag: String
		//		the HTML fragment
		// doc: DocumentNode?
		//		optional document to use when creating DOM nodes, defaults to
		//		dojo/_base/window.doc if not specified.
		// returns:
		//		Document fragment, unless it's a single node in which case it returns the node itself
		// example:
		//		Create a table row:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var tr = domConstruct.toDom("<tr><td>First!</td></tr>");
		//	|	});

		doc = doc || win.doc;
		var masterId = doc[masterName];
		if(!masterId){
			doc[masterName] = masterId = ++masterNum + "";
			masterNode[masterId] = doc.createElement("div");
		}

		if(has("ie") <= 8){
			if(!doc.__dojo_html5_tested && doc.body){
				html5domfix(doc);
			}
		}

		// make sure the frag is a string.
		frag += "";

		// find the starting tag, and get node wrapper
		var match = frag.match(reTag),
			tag = match ? match[1].toLowerCase() : "",
			master = masterNode[masterId],
			wrap, i, fc, df;
		if(match && tagWrap[tag]){
			wrap = tagWrap[tag];
			master.innerHTML = wrap.pre + frag + wrap.post;
			for(i = wrap.length; i; --i){
				master = master.firstChild;
			}
		}else{
			master.innerHTML = frag;
		}

		// one node shortcut => return the node itself
		if(master.childNodes.length == 1){
			return master.removeChild(master.firstChild); // DOMNode
		}

		// return multiple nodes as a document fragment
		df = doc.createDocumentFragment();
		while((fc = master.firstChild)){ // intentional assignment
			df.appendChild(fc);
		}
		return df; // DocumentFragment
	};

	exports.place = function place(node, refNode, position){
		// summary:
		//		Attempt to insert node into the DOM, choosing from various positioning options.
		//		Returns the first argument resolved to a DOM node.
		// node: DOMNode|DocumentFragment|String
		//		id or node reference, or HTML fragment starting with "<" to place relative to refNode
		// refNode: DOMNode|String
		//		id or node reference to use as basis for placement
		// position: String|Number?
		//		string noting the position of node relative to refNode or a
		//		number indicating the location in the childNodes collection of refNode.
		//		Accepted string values are:
		//
		//		- before
		//		- after
		//		- replace
		//		- only
		//		- first
		//		- last
		//
		//		"first" and "last" indicate positions as children of refNode, "replace" replaces refNode,
		//		"only" replaces all children.  position defaults to "last" if not specified
		// returns: DOMNode
		//		Returned values is the first argument resolved to a DOM node.
		//
		//		.place() is also a method of `dojo/NodeList`, allowing `dojo/query` node lookups.
		// example:
		//		Place a node by string id as the last child of another node by string id:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("someNode", "anotherNode");
		//	|	});
		// example:
		//		Place a node by string id before another node by string id
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("someNode", "anotherNode", "before");
		//	|	});
		// example:
		//		Create a Node, and place it in the body element (last child):
		//	|	require(["dojo/dom-construct", "dojo/_base/window"
		//	|	], function(domConstruct, win){
		//	|		domConstruct.place("<div></div>", win.body());
		//	|	});
		// example:
		//		Put a new LI as the first child of a list by id:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.place("<li></li>", "someUl", "first");
		//	|	});

		refNode = dom.byId(refNode);
		if(typeof node == "string"){ // inline'd type check
			node = /^\s*</.test(node) ? exports.toDom(node, refNode.ownerDocument) : dom.byId(node);
		}
		if(typeof position == "number"){ // inline'd type check
			var cn = refNode.childNodes;
			if(!cn.length || cn.length <= position){
				refNode.appendChild(node);
			}else{
				_insertBefore(node, cn[position < 0 ? 0 : position]);
			}
		}else{
			switch(position){
				case "before":
					_insertBefore(node, refNode);
					break;
				case "after":
					_insertAfter(node, refNode);
					break;
				case "replace":
					refNode.parentNode.replaceChild(node, refNode);
					break;
				case "only":
					exports.empty(refNode);
					refNode.appendChild(node);
					break;
				case "first":
					if(refNode.firstChild){
						_insertBefore(node, refNode.firstChild);
						break;
					}
					// else fallthrough...
				default: // aka: last
					refNode.appendChild(node);
			}
		}
		return node; // DomNode
	};

	var create = exports.create = function create(/*DOMNode|String*/ tag, /*Object*/ attrs, /*DOMNode|String?*/ refNode, /*String?*/ pos){
		// summary:
		//		Create an element, allowing for optional attribute decoration
		//		and placement.
		// description:
		//		A DOM Element creation function. A shorthand method for creating a node or
		//		a fragment, and allowing for a convenient optional attribute setting step,
		//		as well as an optional DOM placement reference.
		//
		//		Attributes are set by passing the optional object through `dojo.setAttr`.
		//		See `dojo.setAttr` for noted caveats and nuances, and API if applicable.
		//
		//		Placement is done via `dojo.place`, assuming the new node to be the action
		//		node, passing along the optional reference node and position.
		// tag: DOMNode|String
		//		A string of the element to create (eg: "div", "a", "p", "li", "script", "br"),
		//		or an existing DOM node to process.
		// attrs: Object
		//		An object-hash of attributes to set on the newly created node.
		//		Can be null, if you don't want to set any attributes/styles.
		//		See: `dojo.setAttr` for a description of available attributes.
		// refNode: DOMNode|String?
		//		Optional reference node. Used by `dojo.place` to place the newly created
		//		node somewhere in the dom relative to refNode. Can be a DomNode reference
		//		or String ID of a node.
		// pos: String?
		//		Optional positional reference. Defaults to "last" by way of `dojo.place`,
		//		though can be set to "first","after","before","last", "replace" or "only"
		//		to further control the placement of the new node relative to the refNode.
		//		'refNode' is required if a 'pos' is specified.
		// example:
		//		Create a DIV:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var n = domConstruct.create("div");
		//	|	});
		//
		// example:
		//		Create a DIV with content:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var n = domConstruct.create("div", { innerHTML:"<p>hi</p>" });
		//	|	});
		//
		// example:
		//		Place a new DIV in the BODY, with no attributes set
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		var n = domConstruct.create("div", null, dojo.body());
		//	|	});
		//
		// example:
		//		Create an UL, and populate it with LI's. Place the list as the first-child of a
		//		node with id="someId":
		//	|	require(["dojo/dom-construct", "dojo/_base/array"],
		//	|	function(domConstruct, arrayUtil){
		//	|		var ul = domConstruct.create("ul", null, "someId", "first");
		//	|		var items = ["one", "two", "three", "four"];
		//	|		arrayUtil.forEach(items, function(data){
		//	|			domConstruct.create("li", { innerHTML: data }, ul);
		//	|		});
		//	|	});
		//
		// example:
		//		Create an anchor, with an href. Place in BODY:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.create("a", { href:"foo.html", title:"Goto FOO!" }, dojo.body());
		//	|	});

		var doc = win.doc;
		if(refNode){
			refNode = dom.byId(refNode);
			doc = refNode.ownerDocument;
		}
		if(typeof tag == "string"){ // inline'd type check
			tag = doc.createElement(tag);
		}
		if(attrs){ attr.set(tag, attrs); }
		if(refNode){ exports.place(tag, refNode, pos); }
		return tag; // DomNode
	};

	function _empty(/*DomNode*/ node){
		// TODO: remove this if() block in 2.0 when we no longer have to worry about IE memory leaks,
		// and then uncomment the emptyGrandchildren() test case from html.html.
		// Note that besides fixing #16957, using removeChild() is actually faster than setting node.innerHTML,
		// see http://jsperf.com/clear-dom-node.
		if("innerHTML" in node){
			try{
				// fast path
				node.innerHTML = "";
				return;
			}catch(e){
				// innerHTML is readOnly (e.g. TABLE (sub)elements in quirks mode)
				// Fall through (saves bytes)
			}
		}

		// SVG/strict elements don't support innerHTML
		for(var c; c = node.lastChild;){ // intentional assignment
			node.removeChild(c);
		}
	}

	exports.empty = function empty(/*DOMNode|String*/ node){
		// summary:
		//		safely removes all children of the node.
		// node: DOMNode|String
		//		a reference to a DOM node or an id.
		// example:
		//		Destroy node's children byId:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.empty("someId");
		//	|	});

		_empty(dom.byId(node));
	};


	function _destroy(/*DomNode*/ node, /*DomNode*/ parent){
		// in IE quirks, node.canHaveChildren can be false but firstChild can be non-null (OBJECT/APPLET)
		if(node.firstChild){
			_empty(node);
		}
		if(parent){
			// removeNode(false) doesn't leak in IE 6+, but removeChild() and removeNode(true) are known to leak under IE 8- while 9+ is TBD.
			// In IE quirks mode, PARAM nodes as children of OBJECT/APPLET nodes have a removeNode method that does nothing and
			// the parent node has canHaveChildren=false even though removeChild correctly removes the PARAM children.
			// In IE, SVG/strict nodes don't have a removeNode method nor a canHaveChildren boolean.
			has("ie") && parent.canHaveChildren && "removeNode" in node ? node.removeNode(false) : parent.removeChild(node);
		}
	}
	var destroy = exports.destroy = function destroy(/*DOMNode|String*/ node){
		// summary:
		//		Removes a node from its parent, clobbering it and all of its
		//		children.
		//
		// description:
		//		Removes a node from its parent, clobbering it and all of its
		//		children. Function only works with DomNodes, and returns nothing.
		//
		// node: DOMNode|String
		//		A String ID or DomNode reference of the element to be destroyed
		//
		// example:
		//		Destroy a node byId:
		//	|	require(["dojo/dom-construct"], function(domConstruct){
		//	|		domConstruct.destroy("someId");
		//	|	});

		node = dom.byId(node);
		if(!node){ return; }
		_destroy(node, node.parentNode);
	};
});

},
'dojo/dom-attr':function(){
define(["exports", "./sniff", "./_base/lang", "./dom", "./dom-style", "./dom-prop"],
		function(exports, has, lang, dom, style, prop){
	// module:
	//		dojo/dom-attr
	// summary:
	//		This module defines the core dojo DOM attributes API.

	// TODOC: summary not showing up in output see https://github.com/csnover/js-doc-parse/issues/42

	// =============================
	// Element attribute Functions
	// =============================

	// This module will be obsolete soon. Use dojo/prop instead.

	// dojo/dom-attr.get() should conform to http://www.w3.org/TR/DOM-Level-2-Core/

	// attribute-related functions (to be obsolete soon)
	var forcePropNames = {
			innerHTML:	1,
			textContent:1,
			className:	1,
			htmlFor:	has("ie"),
			value:		1
		},
		attrNames = {
			// original attribute names
			classname: "class",
			htmlfor: "for",
			// for IE
			tabindex: "tabIndex",
			readonly: "readOnly"
		};

	function _hasAttr(node, name){
		var attr = node.getAttributeNode && node.getAttributeNode(name);
		return attr && attr.specified; // Boolean
	}
	
	// There is a difference in the presence of certain properties and their default values
	// between browsers. For example, on IE "disabled" is present on all elements,
	// but it is value is "false"; "tabIndex" of <div> returns 0 by default on IE, yet other browsers
	// can return -1.

	exports.has = function hasAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Returns true if the requested attribute is specified on the
		//		given element, and false otherwise.
		// node: DOMNode|String
		//		id or reference to the element to check
		// name: String
		//		the name of the attribute
		// returns: Boolean
		//		true if the requested attribute is specified on the
		//		given element, and false otherwise

		var lc = name.toLowerCase();
		return forcePropNames[prop.names[lc] || name] || _hasAttr(dom.byId(node), attrNames[lc] || name);	// Boolean
	};

	exports.get = function getAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Gets an attribute on an HTML element.
		// description:
		//		Handles normalized getting of attributes on DOM Nodes.
		// node: DOMNode|String
		//		id or reference to the element to get the attribute on
		// name: String
		//		the name of the attribute to get.
		// returns:
		//		the value of the requested attribute or null if that attribute does not have a specified or
		//		default value;
		//
		// example:
		//	|	// get the current value of the "foo" attribute on a node
		//	|	require(["dojo/dom-attr", "dojo/dom"], function(domAttr, dom){
		//	|		domAttr.get(dom.byId("nodeId"), "foo");
		//	|		// or we can just pass the id:
		//	|		domAttr.get("nodeId", "foo");
		//	|	});	
		//	|	

		node = dom.byId(node);
		var lc = name.toLowerCase(),
			propName = prop.names[lc] || name,
			forceProp = forcePropNames[propName],
			value = node[propName];		// should we access this attribute via a property or via getAttribute()?

		if(forceProp && typeof value != "undefined"){
			// node's property
			return value;	// Anything
		}
		
		if(propName == "textContent"){
			return prop.get(node, propName);
		}
		
		if(propName != "href" && (typeof value == "boolean" || lang.isFunction(value))){
			// node's property
			return value;	// Anything
		}
		// node's attribute
		// we need _hasAttr() here to guard against IE returning a default value
		var attrName = attrNames[lc] || name;
		return _hasAttr(node, attrName) ? node.getAttribute(attrName) : null; // Anything
	};

	exports.set = function setAttr(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets an attribute on an HTML element.
		// description:
		//		Handles normalized setting of attributes on DOM Nodes.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node: DOMNode|String
		//		id or reference to the element to set the attribute on
		// name: String|Object
		//		the name of the attribute to set, or a hash of key-value pairs to set.
		// value: String?
		//		the value to set for the attribute, if the name is a string.
		// returns:
		//		the DOM node
		//
		// example:
		//	|	// use attr() to set the tab index
		//	|	require(["dojo/dom-attr"], function(domAttr){
		//	|		domAttr.set("nodeId", "tabIndex", 3);
		//	|	});
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	require(["dojo/dom-attr"],
		//	|	function(domAttr){
		//	|		domAttr.set("formId", {
		//	|			"foo": "bar",
		//	|			"tabIndex": -1,
		//	|			"method": "POST"
		//	|		}
		//	|	});

		node = dom.byId(node);
		if(arguments.length == 2){ // inline'd type check
			// the object form of setter: the 2nd argument is a dictionary
			for(var x in name){
				exports.set(node, x, name[x]);
			}
			return node; // DomNode
		}
		var lc = name.toLowerCase(),
			propName = prop.names[lc] || name,
			forceProp = forcePropNames[propName];
		if(propName == "style" && typeof value != "string"){ // inline'd type check
			// special case: setting a style
			style.set(node, value);
			return node; // DomNode
		}
		if(forceProp || typeof value == "boolean" || lang.isFunction(value)){
			return prop.set(node, name, value);
		}
		// node's attribute
		node.setAttribute(attrNames[lc] || name, value);
		return node; // DomNode
	};

	exports.remove = function removeAttr(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Removes an attribute from an HTML element.
		// node: DOMNode|String
		//		id or reference to the element to remove the attribute from
		// name: String
		//		the name of the attribute to remove

		dom.byId(node).removeAttribute(attrNames[name.toLowerCase()] || name);
	};

	exports.getNodeProp = function getNodeProp(/*DomNode|String*/ node, /*String*/ name){
		// summary:
		//		Returns an effective value of a property or an attribute.
		// node: DOMNode|String
		//		id or reference to the element to remove the attribute from
		// name: String
		//		the name of the attribute
		// returns:
		//		the value of the attribute

		node = dom.byId(node);
		var lc = name.toLowerCase(), propName = prop.names[lc] || name;
		if((propName in node) && propName != "href"){
			// node's property
			return node[propName];	// Anything
		}
		// node's attribute
		var attrName = attrNames[lc] || name;
		return _hasAttr(node, attrName) ? node.getAttribute(attrName) : null; // Anything
	};
});

},
'dojo/dom-style':function(){
define(["./sniff", "./dom"], function(has, dom){
	// module:
	//		dojo/dom-style

	// =============================
	// Style Functions
	// =============================

	// getComputedStyle drives most of the style code.
	// Wherever possible, reuse the returned object.
	//
	// API functions below that need to access computed styles accept an
	// optional computedStyle parameter.
	// If this parameter is omitted, the functions will call getComputedStyle themselves.
	// This way, calling code can access computedStyle once, and then pass the reference to
	// multiple API functions.

	// Although we normally eschew argument validation at this
	// level, here we test argument 'node' for (duck)type,
	// by testing nodeType, ecause 'document' is the 'parentNode' of 'body'
	// it is frequently sent to this function even
	// though it is not Element.
	var getComputedStyle, style = {
		// summary:
		//		This module defines the core dojo DOM style API.
	};
	if(has("webkit")){
		getComputedStyle = function(/*DomNode*/ node){
			var s;
			if(node.nodeType == 1){
				var dv = node.ownerDocument.defaultView;
				s = dv.getComputedStyle(node, null);
				if(!s && node.style){
					node.style.display = "";
					s = dv.getComputedStyle(node, null);
				}
			}
			return s || {};
		};
	}else if(has("ie") && (has("ie") < 9 || has("quirks"))){
		getComputedStyle = function(node){
			// IE (as of 7) doesn't expose Element like sane browsers
			// currentStyle can be null on IE8!
			return node.nodeType == 1 /* ELEMENT_NODE*/ && node.currentStyle ? node.currentStyle : {};
		};
	}else{
		getComputedStyle = function(node){
			return node.nodeType == 1 /* ELEMENT_NODE*/ ?
				node.ownerDocument.defaultView.getComputedStyle(node, null) : {};
		};
	}
	style.getComputedStyle = getComputedStyle;
	/*=====
	style.getComputedStyle = function(node){
		// summary:
		//		Returns a "computed style" object.
		//
		// description:
		//		Gets a "computed style" object which can be used to gather
		//		information about the current state of the rendered node.
		//
		//		Note that this may behave differently on different browsers.
		//		Values may have different formats and value encodings across
		//		browsers.
		//
		//		Note also that this method is expensive.  Wherever possible,
		//		reuse the returned object.
		//
		//		Use the dojo/dom-style.get() method for more consistent (pixelized)
		//		return values.
		//
		// node: DOMNode
		//		A reference to a DOM node. Does NOT support taking an
		//		ID string for speed reasons.
		// example:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.getComputedStyle(dom.byId('foo')).borderWidth;
		//	|	});
		//
		// example:
		//		Reusing the returned object, avoiding multiple lookups:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		var cs = domStyle.getComputedStyle(dom.byId("someNode"));
		//	|		var w = cs.width, h = cs.height;
		//	|	});
		return; // CSS2Properties
	};
	=====*/

	var toPixel;
	if(!has("ie")){
		toPixel = function(element, value){
			// style values can be floats, client code may want
			// to round for integer pixels.
			return parseFloat(value) || 0;
		};
	}else{
		toPixel = function(element, avalue){
			if(!avalue){ return 0; }
			// on IE7, medium is usually 4 pixels
			if(avalue == "medium"){ return 4; }
			// style values can be floats, client code may
			// want to round this value for integer pixels.
			if(avalue.slice && avalue.slice(-2) == 'px'){ return parseFloat(avalue); }
			var s = element.style, rs = element.runtimeStyle, cs = element.currentStyle,
				sLeft = s.left, rsLeft = rs.left;
			rs.left = cs.left;
			try{
				// 'avalue' may be incompatible with style.left, which can cause IE to throw
				// this has been observed for border widths using "thin", "medium", "thick" constants
				// those particular constants could be trapped by a lookup
				// but perhaps there are more
				s.left = avalue;
				avalue = s.pixelLeft;
			}catch(e){
				avalue = 0;
			}
			s.left = sLeft;
			rs.left = rsLeft;
			return avalue;
		};
	}
	style.toPixelValue = toPixel;
	/*=====
	style.toPixelValue = function(node, value){
		// summary:
		//		converts style value to pixels on IE or return a numeric value.
		// node: DOMNode
		// value: String
		// returns: Number
	};
	=====*/

	// FIXME: there opacity quirks on FF that we haven't ported over. Hrm.

	var astr = "DXImageTransform.Microsoft.Alpha";
	var af = function(n, f){
		try{
			return n.filters.item(astr);
		}catch(e){
			return f ? {} : null;
		}
	};

	var _getOpacity =
		has("ie") < 9 || (has("ie") < 10 && has("quirks")) ? function(node){
			try{
				return af(node).Opacity / 100; // Number
			}catch(e){
				return 1; // Number
			}
		} :
		function(node){
			return getComputedStyle(node).opacity;
		};

	var _setOpacity =
		has("ie") < 9 || (has("ie") < 10 && has("quirks")) ? function(/*DomNode*/ node, /*Number*/ opacity){
			if(opacity === ""){ opacity = 1; }
			var ov = opacity * 100, fullyOpaque = opacity === 1;

			// on IE7 Alpha(Filter opacity=100) makes text look fuzzy so disable it altogether (bug #2661),
			// but still update the opacity value so we can get a correct reading if it is read later:
			// af(node, 1).Enabled = !fullyOpaque;

			if(fullyOpaque){
				node.style.zoom = "";
				if(af(node)){
					node.style.filter = node.style.filter.replace(
						new RegExp("\\s*progid:" + astr + "\\([^\\)]+?\\)", "i"), "");
				}
			}else{
				node.style.zoom = 1;
				if(af(node)){
					af(node, 1).Opacity = ov;
				}else{
					node.style.filter += " progid:" + astr + "(Opacity=" + ov + ")";
				}
				af(node, 1).Enabled = true;
			}

			if(node.tagName.toLowerCase() == "tr"){
				for(var td = node.firstChild; td; td = td.nextSibling){
					if(td.tagName.toLowerCase() == "td"){
						_setOpacity(td, opacity);
					}
				}
			}
			return opacity;
		} :
		function(node, opacity){
			return node.style.opacity = opacity;
		};

	var _pixelNamesCache = {
		left: true, top: true
	};
	var _pixelRegExp = /margin|padding|width|height|max|min|offset/; // |border
	function _toStyleValue(node, type, value){
		//TODO: should we really be doing string case conversion here? Should we cache it? Need to profile!
		type = type.toLowerCase();
		if(has("ie") || has("trident")){
			if(value == "auto"){
				if(type == "height"){ return node.offsetHeight; }
				if(type == "width"){ return node.offsetWidth; }
			}
			if(type == "fontweight"){
				switch(value){
					case 700: return "bold";
					case 400:
					default: return "normal";
				}
			}
		}
		if(!(type in _pixelNamesCache)){
			_pixelNamesCache[type] = _pixelRegExp.test(type);
		}
		return _pixelNamesCache[type] ? toPixel(node, value) : value;
	}

	var _floatAliases = {cssFloat: 1, styleFloat: 1, "float": 1};

	// public API

	style.get = function getStyle(/*DOMNode|String*/ node, /*String?*/ name){
		// summary:
		//		Accesses styles on a node.
		// description:
		//		Getting the style value uses the computed style for the node, so the value
		//		will be a calculated value, not just the immediate node.style value.
		//		Also when getting values, use specific style names,
		//		like "borderBottomWidth" instead of "border" since compound values like
		//		"border" are not necessarily reflected as expected.
		//		If you want to get node dimensions, use `dojo/dom-geometry.getMarginBox()`,
		//		`dojo/dom-geometry.getContentBox()` or `dojo/dom-geometry.getPosition()`.
		// node: DOMNode|String
		//		id or reference to node to get style for
		// name: String?
		//		the style property to get
		// example:
		//		Passing only an ID or node returns the computed style object of
		//		the node:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.get("thinger");
		//	|	});
		// example:
		//		Passing a node and a style property returns the current
		//		normalized, computed value for that property:
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.get("thinger", "opacity"); // 1 by default
		//	|	});

		var n = dom.byId(node), l = arguments.length, op = (name == "opacity");
		if(l == 2 && op){
			return _getOpacity(n);
		}
		name = _floatAliases[name] ? "cssFloat" in n.style ? "cssFloat" : "styleFloat" : name;
		var s = style.getComputedStyle(n);
		return (l == 1) ? s : _toStyleValue(n, name, s[name] || n.style[name]); /* CSS2Properties||String||Number */
	};

	style.set = function setStyle(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets styles on a node.
		// node: DOMNode|String
		//		id or reference to node to set style for
		// name: String|Object
		//		the style property to set in DOM-accessor format
		//		("borderWidth", not "border-width") or an object with key/value
		//		pairs suitable for setting each property.
		// value: String?
		//		If passed, sets value on the node for style, handling
		//		cross-browser concerns.  When setting a pixel value,
		//		be sure to include "px" in the value. For instance, top: "200px".
		//		Otherwise, in some cases, some browsers will not apply the style.
		//
		// example:
		//		Passing a node, a style property, and a value changes the
		//		current display of the node and returns the new computed value
		//	|	require(["dojo/dom-style"], function(domStyle){
		//	|		domStyle.set("thinger", "opacity", 0.5); // == 0.5
		//	|	});
		//
		// example:
		//		Passing a node, an object-style style property sets each of the values in turn and returns the computed style object of the node:
		//	|	require(["dojo/dom-style"], function(domStyle){
		//	|		domStyle.set("thinger", {
		//	|			"opacity": 0.5,
		//	|			"border": "3px solid black",
		//	|			"height": "300px"
		//	|		});
		//	|	});
		//
		// example:
		//		When the CSS style property is hyphenated, the JavaScript property is camelCased.
		//		font-size becomes fontSize, and so on.
		//	|	require(["dojo/dom-style", "dojo/dom"], function(domStyle, dom){
		//	|		domStyle.set("thinger",{
		//	|			fontSize:"14pt",
		//	|			letterSpacing:"1.2em"
		//	|		});
		//	|	});
		//
		// example:
		//		dojo/NodeList implements .style() using the same syntax, omitting the "node" parameter, calling
		//		dojo/dom-style.get() on every element of the list. See: `dojo/query` and `dojo/NodeList`
		//	|	require(["dojo/dom-style", "dojo/query", "dojo/NodeList-dom"],
		//	|	function(domStyle, query){
		//	|		query(".someClassName").style("visibility","hidden");
		//	|		// or
		//	|		query("#baz > div").style({
		//	|			opacity:0.75,
		//	|			fontSize:"13pt"
		//	|		});
		//	|	});

		var n = dom.byId(node), l = arguments.length, op = (name == "opacity");
		name = _floatAliases[name] ? "cssFloat" in n.style ? "cssFloat" : "styleFloat" : name;
		if(l == 3){
			return op ? _setOpacity(n, value) : n.style[name] = value; // Number
		}
		for(var x in name){
			style.set(node, x, name[x]);
		}
		return style.getComputedStyle(n);
	};

	return style;
});

},
'dojo/dom-prop':function(){
define(["exports", "./_base/kernel", "./sniff", "./_base/lang", "./dom", "./dom-style", "./dom-construct", "./_base/connect"],
		function(exports, dojo, has, lang, dom, style, ctr, conn){
	// module:
	//		dojo/dom-prop
	// summary:
	//		This module defines the core dojo DOM properties API.

	// TODOC: summary not showing up in output, see https://github.com/csnover/js-doc-parse/issues/42

	// =============================
	// Element properties Functions
	// =============================

	// helper to connect events
	var _evtHdlrMap = {}, _ctr = 0, _attrId = dojo._scopeName + "attrid";
	has.add('dom-textContent', function (global, doc, element) { return 'textContent' in element; });

	exports.names = {
		// properties renamed to avoid clashes with reserved words
		"class": "className",
		"for": "htmlFor",
		// properties written as camelCase
		tabindex: "tabIndex",
		readonly: "readOnly",
		colspan: "colSpan",
		frameborder: "frameBorder",
		rowspan: "rowSpan",
		textcontent: "textContent",
		valuetype: "valueType"
	};
	
	function getText(/*DOMNode*/node){
		// summary:
		//		recursion method for get('textContent') to use. Gets text value for a node.
		// description:
		//		Juse uses nodedValue so things like <br/> tags do not end up in
		//		the text as any sort of line return.
		var text = "", ch = node.childNodes;
		for(var i = 0, n; n = ch[i]; i++){
			//Skip comments.
			if(n.nodeType != 8){
				if(n.nodeType == 1){
					text += getText(n);
				}else{
					text += n.nodeValue;
				}
			}
		}
		return text;
	}

	exports.get = function getProp(/*DOMNode|String*/ node, /*String*/ name){
		// summary:
		//		Gets a property on an HTML element.
		// description:
		//		Handles normalized getting of properties on DOM nodes.
		//
		// node: DOMNode|String
		//		id or reference to the element to get the property on
		// name: String
		//		the name of the property to get.
		// returns:
		//		the value of the requested property or its default value
		//
		// example:
		//	|	// get the current value of the "foo" property on a node
		//	|	require(["dojo/dom-prop", "dojo/dom"], function(domProp, dom){
		//	|		domProp.get(dom.byId("nodeId"), "foo");
		//	|		// or we can just pass the id:
		//	|		domProp.get("nodeId", "foo");
		//	|	});

		node = dom.byId(node);
		var lc = name.toLowerCase(), propName = exports.names[lc] || name;
		
		if(propName == "textContent" && !has("dom-textContent")){
			return getText(node);
		}
		
		return node[propName];	// Anything
	};

	exports.set = function setProp(/*DOMNode|String*/ node, /*String|Object*/ name, /*String?*/ value){
		// summary:
		//		Sets a property on an HTML element.
		// description:
		//		Handles normalized setting of properties on DOM nodes.
		//
		//		When passing functions as values, note that they will not be
		//		directly assigned to slots on the node, but rather the default
		//		behavior will be removed and the new behavior will be added
		//		using `dojo.connect()`, meaning that event handler properties
		//		will be normalized and that some caveats with regards to
		//		non-standard behaviors for onsubmit apply. Namely that you
		//		should cancel form submission using `dojo.stopEvent()` on the
		//		passed event object instead of returning a boolean value from
		//		the handler itself.
		// node: DOMNode|String
		//		id or reference to the element to set the property on
		// name: String|Object
		//		the name of the property to set, or a hash object to set
		//		multiple properties at once.
		// value: String?
		//		The value to set for the property
		// returns:
		//		the DOM node
		//
		// example:
		//	|	// use prop() to set the tab index
		//	|	require(["dojo/dom-prop"], function(domProp){
		//	|		domProp.set("nodeId", "tabIndex", 3);
		//	|	});
		//
		// example:
		//	Set multiple values at once, including event handlers:
		//	|	require(["dojo/dom-prop"], function(domProp){
		//	|		domProp.set("formId", {
		//	|			"foo": "bar",
		//	|			"tabIndex": -1,
		//	|			"method": "POST",
		//	|		});
		//	|	});

		node = dom.byId(node);
		var l = arguments.length;
		if(l == 2 && typeof name != "string"){ // inline'd type check
			// the object form of setter: the 2nd argument is a dictionary
			for(var x in name){
				exports.set(node, x, name[x]);
			}
			return node; // DomNode
		}
		var lc = name.toLowerCase(), propName = exports.names[lc] || name;
		if(propName == "style" && typeof value != "string"){ // inline'd type check
			// special case: setting a style
			style.set(node, value);
			return node; // DomNode
		}
		if(propName == "innerHTML"){
			// special case: assigning HTML
			// the hash lists elements with read-only innerHTML on IE
			if(has("ie") && node.tagName.toLowerCase() in {col: 1, colgroup: 1,
						table: 1, tbody: 1, tfoot: 1, thead: 1, tr: 1, title: 1}){
				ctr.empty(node);
				node.appendChild(ctr.toDom(value, node.ownerDocument));
			}else{
				node[propName] = value;
			}
			return node; // DomNode
		}
		if(propName == "textContent" && !has("dom-textContent")) {
			ctr.empty(node);
			node.appendChild(node.ownerDocument.createTextNode(value));
			return node;
		}
		if(lang.isFunction(value)){
			// special case: assigning an event handler
			// clobber if we can
			var attrId = node[_attrId];
			if(!attrId){
				attrId = _ctr++;
				node[_attrId] = attrId;
			}
			if(!_evtHdlrMap[attrId]){
				_evtHdlrMap[attrId] = {};
			}
			var h = _evtHdlrMap[attrId][propName];
			if(h){
				//h.remove();
				conn.disconnect(h);
			}else{
				try{
					delete node[propName];
				}catch(e){}
			}
			// ensure that event objects are normalized, etc.
			if(value){
				//_evtHdlrMap[attrId][propName] = on(node, propName, value);
				_evtHdlrMap[attrId][propName] = conn.connect(node, propName, value);
			}else{
				node[propName] = null;
			}
			return node; // DomNode
		}
		node[propName] = value;
		return node;	// DomNode
	};
});

},
'dojo/_base/connect':function(){
define(["./kernel", "../on", "../topic", "../aspect", "./event", "../mouse", "./sniff", "./lang", "../keys"], function(dojo, on, hub, aspect, eventModule, mouse, has, lang){
// module:
//		dojo/_base/connect

has.add("events-keypress-typed", function(){ // keypresses should only occur a printable character is hit
	var testKeyEvent = {charCode: 0};
	try{
		testKeyEvent = document.createEvent("KeyboardEvent");
		(testKeyEvent.initKeyboardEvent || testKeyEvent.initKeyEvent).call(testKeyEvent, "keypress", true, true, null, false, false, false, false, 9, 3);
	}catch(e){}
	return testKeyEvent.charCode == 0 && !has("opera");
});

function connect_(obj, event, context, method, dontFix){
	method = lang.hitch(context, method);
	if(!obj || !(obj.addEventListener || obj.attachEvent)){
		// it is a not a DOM node and we are using the dojo.connect style of treating a
		// method like an event, must go right to aspect
		return aspect.after(obj || dojo.global, event, method, true);
	}
	if(typeof event == "string" && event.substring(0, 2) == "on"){
		event = event.substring(2);
	}
	if(!obj){
		obj = dojo.global;
	}
	if(!dontFix){
		switch(event){
			// dojo.connect has special handling for these event types
			case "keypress":
				event = keypress;
				break;
			case "mouseenter":
				event = mouse.enter;
				break;
			case "mouseleave":
				event = mouse.leave;
				break;
		}
	}
	return on(obj, event, method, dontFix);
}

var _punctMap = {
	106:42,
	111:47,
	186:59,
	187:43,
	188:44,
	189:45,
	190:46,
	191:47,
	192:96,
	219:91,
	220:92,
	221:93,
	222:39,
	229:113
};
var evtCopyKey = has("mac") ? "metaKey" : "ctrlKey";


var _synthesizeEvent = function(evt, props){
	var faux = lang.mixin({}, evt, props);
	setKeyChar(faux);
	// FIXME: would prefer to use lang.hitch: lang.hitch(evt, evt.preventDefault);
	// but it throws an error when preventDefault is invoked on Safari
	// does Event.preventDefault not support "apply" on Safari?
	faux.preventDefault = function(){ evt.preventDefault(); };
	faux.stopPropagation = function(){ evt.stopPropagation(); };
	return faux;
};
function setKeyChar(evt){
	evt.keyChar = evt.charCode ? String.fromCharCode(evt.charCode) : '';
	evt.charOrCode = evt.keyChar || evt.keyCode;
}
var keypress;
if(has("events-keypress-typed")){
	// this emulates Firefox's keypress behavior where every keydown can correspond to a keypress
	var _trySetKeyCode = function(e, code){
		try{
			// squelch errors when keyCode is read-only
			// (e.g. if keyCode is ctrl or shift)
			return (e.keyCode = code);
		}catch(e){
			return 0;
		}
	};
	keypress = function(object, listener){
		var keydownSignal = on(object, "keydown", function(evt){
			// munge key/charCode
			var k=evt.keyCode;
			// These are Windows Virtual Key Codes
			// http://msdn.microsoft.com/library/default.asp?url=/library/en-us/winui/WinUI/WindowsUserInterface/UserInput/VirtualKeyCodes.asp
			var unprintable = (k!=13) && k!=32 && (k!=27||!has("ie")) && (k<48||k>90) && (k<96||k>111) && (k<186||k>192) && (k<219||k>222) && k!=229;
			// synthesize keypress for most unprintables and CTRL-keys
			if(unprintable||evt.ctrlKey){
				var c = unprintable ? 0 : k;
				if(evt.ctrlKey){
					if(k==3 || k==13){
						return listener.call(evt.currentTarget, evt); // IE will post CTRL-BREAK, CTRL-ENTER as keypress natively
					}else if(c>95 && c<106){
						c -= 48; // map CTRL-[numpad 0-9] to ASCII
					}else if((!evt.shiftKey)&&(c>=65&&c<=90)){
						c += 32; // map CTRL-[A-Z] to lowercase
					}else{
						c = _punctMap[c] || c; // map other problematic CTRL combinations to ASCII
					}
				}
				// simulate a keypress event
				var faux = _synthesizeEvent(evt, {type: 'keypress', faux: true, charCode: c});
				listener.call(evt.currentTarget, faux);
				if(has("ie")){
					_trySetKeyCode(evt, faux.keyCode);
				}
			}
		});
		var keypressSignal = on(object, "keypress", function(evt){
			var c = evt.charCode;
			c = c>=32 ? c : 0;
			evt = _synthesizeEvent(evt, {charCode: c, faux: true});
			return listener.call(this, evt);
		});
		return {
			remove: function(){
				keydownSignal.remove();
				keypressSignal.remove();
			}
		};
	};
}else{
	if(has("opera")){
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				var c = evt.which;
				if(c==3){
					c=99; // Mozilla maps CTRL-BREAK to CTRL-c
				}
				// can't trap some keys at all, like INSERT and DELETE
				// there is no differentiating info between DELETE and ".", or INSERT and "-"
				c = c<32 && !evt.shiftKey ? 0 : c;
				if(evt.ctrlKey && !evt.shiftKey && c>=65 && c<=90){
					// lowercase CTRL-[A-Z] keys
					c += 32;
				}
				return listener.call(this, _synthesizeEvent(evt, { charCode: c }));
			});
		};
	}else{
		keypress = function(object, listener){
			return on(object, "keypress", function(evt){
				setKeyChar(evt);
				return listener.call(this, evt);
			});
		};
	}
}

var connect = {
	// summary:
	//		This module defines the dojo.connect API.
	//		This modules also provides keyboard event handling helpers.
	//		This module exports an extension event for emulating Firefox's keypress handling.
	//		However, this extension event exists primarily for backwards compatibility and
	//		is not recommended. WebKit and IE uses an alternate keypress handling (only
	//		firing for printable characters, to distinguish from keydown events), and most
	//		consider the WebKit/IE behavior more desirable.

	_keypress:keypress,

	connect:function(obj, event, context, method, dontFix){
		// summary:
		//		`dojo.connect` is a deprecated event handling and delegation method in
		//		Dojo. It allows one function to "listen in" on the execution of
		//		any other, triggering the second whenever the first is called. Many
		//		listeners may be attached to a function, and source functions may
		//		be either regular function calls or DOM events.
		//
		// description:
		//		Connects listeners to actions, so that after event fires, a
		//		listener is called with the same arguments passed to the original
		//		function.
		//
		//		Since `dojo.connect` allows the source of events to be either a
		//		"regular" JavaScript function or a DOM event, it provides a uniform
		//		interface for listening to all the types of events that an
		//		application is likely to deal with though a single, unified
		//		interface. DOM programmers may want to think of it as
		//		"addEventListener for everything and anything".
		//
		//		When setting up a connection, the `event` parameter must be a
		//		string that is the name of the method/event to be listened for. If
		//		`obj` is null, `kernel.global` is assumed, meaning that connections
		//		to global methods are supported but also that you may inadvertently
		//		connect to a global by passing an incorrect object name or invalid
		//		reference.
		//
		//		`dojo.connect` generally is forgiving. If you pass the name of a
		//		function or method that does not yet exist on `obj`, connect will
		//		not fail, but will instead set up a stub method. Similarly, null
		//		arguments may simply be omitted such that fewer than 4 arguments
		//		may be required to set up a connection See the examples for details.
		//
		//		The return value is a handle that is needed to
		//		remove this connection with `dojo.disconnect`.
		//
		// obj: Object?
		//		The source object for the event function.
		//		Defaults to `kernel.global` if null.
		//		If obj is a DOM node, the connection is delegated
		//		to the DOM event manager (unless dontFix is true).
		//
		// event: String
		//		String name of the event function in obj.
		//		I.e. identifies a property `obj[event]`.
		//
		// context: Object|null
		//		The object that method will receive as "this".
		//
		//		If context is null and method is a function, then method
		//		inherits the context of event.
		//
		//		If method is a string then context must be the source
		//		object object for method (context[method]). If context is null,
		//		kernel.global is used.
		//
		// method: String|Function
		//		A function reference, or name of a function in context.
		//		The function identified by method fires after event does.
		//		method receives the same arguments as the event.
		//		See context argument comments for information on method's scope.
		//
		// dontFix: Boolean?
		//		If obj is a DOM node, set dontFix to true to prevent delegation
		//		of this connection to the DOM event manager.
		//
		// example:
		//		When obj.onchange(), do ui.update():
		//	|	dojo.connect(obj, "onchange", ui, "update");
		//	|	dojo.connect(obj, "onchange", ui, ui.update); // same
		//
		// example:
		//		Using return value for disconnect:
		//	|	var link = dojo.connect(obj, "onchange", ui, "update");
		//	|	...
		//	|	dojo.disconnect(link);
		//
		// example:
		//		When onglobalevent executes, watcher.handler is invoked:
		//	|	dojo.connect(null, "onglobalevent", watcher, "handler");
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked:
		//	|	dojo.connect(ob, "onCustomEvent", null, "customEventHandler");
		//	|	dojo.connect(ob, "onCustomEvent", "customEventHandler"); // same
		//
		// example:
		//		When ob.onCustomEvent executes, customEventHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(ob, "onCustomEvent", null, customEventHandler);
		//	|	dojo.connect(ob, "onCustomEvent", customEventHandler); // same
		//
		// example:
		//		When globalEvent executes, globalHandler is invoked
		//		with the same scope (this):
		//	|	dojo.connect(null, "globalEvent", null, globalHandler);
		//	|	dojo.connect("globalEvent", globalHandler); // same

		// normalize arguments
		var a=arguments, args=[], i=0;
		// if a[0] is a String, obj was omitted
		args.push(typeof a[0] == "string" ? null : a[i++], a[i++]);
		// if the arg-after-next is a String or Function, context was NOT omitted
		var a1 = a[i+1];
		args.push(typeof a1 == "string" || typeof a1 == "function" ? a[i++] : null, a[i++]);
		// absorb any additional arguments
		for(var l=a.length; i<l; i++){	args.push(a[i]); }
		return connect_.apply(this, args);
	},

	disconnect:function(handle){
		// summary:
		//		Remove a link created by dojo.connect.
		// description:
		//		Removes the connection between event and the method referenced by handle.
		// handle: Handle
		//		the return value of the dojo.connect call that created the connection.

		if(handle){
			handle.remove();
		}
	},

	subscribe:function(topic, context, method){
		// summary:
		//		Attach a listener to a named topic. The listener function is invoked whenever the
		//		named topic is published (see: dojo.publish).
		//		Returns a handle which is needed to unsubscribe this listener.
		// topic: String
		//		The topic to which to subscribe.
		// context: Object?
		//		Scope in which method will be invoked, or null for default scope.
		// method: String|Function
		//		The name of a function in context, or a function reference. This is the function that
		//		is invoked when topic is published.
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); });
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.subscribe(topic, lang.hitch(context, method));
	},

	publish:function(topic, args){
		// summary:
		//		Invoke all listener method subscribed to topic.
		// topic: String
		//		The name of the topic to publish.
		// args: Array?
		//		An array of arguments. The arguments will be applied
		//		to each topic subscriber (as first class parameters, via apply).
		// example:
		//	|	dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
		//	|	dojo.publish("alerts", [ "read this", "hello world" ]);
		return hub.publish.apply(hub, [topic].concat(args));
	},

	connectPublisher:function(topic, obj, event){
		// summary:
		//		Ensure that every time obj.event() is called, a message is published
		//		on the topic. Returns a handle which can be passed to
		//		dojo.disconnect() to disable subsequent automatic publication on
		//		the topic.
		// topic: String
		//		The name of the topic to publish.
		// obj: Object?
		//		The source object for the event function. Defaults to kernel.global
		//		if null.
		// event: String
		//		The name of the event function in obj.
		//		I.e. identifies a property obj[event].
		// example:
		//	|	dojo.connectPublisher("/ajax/start", dojo, "xhrGet");
		var pf = function(){ connect.publish(topic, arguments); };
		return event ? connect.connect(obj, event, pf) : connect.connect(obj, pf); //Handle
	},

	isCopyKey: function(e){
		// summary:
		//		Checks an event for the copy key (meta on Mac, and ctrl anywhere else)
		// e: Event
		//		Event object to examine
		return e[evtCopyKey];	// Boolean
	}
};

connect.unsubscribe = connect.disconnect;
/*=====
 connect.unsubscribe = function(handle){
	 // summary:
	 //		Remove a topic listener.
	 // handle: Handle
	 //		The handle returned from a call to subscribe.
	 // example:
	 //	|	var alerter = dojo.subscribe("alerts", null, function(caption, message){ alert(caption + "\n" + message); };
	 //	|	...
	 //	|	dojo.unsubscribe(alerter);
 };
 =====*/

 1  && lang.mixin(dojo, connect);
return connect;

});



},
'dojo/topic':function(){
define(["./Evented"], function(Evented){

	// module:
	//		dojo/topic

	var hub = new Evented;
	return {
		// summary:
		//		Pubsub hub.
		// example:
		//		| 	topic.subscribe("some/topic", function(event){
		//		|	... do something with event
		//		|	});
		//		|	topic.publish("some/topic", {name:"some event", ...});

		publish: function(topic, event){
			// summary:
			//		Publishes a message to a topic on the pub/sub hub. All arguments after
			//		the first will be passed to the subscribers, so any number of arguments
			//		can be provided (not just event).
			// topic: String
			//		The name of the topic to publish to
			// event: Object
			//		An event to distribute to the topic listeners
			return hub.emit.apply(hub, arguments);
		},

		subscribe: function(topic, listener){
			// summary:
			//		Subscribes to a topic on the pub/sub hub
			// topic: String
			//		The topic to subscribe to
			// listener: Function
			//		A function to call when a message is published to the given topic
			return hub.on.apply(hub, arguments);
		}
	};
});

},
'dojo/_base/event':function(){
define(["./kernel", "../on", "../has", "../dom-geometry"], function(dojo, on, has, dom){
	// module:
	//		dojo/_base/event

	if(on._fixEvent){
		var fixEvent = on._fixEvent;
		on._fixEvent = function(evt, se){
			// add some additional normalization for back-compat, this isn't in on.js because it is somewhat more expensive
			evt = fixEvent(evt, se);
			if(evt){
				dom.normalizeEvent(evt);
			}
			return evt;
		};		
	}
	
	var ret = {
		// summary:
		//		This module defines dojo DOM event API.   Usually you should use dojo/on, and evt.stopPropagation() +
		//		evt.preventDefault(), rather than this module.

		fix: function(/*Event*/ evt, /*DOMNode*/ sender){
			// summary:
			//		normalizes properties on the event object including event
			//		bubbling methods, keystroke normalization, and x/y positions
			// evt: Event
			//		native event object
			// sender: DOMNode
			//		node to treat as "currentTarget"
			if(on._fixEvent){
				return on._fixEvent(evt, sender);
			}
			return evt;	// Event
		},
	
		stop: function(/*Event*/ evt){
			// summary:
			//		prevents propagation and clobbers the default action of the
			//		passed event
			// evt: Event
			//		The event object. If omitted, window.event is used on IE.
			if(has("dom-addeventlistener") || (evt && evt.preventDefault)){
				evt.preventDefault();
				evt.stopPropagation();
			}else{
				evt = evt || window.event;
				evt.cancelBubble = true;
				on._preventDefault.call(evt);
			}
		}
	};

	if( 1 ){
		dojo.fixEvent = ret.fix;
		dojo.stopEvent = ret.stop;
	}

	return ret;
});

},
'dojo/dom-geometry':function(){
define(["./sniff", "./_base/window","./dom", "./dom-style"],
		function(has, win, dom, style){
	// module:
	//		dojo/dom-geometry

	// the result object
	var geom = {
		// summary:
		//		This module defines the core dojo DOM geometry API.
	};

	// Box functions will assume this model.
	// On IE/Opera, BORDER_BOX will be set if the primary document is in quirks mode.
	// Can be set to change behavior of box setters.

	// can be either:
	//	"border-box"
	//	"content-box" (default)
	geom.boxModel = "content-box";

	// We punt per-node box mode testing completely.
	// If anybody cares, we can provide an additional (optional) unit
	// that overrides existing code to include per-node box sensitivity.

	// Opera documentation claims that Opera 9 uses border-box in BackCompat mode.
	// but experiments (Opera 9.10.8679 on Windows Vista) indicate that it actually continues to use content-box.
	// IIRC, earlier versions of Opera did in fact use border-box.
	// Opera guys, this is really confusing. Opera being broken in quirks mode is not our fault.

	if(has("ie") /*|| has("opera")*/){
		// client code may have to adjust if compatMode varies across iframes
		geom.boxModel = document.compatMode == "BackCompat" ? "border-box" : "content-box";
	}

	geom.getPadExtents = function getPadExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		Returns object with special values specifically useful for node
		//		fitting.
		// description:
		//		Returns an object with `w`, `h`, `l`, `t` properties:
		//	|		l/t/r/b = left/top/right/bottom padding (respectively)
		//	|		w = the total of the left and right padding
		//	|		h = the total of the top and bottom padding
		//		If 'node' has position, l/t forms the origin for child nodes.
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), px = style.toPixelValue,
			l = px(node, s.paddingLeft), t = px(node, s.paddingTop), r = px(node, s.paddingRight), b = px(node, s.paddingBottom);
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	var none = "none";

	geom.getBorderExtents = function getBorderExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object with properties useful for noting the border
		//		dimensions.
		// description:
		//		- l/t/r/b = the sum of left/top/right/bottom border (respectively)
		//		- w = the sum of the left and right border
		//		- h = the sum of the top and bottom border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var px = style.toPixelValue, s = computedStyle || style.getComputedStyle(node),
			l = s.borderLeftStyle != none ? px(node, s.borderLeftWidth) : 0,
			t = s.borderTopStyle != none ? px(node, s.borderTopWidth) : 0,
			r = s.borderRightStyle != none ? px(node, s.borderRightWidth) : 0,
			b = s.borderBottomStyle != none ? px(node, s.borderBottomWidth) : 0;
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	geom.getPadBorderExtents = function getPadBorderExtents(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		Returns object with properties useful for box fitting with
		//		regards to padding.
		// description:
		//		- l/t/r/b = the sum of left/top/right/bottom padding and left/top/right/bottom border (respectively)
		//		- w = the sum of the left and right padding and border
		//		- h = the sum of the top and bottom padding and border
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node),
			p = geom.getPadExtents(node, s),
			b = geom.getBorderExtents(node, s);
		return {
			l: p.l + b.l,
			t: p.t + b.t,
			r: p.r + b.r,
			b: p.b + b.b,
			w: p.w + b.w,
			h: p.h + b.h
		};
	};

	geom.getMarginExtents = function getMarginExtents(node, computedStyle){
		// summary:
		//		returns object with properties useful for box fitting with
		//		regards to box margins (i.e., the outer-box).
		//
		//		- l/t = marginLeft, marginTop, respectively
		//		- w = total width, margin inclusive
		//		- h = total height, margin inclusive
		//
		//		The w/h are used for calculating boxes.
		//		Normally application code will not need to invoke this
		//		directly, and will use the ...box... functions instead.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), px = style.toPixelValue,
			l = px(node, s.marginLeft), t = px(node, s.marginTop), r = px(node, s.marginRight), b = px(node, s.marginBottom);
		return {l: l, t: t, r: r, b: b, w: l + r, h: t + b};
	};

	// Box getters work in any box context because offsetWidth/clientWidth
	// are invariant wrt box context
	//
	// They do *not* work for display: inline objects that have padding styles
	// because the user agent ignores padding (it's bogus styling in any case)
	//
	// Be careful with IMGs because they are inline or block depending on
	// browser and browser mode.

	// Although it would be easier to read, there are not separate versions of
	// _getMarginBox for each browser because:
	// 1. the branching is not expensive
	// 2. factoring the shared code wastes cycles (function call overhead)
	// 3. duplicating the shared code wastes bytes

	geom.getMarginBox = function getMarginBox(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object that encodes the width, height, left and top
		//		positions of the node's margin box.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), me = geom.getMarginExtents(node, s),
			l = node.offsetLeft - me.l, t = node.offsetTop - me.t, p = node.parentNode, px = style.toPixelValue, pcs;
		if(has("mozilla")){
			// Mozilla:
			// If offsetParent has a computed overflow != visible, the offsetLeft is decreased
			// by the parent's border.
			// We don't want to compute the parent's style, so instead we examine node's
			// computed left/top which is more stable.
			var sl = parseFloat(s.left), st = parseFloat(s.top);
			if(!isNaN(sl) && !isNaN(st)){
				l = sl;
				t = st;
			}else{
				// If child's computed left/top are not parseable as a number (e.g. "auto"), we
				// have no choice but to examine the parent's computed style.
				if(p && p.style){
					pcs = style.getComputedStyle(p);
					if(pcs.overflow != "visible"){
						l += pcs.borderLeftStyle != none ? px(node, pcs.borderLeftWidth) : 0;
						t += pcs.borderTopStyle != none ? px(node, pcs.borderTopWidth) : 0;
					}
				}
			}
		}else if(has("opera") || (has("ie") == 8 && !has("quirks"))){
			// On Opera and IE 8, offsetLeft/Top includes the parent's border
			if(p){
				pcs = style.getComputedStyle(p);
				l -= pcs.borderLeftStyle != none ? px(node, pcs.borderLeftWidth) : 0;
				t -= pcs.borderTopStyle != none ? px(node, pcs.borderTopWidth) : 0;
			}
		}
		return {l: l, t: t, w: node.offsetWidth + me.w, h: node.offsetHeight + me.h};
	};

	geom.getContentBox = function getContentBox(node, computedStyle){
		// summary:
		//		Returns an object that encodes the width, height, left and top
		//		positions of the node's content box, irrespective of the
		//		current box model.
		// node: DOMNode
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		// clientWidth/Height are important since the automatically account for scrollbars
		// fallback to offsetWidth/Height for special cases (see #3378)
		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), w = node.clientWidth, h,
			pe = geom.getPadExtents(node, s), be = geom.getBorderExtents(node, s);
		if(!w){
			w = node.offsetWidth;
			h = node.offsetHeight;
		}else{
			h = node.clientHeight;
			be.w = be.h = 0;
		}
		// On Opera, offsetLeft includes the parent's border
		if(has("opera")){
			pe.l += be.l;
			pe.t += be.t;
		}
		return {l: pe.l, t: pe.t, w: w - pe.w - be.w, h: h - pe.h - be.h};
	};

	// Box setters depend on box context because interpretation of width/height styles
	// vary wrt box context.
	//
	// The value of boxModel is used to determine box context.
	// boxModel can be set directly to change behavior.
	//
	// Beware of display: inline objects that have padding styles
	// because the user agent ignores padding (it's a bogus setup anyway)
	//
	// Be careful with IMGs because they are inline or block depending on
	// browser and browser mode.
	//
	// Elements other than DIV may have special quirks, like built-in
	// margins or padding, or values not detectable via computedStyle.
	// In particular, margins on TABLE do not seems to appear
	// at all in computedStyle on Mozilla.

	function setBox(/*DomNode*/ node, /*Number?*/ l, /*Number?*/ t, /*Number?*/ w, /*Number?*/ h, /*String?*/ u){
		// summary:
		//		sets width/height/left/top in the current (native) box-model
		//		dimensions. Uses the unit passed in u.
		// node:
		//		DOM Node reference. Id string not supported for performance
		//		reasons.
		// l:
		//		left offset from parent.
		// t:
		//		top offset from parent.
		// w:
		//		width in current box model.
		// h:
		//		width in current box model.
		// u:
		//		unit measure to use for other measures. Defaults to "px".
		u = u || "px";
		var s = node.style;
		if(!isNaN(l)){
			s.left = l + u;
		}
		if(!isNaN(t)){
			s.top = t + u;
		}
		if(w >= 0){
			s.width = w + u;
		}
		if(h >= 0){
			s.height = h + u;
		}
	}

	function isButtonTag(/*DomNode*/ node){
		// summary:
		//		True if the node is BUTTON or INPUT.type="button".
		return node.tagName.toLowerCase() == "button" ||
			node.tagName.toLowerCase() == "input" && (node.getAttribute("type") || "").toLowerCase() == "button"; // boolean
	}

	function usesBorderBox(/*DomNode*/ node){
		// summary:
		//		True if the node uses border-box layout.

		// We could test the computed style of node to see if a particular box
		// has been specified, but there are details and we choose not to bother.

		// TABLE and BUTTON (and INPUT type=button) are always border-box by default.
		// If you have assigned a different box to either one via CSS then
		// box functions will break.

		return geom.boxModel == "border-box" || node.tagName.toLowerCase() == "table" || isButtonTag(node); // boolean
	}

	geom.setContentSize = function setContentSize(/*DomNode*/ node, /*Object*/ box, /*Object*/ computedStyle){
		// summary:
		//		Sets the size of the node's contents, irrespective of margins,
		//		padding, or borders.
		// node: DOMNode
		// box: Object
		//		hash with optional "w", and "h" properties for "width", and "height"
		//		respectively. All specified properties should have numeric values in whole pixels.
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var w = box.w, h = box.h;
		if(usesBorderBox(node)){
			var pb = geom.getPadBorderExtents(node, computedStyle);
			if(w >= 0){
				w += pb.w;
			}
			if(h >= 0){
				h += pb.h;
			}
		}
		setBox(node, NaN, NaN, w, h);
	};

	var nilExtents = {l: 0, t: 0, w: 0, h: 0};

	geom.setMarginBox = function setMarginBox(/*DomNode*/ node, /*Object*/ box, /*Object*/ computedStyle){
		// summary:
		//		sets the size of the node's margin box and placement
		//		(left/top), irrespective of box model. Think of it as a
		//		passthrough to setBox that handles box-model vagaries for
		//		you.
		// node: DOMNode
		// box: Object
		//		hash with optional "l", "t", "w", and "h" properties for "left", "right", "width", and "height"
		//		respectively. All specified properties should have numeric values in whole pixels.
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var s = computedStyle || style.getComputedStyle(node), w = box.w, h = box.h,
		// Some elements have special padding, margin, and box-model settings.
		// To use box functions you may need to set padding, margin explicitly.
		// Controlling box-model is harder, in a pinch you might set dojo/dom-geometry.boxModel.
			pb = usesBorderBox(node) ? nilExtents : geom.getPadBorderExtents(node, s),
			mb = geom.getMarginExtents(node, s);
		if(has("webkit")){
			// on Safari (3.1.2), button nodes with no explicit size have a default margin
			// setting an explicit size eliminates the margin.
			// We have to swizzle the width to get correct margin reading.
			if(isButtonTag(node)){
				var ns = node.style;
				if(w >= 0 && !ns.width){
					ns.width = "4px";
				}
				if(h >= 0 && !ns.height){
					ns.height = "4px";
				}
			}
		}
		if(w >= 0){
			w = Math.max(w - pb.w - mb.w, 0);
		}
		if(h >= 0){
			h = Math.max(h - pb.h - mb.h, 0);
		}
		setBox(node, box.l, box.t, w, h);
	};

	// =============================
	// Positioning
	// =============================

	geom.isBodyLtr = function isBodyLtr(/*Document?*/ doc){
		// summary:
		//		Returns true if the current language is left-to-right, and false otherwise.
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Boolean

		doc = doc || win.doc;
		return (win.body(doc).dir || doc.documentElement.dir || "ltr").toLowerCase() == "ltr"; // Boolean
	};

	geom.docScroll = function docScroll(/*Document?*/ doc){
		// summary:
		//		Returns an object with {node, x, y} with corresponding offsets.
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Object

		doc = doc || win.doc;
		var node = win.doc.parentWindow || win.doc.defaultView;   // use UI window, not dojo.global window.   TODO: use dojo/window::get() except for circular dependency problem
		return "pageXOffset" in node ? {x: node.pageXOffset, y: node.pageYOffset } :
			(node = has("quirks") ? win.body(doc) : doc.documentElement) &&
				{x: geom.fixIeBiDiScrollLeft(node.scrollLeft || 0, doc), y: node.scrollTop || 0 };
	};

	if(has("ie")){
		geom.getIeDocumentElementOffset = function getIeDocumentElementOffset(/*Document?*/ doc){
			// summary:
			//		returns the offset in x and y from the document body to the
			//		visual edge of the page for IE
			// doc: Document?
			//		Optional document to query.   If unspecified, use win.doc.
			// description:
			//		The following values in IE contain an offset:
			//	|		event.clientX
			//	|		event.clientY
			//	|		node.getBoundingClientRect().left
			//	|		node.getBoundingClientRect().top
			//		But other position related values do not contain this offset,
			//		such as node.offsetLeft, node.offsetTop, node.style.left and
			//		node.style.top. The offset is always (2, 2) in LTR direction.
			//		When the body is in RTL direction, the offset counts the width
			//		of left scroll bar's width.  This function computes the actual
			//		offset.

			//NOTE: assumes we're being called in an IE browser

			doc = doc || win.doc;
			var de = doc.documentElement; // only deal with HTML element here, position() handles body/quirks

			if(has("ie") < 8){
				var r = de.getBoundingClientRect(), // works well for IE6+
					l = r.left, t = r.top;
				if(has("ie") < 7){
					l += de.clientLeft;	// scrollbar size in strict/RTL, or,
					t += de.clientTop;	// HTML border size in strict
				}
				return {
					x: l < 0 ? 0 : l, // FRAME element border size can lead to inaccurate negative values
					y: t < 0 ? 0 : t
				};
			}else{
				return {
					x: 0,
					y: 0
				};
			}
		};
	}

	geom.fixIeBiDiScrollLeft = function fixIeBiDiScrollLeft(/*Integer*/ scrollLeft, /*Document?*/ doc){
		// summary:
		//		In RTL direction, scrollLeft should be a negative value, but IE
		//		returns a positive one. All codes using documentElement.scrollLeft
		//		must call this function to fix this error, otherwise the position
		//		will offset to right when there is a horizontal scrollbar.
		// scrollLeft: Number
		// doc: Document?
		//		Optional document to query.   If unspecified, use win.doc.
		// returns: Number

		// In RTL direction, scrollLeft should be a negative value, but IE
		// returns a positive one. All codes using documentElement.scrollLeft
		// must call this function to fix this error, otherwise the position
		// will offset to right when there is a horizontal scrollbar.

		doc = doc || win.doc;
		var ie = has("ie");
		if(ie && !geom.isBodyLtr(doc)){
			var qk = has("quirks"),
				de = qk ? win.body(doc) : doc.documentElement,
				pwin = win.global;	// TODO: use winUtils.get(doc) after resolving circular dependency b/w dom-geometry.js and dojo/window.js
			if(ie == 6 && !qk && pwin.frameElement && de.scrollHeight > de.clientHeight){
				scrollLeft += de.clientLeft; // workaround ie6+strict+rtl+iframe+vertical-scrollbar bug where clientWidth is too small by clientLeft pixels
			}
			return (ie < 8 || qk) ? (scrollLeft + de.clientWidth - de.scrollWidth) : -scrollLeft; // Integer
		}
		return scrollLeft; // Integer
	};

	geom.position = function(/*DomNode*/ node, /*Boolean?*/ includeScroll){
		// summary:
		//		Gets the position and size of the passed element relative to
		//		the viewport (if includeScroll==false), or relative to the
		//		document root (if includeScroll==true).
		//
		// description:
		//		Returns an object of the form:
		//		`{ x: 100, y: 300, w: 20, h: 15 }`.
		//		If includeScroll==true, the x and y values will include any
		//		document offsets that may affect the position relative to the
		//		viewport.
		//		Uses the border-box model (inclusive of border and padding but
		//		not margin).  Does not act as a setter.
		// node: DOMNode|String
		// includeScroll: Boolean?
		// returns: Object

		node = dom.byId(node);
		var	db = win.body(node.ownerDocument),
			ret = node.getBoundingClientRect();
		ret = {x: ret.left, y: ret.top, w: ret.right - ret.left, h: ret.bottom - ret.top};

		if(has("ie") < 9){
			// On IE<9 there's a 2px offset that we need to adjust for, see dojo.getIeDocumentElementOffset()
			var offset = geom.getIeDocumentElementOffset(node.ownerDocument);

			// fixes the position in IE, quirks mode
			ret.x -= offset.x + (has("quirks") ? db.clientLeft + db.offsetLeft : 0);
			ret.y -= offset.y + (has("quirks") ? db.clientTop + db.offsetTop : 0);
		}

		// account for document scrolling
		// if offsetParent is used, ret value already includes scroll position
		// so we may have to actually remove that value if !includeScroll
		if(includeScroll){
			var scroll = geom.docScroll(node.ownerDocument);
			ret.x += scroll.x;
			ret.y += scroll.y;
		}

		return ret; // Object
	};

	// random "private" functions wildly used throughout the toolkit

	geom.getMarginSize = function getMarginSize(/*DomNode*/ node, /*Object*/ computedStyle){
		// summary:
		//		returns an object that encodes the width and height of
		//		the node's margin box
		// node: DOMNode|String
		// computedStyle: Object?
		//		This parameter accepts computed styles object.
		//		If this parameter is omitted, the functions will call
		//		dojo/dom-style.getComputedStyle to get one. It is a better way, calling
		//		dojo/dom-style.getComputedStyle once, and then pass the reference to this
		//		computedStyle parameter. Wherever possible, reuse the returned
		//		object of dojo/dom-style.getComputedStyle().

		node = dom.byId(node);
		var me = geom.getMarginExtents(node, computedStyle || style.getComputedStyle(node));
		var size = node.getBoundingClientRect();
		return {
			w: (size.right - size.left) + me.w,
			h: (size.bottom - size.top) + me.h
		};
	};

	geom.normalizeEvent = function(event){
		// summary:
		//		Normalizes the geometry of a DOM event, normalizing the pageX, pageY,
		//		offsetX, offsetY, layerX, and layerX properties
		// event: Object
		if(!("layerX" in event)){
			event.layerX = event.offsetX;
			event.layerY = event.offsetY;
		}
		if(!has("dom-addeventlistener")){
			// old IE version
			// FIXME: scroll position query is duped from dojo/_base/html to
			// avoid dependency on that entire module. Now that HTML is in
			// Base, we should convert back to something similar there.
			var se = event.target;
			var doc = (se && se.ownerDocument) || document;
			// DO NOT replace the following to use dojo/_base/window.body(), in IE, document.documentElement should be used
			// here rather than document.body
			var docBody = has("quirks") ? doc.body : doc.documentElement;
			var offset = geom.getIeDocumentElementOffset(doc);
			event.pageX = event.clientX + geom.fixIeBiDiScrollLeft(docBody.scrollLeft || 0, doc) - offset.x;
			event.pageY = event.clientY + (docBody.scrollTop || 0) - offset.y;
		}
	};

	// TODO: evaluate separate getters/setters for position and sizes?

	return geom;
});

},
'dojo/mouse':function(){
define(["./_base/kernel", "./on", "./has", "./dom", "./_base/window"], function(dojo, on, has, dom, win){

	// module:
	//		dojo/mouse

    has.add("dom-quirks", win.doc && win.doc.compatMode == "BackCompat");
	has.add("events-mouseenter", win.doc && "onmouseenter" in win.doc.createElement("div"));
	has.add("events-mousewheel", win.doc && 'onmousewheel' in win.doc);

	var mouseButtons;
	if((has("dom-quirks") && has("ie")) || !has("dom-addeventlistener")){
		mouseButtons = {
			LEFT:   1,
			MIDDLE: 4,
			RIGHT:  2,
			// helper functions
			isButton: function(e, button){ return e.button & button; },
			isLeft:   function(e){ return e.button & 1; },
			isMiddle: function(e){ return e.button & 4; },
			isRight:  function(e){ return e.button & 2; }
		};
	}else{
		mouseButtons = {
			LEFT:   0,
			MIDDLE: 1,
			RIGHT:  2,
			// helper functions
			isButton: function(e, button){ return e.button == button; },
			isLeft:   function(e){ return e.button == 0; },
			isMiddle: function(e){ return e.button == 1; },
			isRight:  function(e){ return e.button == 2; }
		};
	}
	dojo.mouseButtons = mouseButtons;

/*=====
	dojo.mouseButtons = {
		// LEFT: Number
		//		Numeric value of the left mouse button for the platform.
		LEFT:   0,
		// MIDDLE: Number
		//		Numeric value of the middle mouse button for the platform.
		MIDDLE: 1,
		// RIGHT: Number
		//		Numeric value of the right mouse button for the platform.
		RIGHT:  2,

		isButton: function(e, button){
			// summary:
			//		Checks an event object for a pressed button
			// e: Event
			//		Event object to examine
			// button: Number
			//		The button value (example: dojo.mouseButton.LEFT)
			return e.button == button; // Boolean
		},
		isLeft: function(e){
			// summary:
			//		Checks an event object for the pressed left button
			// e: Event
			//		Event object to examine
			return e.button == 0; // Boolean
		},
		isMiddle: function(e){
			// summary:
			//		Checks an event object for the pressed middle button
			// e: Event
			//		Event object to examine
			return e.button == 1; // Boolean
		},
		isRight: function(e){
			// summary:
			//		Checks an event object for the pressed right button
			// e: Event
			//		Event object to examine
			return e.button == 2; // Boolean
		}
	};
=====*/

	function eventHandler(type, selectHandler){
		// emulation of mouseenter/leave with mouseover/out using descendant checking
		var handler = function(node, listener){
			return on(node, type, function(evt){
				if(selectHandler){
					return selectHandler(evt, listener);
				}
				if(!dom.isDescendant(evt.relatedTarget, node)){
					return listener.call(this, evt);
				}
			});
		};
		handler.bubble = function(select){
			return eventHandler(type, function(evt, listener){
				// using a selector, use the select function to determine if the mouse moved inside the selector and was previously outside the selector
				var target = select(evt.target);
				var relatedTarget = evt.relatedTarget;
				if(target && (target != (relatedTarget && relatedTarget.nodeType == 1 && select(relatedTarget)))){
					return listener.call(target, evt);
				} 
			});
		};
		return handler;
	}
	var wheel;
	if(has("events-mousewheel")){
		wheel = 'mousewheel';
	}else{ //firefox
		wheel = function(node, listener){
			return on(node, 'DOMMouseScroll', function(evt){
				evt.wheelDelta = -evt.detail;
				listener.call(this, evt);
			});
		};
	}
	return {
		// summary:
		//		This module provide mouse event handling utility functions and exports
		//		mouseenter and mouseleave event emulation.
		// example:
		//		To use these events, you register a mouseenter like this:
		//		|	define(["dojo/on", dojo/mouse"], function(on, mouse){
		//		|		on(targetNode, mouse.enter, function(event){
		//		|			dojo.addClass(targetNode, "highlighted");
		//		|		});
		//		|		on(targetNode, mouse.leave, function(event){
		//		|			dojo.removeClass(targetNode, "highlighted");
		//		|		});

		_eventHandler: eventHandler,		// for dojo/touch

		// enter: Synthetic Event
		//		This is an extension event for the mouseenter that IE provides, emulating the
		//		behavior on other browsers.
		enter: eventHandler("mouseover"),

		// leave: Synthetic Event
		//		This is an extension event for the mouseleave that IE provides, emulating the
		//		behavior on other browsers.
		leave: eventHandler("mouseout"),

		// wheel: Normalized Mouse Wheel Event
		//		This is an extension event for the mousewheel that non-Mozilla browsers provide,
		//		emulating the behavior on Mozilla based browsers.
		wheel: wheel,

		isLeft: mouseButtons.isLeft,
		/*=====
		isLeft: function(){
			// summary:
			//		Test an event object (from a mousedown event) to see if the left button was pressed.
		},
		=====*/

		isMiddle: mouseButtons.isMiddle,
		/*=====
		 isMiddle: function(){
			 // summary:
			 //		Test an event object (from a mousedown event) to see if the middle button was pressed.
		 },
		 =====*/

		isRight: mouseButtons.isRight
		/*=====
		 , isRight: function(){
			 // summary:
			 //		Test an event object (from a mousedown event) to see if the right button was pressed.
		 }
		 =====*/
	};
});

},
'dojo/keys':function(){
define(["./_base/kernel", "./sniff"], function(dojo, has){

	// module:
	//		dojo/keys

	return dojo.keys = {
		// summary:
		//		Definitions for common key values.  Client code should test keyCode against these named constants,
		//		as the actual codes can vary by browser.

		BACKSPACE: 8,
		TAB: 9,
		CLEAR: 12,
		ENTER: 13,
		SHIFT: 16,
		CTRL: 17,
		ALT: 18,
		META: has("webkit") ? 91 : 224,		// the apple key on macs
		PAUSE: 19,
		CAPS_LOCK: 20,
		ESCAPE: 27,
		SPACE: 32,
		PAGE_UP: 33,
		PAGE_DOWN: 34,
		END: 35,
		HOME: 36,
		LEFT_ARROW: 37,
		UP_ARROW: 38,
		RIGHT_ARROW: 39,
		DOWN_ARROW: 40,
		INSERT: 45,
		DELETE: 46,
		HELP: 47,
		LEFT_WINDOW: 91,
		RIGHT_WINDOW: 92,
		SELECT: 93,
		NUMPAD_0: 96,
		NUMPAD_1: 97,
		NUMPAD_2: 98,
		NUMPAD_3: 99,
		NUMPAD_4: 100,
		NUMPAD_5: 101,
		NUMPAD_6: 102,
		NUMPAD_7: 103,
		NUMPAD_8: 104,
		NUMPAD_9: 105,
		NUMPAD_MULTIPLY: 106,
		NUMPAD_PLUS: 107,
		NUMPAD_ENTER: 108,
		NUMPAD_MINUS: 109,
		NUMPAD_PERIOD: 110,
		NUMPAD_DIVIDE: 111,
		F1: 112,
		F2: 113,
		F3: 114,
		F4: 115,
		F5: 116,
		F6: 117,
		F7: 118,
		F8: 119,
		F9: 120,
		F10: 121,
		F11: 122,
		F12: 123,
		F13: 124,
		F14: 125,
		F15: 126,
		NUM_LOCK: 144,
		SCROLL_LOCK: 145,
		UP_DPAD: 175,
		DOWN_DPAD: 176,
		LEFT_DPAD: 177,
		RIGHT_DPAD: 178,
		// virtual key mapping
		copyKey: has("mac") && !has("air") ? (has("safari") ? 91 : 224 ) : 17
	};
});

},
'dojo/parser':function(){
define([
	"require", "./_base/kernel", "./_base/lang", "./_base/array", "./_base/config", "./dom", "./_base/window",
		"./_base/url", "./aspect", "./promise/all", "./date/stamp", "./Deferred", "./has", "./query", "./on", "./ready"
], function(require, dojo, dlang, darray, config, dom, dwindow, _Url, aspect, all, dates, Deferred, has, query, don, ready){

	// module:
	//		dojo/parser

	new Date("X"); // workaround for #11279, new Date("") == NaN

	// data-dojo-props etc. is not restricted to JSON, it can be any javascript
	function myEval(text){
		return eval("(" + text + ")");
	}

	// Widgets like BorderContainer add properties to _Widget via dojo.extend().
	// If BorderContainer is loaded after _Widget's parameter list has been cached,
	// we need to refresh that parameter list (for _Widget and all widgets that extend _Widget).
	var extendCnt = 0;
	aspect.after(dlang, "extend", function(){
		extendCnt++;
	}, true);

	function getNameMap(ctor){
		// summary:
		//		Returns map from lowercase name to attribute name in class, ex: {onclick: "onClick"}
		var map = ctor._nameCaseMap, proto = ctor.prototype;

		// Create the map if it's undefined.
		// Refresh the map if a superclass was possibly extended with new methods since the map was created.
		if(!map || map._extendCnt < extendCnt){
			map = ctor._nameCaseMap = {};
			for(var name in proto){
				if(name.charAt(0) === "_"){
					continue;
				}	// skip internal properties
				map[name.toLowerCase()] = name;
			}
			map._extendCnt = extendCnt;
		}
		return map;
	}

	// Map from widget name or list of widget names(ex: "dijit/form/Button,acme/MyMixin") to a constructor.
	var _ctorMap = {};

	function getCtor(/*String[]*/ types, /*Function?*/ contextRequire){
		// summary:
		//		Retrieves a constructor.  If the types array contains more than one class/MID then the
		//		subsequent classes will be mixed into the first class and a unique constructor will be
		//		returned for that array.

		var ts = types.join();
		if(!_ctorMap[ts]){
			var mixins = [];
			for(var i = 0, l = types.length; i < l; i++){
				var t = types[i];
				// TODO: Consider swapping getObject and require in the future
				mixins[mixins.length] = (_ctorMap[t] = _ctorMap[t] || (dlang.getObject(t) || (~t.indexOf('/') &&
					(contextRequire ? contextRequire(t) : require(t)))));
			}
			var ctor = mixins.shift();
			_ctorMap[ts] = mixins.length ? (ctor.createSubclass ? ctor.createSubclass(mixins) : ctor.extend.apply(ctor, mixins)) : ctor;
		}

		return _ctorMap[ts];
	}

	var parser = {
		// summary:
		//		The Dom/Widget parsing package

		_clearCache: function(){
			// summary:
			//		Clear cached data.   Used mainly for benchmarking.
			extendCnt++;
			_ctorMap = {};
		},

		_functionFromScript: function(script, attrData){
			// summary:
			//		Convert a `<script type="dojo/method" args="a, b, c"> ... </script>`
			//		into a function
			// script: DOMNode
			//		The `<script>` DOMNode
			// attrData: String
			//		For HTML5 compliance, searches for attrData + "args" (typically
			//		"data-dojo-args") instead of "args"
			var preamble = "",
				suffix = "",
				argsStr = (script.getAttribute(attrData + "args") || script.getAttribute("args")),
				withStr = script.getAttribute("with");

			// Convert any arguments supplied in script tag into an array to be passed to the
			var fnArgs = (argsStr || "").split(/\s*,\s*/);

			if(withStr && withStr.length){
				darray.forEach(withStr.split(/\s*,\s*/), function(part){
					preamble += "with(" + part + "){";
					suffix += "}";
				});
			}

			return new Function(fnArgs, preamble + script.innerHTML + suffix);
		},

		instantiate: function(nodes, mixin, options){
			// summary:
			//		Takes array of nodes, and turns them into class instances and
			//		potentially calls a startup method to allow them to connect with
			//		any children.
			// nodes: Array
			//		Array of DOM nodes
			// mixin: Object?
			//		An object that will be mixed in with each node in the array.
			//		Values in the mixin will override values in the node, if they
			//		exist.
			// options: Object?
			//		An object used to hold kwArgs for instantiation.
			//		See parse.options argument for details.
			// returns:
			//		Array of instances.

			mixin = mixin || {};
			options = options || {};

			var dojoType = (options.scope || dojo._scopeName) + "Type", // typically "dojoType"
				attrData = "data-" + (options.scope || dojo._scopeName) + "-", // typically "data-dojo-"
				dataDojoType = attrData + "type", // typically "data-dojo-type"
				dataDojoMixins = attrData + "mixins";					// typically "data-dojo-mixins"

			var list = [];
			darray.forEach(nodes, function(node){
				var type = dojoType in mixin ? mixin[dojoType] : node.getAttribute(dataDojoType) || node.getAttribute(dojoType);
				if(type){
					var mixinsValue = node.getAttribute(dataDojoMixins),
						types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];

					list.push({
						node: node,
						types: types
					});
				}
			});

			// Instantiate the nodes and return the list of instances.
			return this._instantiate(list, mixin, options);
		},

		_instantiate: function(nodes, mixin, options, returnPromise){
			// summary:
			//		Takes array of objects representing nodes, and turns them into class instances and
			//		potentially calls a startup method to allow them to connect with
			//		any children.
			// nodes: Array
			//		Array of objects like
			//	|		{
			//	|			ctor: Function (may be null)
			//	|			types: ["dijit/form/Button", "acme/MyMixin"] (used if ctor not specified)
			//	|			node: DOMNode,
			//	|			scripts: [ ... ],	// array of <script type="dojo/..."> children of node
			//	|			inherited: { ... }	// settings inherited from ancestors like dir, theme, etc.
			//	|		}
			// mixin: Object
			//		An object that will be mixed in with each node in the array.
			//		Values in the mixin will override values in the node, if they
			//		exist.
			// options: Object
			//		An options object used to hold kwArgs for instantiation.
			//		See parse.options argument for details.
			// returnPromise: Boolean
			//		Return a Promise rather than the instance; supports asynchronous widget creation.
			// returns:
			//		Array of instances, or if returnPromise is true, a promise for array of instances
			//		that resolves when instances have finished initializing.

			// Call widget constructors.   Some may be asynchronous and return promises.
			var thelist = darray.map(nodes, function(obj){
				var ctor = obj.ctor || getCtor(obj.types, options.contextRequire);
				// If we still haven't resolved a ctor, it is fatal now
				if(!ctor){
					throw new Error("Unable to resolve constructor for: '" + obj.types.join() + "'");
				}
				return this.construct(ctor, obj.node, mixin, options, obj.scripts, obj.inherited);
			}, this);

			// After all widget construction finishes, call startup on each top level instance if it makes sense (as for
			// widgets).  Parent widgets will recursively call startup on their (non-top level) children
			function onConstruct(thelist){
				if(!mixin._started && !options.noStart){
					darray.forEach(thelist, function(instance){
						if(typeof instance.startup === "function" && !instance._started){
							instance.startup();
						}
					});
				}

				return thelist;
			}

			if(returnPromise){
				return all(thelist).then(onConstruct);
			}else{
				// Back-compat path, remove for 2.0
				return onConstruct(thelist);
			}
		},

		construct: function(ctor, node, mixin, options, scripts, inherited){
			// summary:
			//		Calls new ctor(params, node), where params is the hash of parameters specified on the node,
			//		excluding data-dojo-type and data-dojo-mixins.   Does not call startup().
			// ctor: Function
			//		Widget constructor.
			// node: DOMNode
			//		This node will be replaced/attached to by the widget.  It also specifies the arguments to pass to ctor.
			// mixin: Object?
			//		Attributes in this object will be passed as parameters to ctor,
			//		overriding attributes specified on the node.
			// options: Object?
			//		An options object used to hold kwArgs for instantiation.   See parse.options argument for details.
			// scripts: DomNode[]?
			//		Array of `<script type="dojo/*">` DOMNodes.  If not specified, will search for `<script>` tags inside node.
			// inherited: Object?
			//		Settings from dir=rtl or lang=... on a node above this node.   Overrides options.inherited.
			// returns:
			//		Instance or Promise for the instance, if markupFactory() itself returned a promise

			var proto = ctor && ctor.prototype;
			options = options || {};

			// Setup hash to hold parameter settings for this widget.	Start with the parameter
			// settings inherited from ancestors ("dir" and "lang").
			// Inherited setting may later be overridden by explicit settings on node itself.
			var params = {};

			if(options.defaults){
				// settings for the document itself (or whatever subtree is being parsed)
				dlang.mixin(params, options.defaults);
			}
			if(inherited){
				// settings from dir=rtl or lang=... on a node above this node
				dlang.mixin(params, inherited);
			}

			// Get list of attributes explicitly listed in the markup
			var attributes;
			if(has("dom-attributes-explicit")){
				// Standard path to get list of user specified attributes
				attributes = node.attributes;
			}else if(has("dom-attributes-specified-flag")){
				// Special processing needed for IE8, to skip a few faux values in attributes[]
				attributes = darray.filter(node.attributes, function(a){
					return a.specified;
				});
			}else{
				// Special path for IE6-7, avoid (sometimes >100) bogus entries in node.attributes
				var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false),
					attrs = clone.outerHTML.replace(/=[^\s"']+|="[^"]*"|='[^']*'/g, "").replace(/^\s*<[a-zA-Z0-9]*\s*/, "").replace(/\s*>.*$/, "");

				attributes = darray.map(attrs.split(/\s+/), function(name){
					var lcName = name.toLowerCase();
					return {
						name: name,
						// getAttribute() doesn't work for button.value, returns innerHTML of button.
						// but getAttributeNode().value doesn't work for the form.encType or li.value
						value: (node.nodeName == "LI" && name == "value") || lcName == "enctype" ?
							node.getAttribute(lcName) : node.getAttributeNode(lcName).value
					};
				});
			}

			// Hash to convert scoped attribute name (ex: data-dojo17-params) to something friendly (ex: data-dojo-params)
			// TODO: remove scope for 2.0
			var scope = options.scope || dojo._scopeName,
				attrData = "data-" + scope + "-", // typically "data-dojo-"
				hash = {};
			if(scope !== "dojo"){
				hash[attrData + "props"] = "data-dojo-props";
				hash[attrData + "type"] = "data-dojo-type";
				hash[attrData + "mixins"] = "data-dojo-mixins";
				hash[scope + "type"] = "dojoType";
				hash[attrData + "id"] = "data-dojo-id";
			}

			// Read in attributes and process them, including data-dojo-props, data-dojo-type,
			// dojoAttachPoint, etc., as well as normal foo=bar attributes.
			var i = 0, item, funcAttrs = [], jsname, extra;
			while(item = attributes[i++]){
				var name = item.name,
					lcName = name.toLowerCase(),
					value = item.value;

				switch(hash[lcName] || lcName){
				// Already processed, just ignore
				case "data-dojo-type":
				case "dojotype":
				case "data-dojo-mixins":
					break;

				// Data-dojo-props.   Save for later to make sure it overrides direct foo=bar settings
				case "data-dojo-props":
					extra = value;
					break;

				// data-dojo-id or jsId. TODO: drop jsId in 2.0
				case "data-dojo-id":
				case "jsid":
					jsname = value;
					break;

				// For the benefit of _Templated
				case "data-dojo-attach-point":
				case "dojoattachpoint":
					params.dojoAttachPoint = value;
					break;
				case "data-dojo-attach-event":
				case "dojoattachevent":
					params.dojoAttachEvent = value;
					break;

				// Special parameter handling needed for IE
				case "class":
					params["class"] = node.className;
					break;
				case "style":
					params["style"] = node.style && node.style.cssText;
					break;
				default:
					// Normal attribute, ex: value="123"

					// Find attribute in widget corresponding to specified name.
					// May involve case conversion, ex: onclick --> onClick
					if(!(name in proto)){
						var map = getNameMap(ctor);
						name = map[lcName] || name;
					}

					// Set params[name] to value, doing type conversion
					if(name in proto){
						switch(typeof proto[name]){
						case "string":
							params[name] = value;
							break;
						case "number":
							params[name] = value.length ? Number(value) : NaN;
							break;
						case "boolean":
							// for checked/disabled value might be "" or "checked".	 interpret as true.
							params[name] = value.toLowerCase() != "false";
							break;
						case "function":
							if(value === "" || value.search(/[^\w\.]+/i) != -1){
								// The user has specified some text for a function like "return x+5"
								params[name] = new Function(value);
							}else{
								// The user has specified the name of a global function like "myOnClick"
								// or a single word function "return"
								params[name] = dlang.getObject(value, false) || new Function(value);
							}
							funcAttrs.push(name);	// prevent "double connect", see #15026
							break;
						default:
							var pVal = proto[name];
							params[name] =
								(pVal && "length" in pVal) ? (value ? value.split(/\s*,\s*/) : []) :	// array
									(pVal instanceof Date) ?
										(value == "" ? new Date("") :	// the NaN of dates
										value == "now" ? new Date() :	// current date
										dates.fromISOString(value)) :
								(pVal instanceof _Url) ? (dojo.baseUrl + value) :
								myEval(value);
						}
					}else{
						params[name] = value;
					}
				}
			}

			// Remove function attributes from DOMNode to prevent "double connect" problem, see #15026.
			// Do this as a separate loop since attributes[] is often a live collection (depends on the browser though).
			for(var j = 0; j < funcAttrs.length; j++){
				var lcfname = funcAttrs[j].toLowerCase();
				node.removeAttribute(lcfname);
				node[lcfname] = null;
			}

			// Mix things found in data-dojo-props into the params, overriding any direct settings
			if(extra){
				try{
					extra = myEval.call(options.propsThis, "{" + extra + "}");
					dlang.mixin(params, extra);
				}catch(e){
					// give the user a pointer to their invalid parameters. FIXME: can we kill this in production?
					throw new Error(e.toString() + " in data-dojo-props='" + extra + "'");
				}
			}

			// Any parameters specified in "mixin" override everything else.
			dlang.mixin(params, mixin);

			// Get <script> nodes associated with this widget, if they weren't specified explicitly
			if(!scripts){
				scripts = (ctor && (ctor._noScript || proto._noScript) ? [] : query("> script[type^='dojo/']", node));
			}

			// Process <script type="dojo/*"> script tags
			// <script type="dojo/method" data-dojo-event="foo"> tags are added to params, and passed to
			// the widget on instantiation.
			// <script type="dojo/method"> tags (with no event) are executed after instantiation
			// <script type="dojo/connect" data-dojo-event="foo"> tags are dojo.connected after instantiation,
			// and likewise with <script type="dojo/aspect" data-dojo-method="foo">
			// <script type="dojo/watch" data-dojo-prop="foo"> tags are dojo.watch after instantiation
			// <script type="dojo/on" data-dojo-event="foo"> tags are dojo.on after instantiation
			// note: dojo/* script tags cannot exist in self closing widgets, like <input />
			var aspects = [],	// aspects to connect after instantiation
				calls = [],		// functions to call after instantiation
				watches = [],  // functions to watch after instantiation
				ons = []; // functions to on after instantiation

			if(scripts){
				for(i = 0; i < scripts.length; i++){
					var script = scripts[i];
					node.removeChild(script);
					// FIXME: drop event="" support in 2.0. use data-dojo-event="" instead
					var event = (script.getAttribute(attrData + "event") || script.getAttribute("event")),
						prop = script.getAttribute(attrData + "prop"),
						method = script.getAttribute(attrData + "method"),
						advice = script.getAttribute(attrData + "advice"),
						scriptType = script.getAttribute("type"),
						nf = this._functionFromScript(script, attrData);
					if(event){
						if(scriptType == "dojo/connect"){
							aspects.push({ method: event, func: nf });
						}else if(scriptType == "dojo/on"){
							ons.push({ event: event, func: nf });
						}else{
							// <script type="dojo/method" data-dojo-event="foo">
							// TODO for 2.0: use data-dojo-method="foo" instead (also affects dijit/Declaration)
							params[event] = nf;
						}
					}else if(scriptType == "dojo/aspect"){
						aspects.push({ method: method, advice: advice, func: nf });
					}else if(scriptType == "dojo/watch"){
						watches.push({ prop: prop, func: nf });
					}else{
						calls.push(nf);
					}
				}
			}

			// create the instance
			var markupFactory = ctor.markupFactory || proto.markupFactory;
			var instance = markupFactory ? markupFactory(params, node, ctor) : new ctor(params, node);

			function onInstantiate(instance){
				// map it to the JS namespace if that makes sense
				if(jsname){
					dlang.setObject(jsname, instance);
				}

				// process connections and startup functions
				for(i = 0; i < aspects.length; i++){
					aspect[aspects[i].advice || "after"](instance, aspects[i].method, dlang.hitch(instance, aspects[i].func), true);
				}
				for(i = 0; i < calls.length; i++){
					calls[i].call(instance);
				}
				for(i = 0; i < watches.length; i++){
					instance.watch(watches[i].prop, watches[i].func);
				}
				for(i = 0; i < ons.length; i++){
					don(instance, ons[i].event, ons[i].func);
				}

				return instance;
			}

			if(instance.then){
				return instance.then(onInstantiate);
			}else{
				return onInstantiate(instance);
			}
		},

		scan: function(root, options){
			// summary:
			//		Scan a DOM tree and return an array of objects representing the DOMNodes
			//		that need to be turned into widgets.
			// description:
			//		Search specified node (or document root node) recursively for class instances
			//		and return an array of objects that represent potential widgets to be
			//		instantiated. Searches for either data-dojo-type="MID" or dojoType="MID" where
			//		"MID" is a module ID like "dijit/form/Button" or a fully qualified Class name
			//		like "dijit/form/Button".  If the MID is not currently available, scan will
			//		attempt to require() in the module.
			//
			//		See parser.parse() for details of markup.
			// root: DomNode?
			//		A default starting root node from which to start the parsing. Can be
			//		omitted, defaulting to the entire document. If omitted, the `options`
			//		object can be passed in this place. If the `options` object has a
			//		`rootNode` member, that is used.
			// options: Object
			//		a kwArgs options object, see parse() for details
			//
			// returns: Promise
			//		A promise that is resolved with the nodes that have been parsed.

			var list = [], // Output List
				mids = [], // An array of modules that are not yet loaded
				midsHash = {}; // Used to keep the mids array unique

			var dojoType = (options.scope || dojo._scopeName) + "Type", // typically "dojoType"
				attrData = "data-" + (options.scope || dojo._scopeName) + "-", // typically "data-dojo-"
				dataDojoType = attrData + "type", // typically "data-dojo-type"
				dataDojoTextDir = attrData + "textdir", // typically "data-dojo-textdir"
				dataDojoMixins = attrData + "mixins";					// typically "data-dojo-mixins"

			// Info on DOMNode currently being processed
			var node = root.firstChild;

			// Info on parent of DOMNode currently being processed
			//	- inherited: dir, lang, and textDir setting of parent, or inherited by parent
			//	- parent: pointer to identical structure for my parent (or null if no parent)
			//	- scripts: if specified, collects <script type="dojo/..."> type nodes from children
			var inherited = options.inherited;
			if(!inherited){
				function findAncestorAttr(node, attr){
					return (node.getAttribute && node.getAttribute(attr)) ||
						(node.parentNode && findAncestorAttr(node.parentNode, attr));
				}

				inherited = {
					dir: findAncestorAttr(root, "dir"),
					lang: findAncestorAttr(root, "lang"),
					textDir: findAncestorAttr(root, dataDojoTextDir)
				};
				for(var key in inherited){
					if(!inherited[key]){
						delete inherited[key];
					}
				}
			}

			// Metadata about parent node
			var parent = {
				inherited: inherited
			};

			// For collecting <script type="dojo/..."> type nodes (when null, we don't need to collect)
			var scripts;

			// when true, only look for <script type="dojo/..."> tags, and don't recurse to children
			var scriptsOnly;

			function getEffective(parent){
				// summary:
				//		Get effective dir, lang, textDir settings for specified obj
				//		(matching "parent" object structure above), and do caching.
				//		Take care not to return null entries.
				if(!parent.inherited){
					parent.inherited = {};
					var node = parent.node,
						grandparent = getEffective(parent.parent);
					var inherited = {
						dir: node.getAttribute("dir") || grandparent.dir,
						lang: node.getAttribute("lang") || grandparent.lang,
						textDir: node.getAttribute(dataDojoTextDir) || grandparent.textDir
					};
					for(var key in inherited){
						if(inherited[key]){
							parent.inherited[key] = inherited[key];
						}
					}
				}
				return parent.inherited;
			}

			// DFS on DOM tree, collecting nodes with data-dojo-type specified.
			while(true){
				if(!node){
					// Finished this level, continue to parent's next sibling
					if(!parent || !parent.node){
						break;
					}
					node = parent.node.nextSibling;
					scriptsOnly = false;
					parent = parent.parent;
					scripts = parent.scripts;
					continue;
				}

				if(node.nodeType != 1){
					// Text or comment node, skip to next sibling
					node = node.nextSibling;
					continue;
				}

				if(scripts && node.nodeName.toLowerCase() == "script"){
					// Save <script type="dojo/..."> for parent, then continue to next sibling
					type = node.getAttribute("type");
					if(type && /^dojo\/\w/i.test(type)){
						scripts.push(node);
					}
					node = node.nextSibling;
					continue;
				}
				if(scriptsOnly){
					// scriptsOnly flag is set, we have already collected scripts if the parent wants them, so now we shouldn't
					// continue further analysis of the node and will continue to the next sibling
					node = node.nextSibling;
					continue;
				}

				// Check for data-dojo-type attribute, fallback to backward compatible dojoType
				// TODO: Remove dojoType in 2.0
				var type = node.getAttribute(dataDojoType) || node.getAttribute(dojoType);

				// Short circuit for leaf nodes containing nothing [but text]
				var firstChild = node.firstChild;
				if(!type && (!firstChild || (firstChild.nodeType == 3 && !firstChild.nextSibling))){
					node = node.nextSibling;
					continue;
				}

				// Meta data about current node
				var current;

				var ctor = null;
				if(type){
					// If dojoType/data-dojo-type specified, add to output array of nodes to instantiate.
					var mixinsValue = node.getAttribute(dataDojoMixins),
						types = mixinsValue ? [type].concat(mixinsValue.split(/\s*,\s*/)) : [type];

					// Note: won't find classes declared via dojo/Declaration or any modules that haven't been
					// loaded yet so use try/catch to avoid throw from require()
					try{
						ctor = getCtor(types, options.contextRequire);
					}catch(e){}

					// If the constructor was not found, check to see if it has modules that can be loaded
					if(!ctor){
						darray.forEach(types, function(t){
							if(~t.indexOf('/') && !midsHash[t]){
								// If the type looks like a MID and it currently isn't in the array of MIDs to load, add it.
								midsHash[t] = true;
								mids[mids.length] = t;
							}
						});
					}

					var childScripts = ctor && !ctor.prototype._noScript ? [] : null; // <script> nodes that are parent's children

					// Setup meta data about this widget node, and save it to list of nodes to instantiate
					current = {
						types: types,
						ctor: ctor,
						parent: parent,
						node: node,
						scripts: childScripts
					};
					current.inherited = getEffective(current); // dir & lang settings for current node, explicit or inherited
					list.push(current);
				}else{
					// Meta data about this non-widget node
					current = {
						node: node,
						scripts: scripts,
						parent: parent
					};
				}

				// Recurse, collecting <script type="dojo/..."> children, and also looking for
				// descendant nodes with dojoType specified (unless the widget has the stopParser flag).
				// When finished with children, go to my next sibling.
				scripts = childScripts;
				scriptsOnly = node.stopParser || (ctor && ctor.prototype.stopParser && !(options.template));
				parent = current;
				node = firstChild;
			}

			var d = new Deferred();

			// If there are modules to load then require them in
			if(mids.length){
				// Warn that there are modules being auto-required
				if(has("dojo-debug-messages")){
					console.warn("WARNING: Modules being Auto-Required: " + mids.join(", "));
				}
				var r = options.contextRequire || require;
				r(mids, function(){
					// Go through list of widget nodes, filling in missing constructors, and filtering out nodes that shouldn't
					// be instantiated due to a stopParser flag on an ancestor that we belatedly learned about due to
					// auto-require of a module like ContentPane.   Assumes list is in DFS order.
					d.resolve(darray.filter(list, function(widget){
						if(!widget.ctor){
							// Attempt to find the constructor again.   Still won't find classes defined via
							// dijit/Declaration so need to try/catch.
							try{
								widget.ctor = getCtor(widget.types, options.contextRequire);
							}catch(e){}
						}

						// Get the parent widget
						var parent = widget.parent;
						while(parent && !parent.types){
							parent = parent.parent;
						}

						// Return false if this node should be skipped due to stopParser on an ancestor.
						// Since list[] is in DFS order, this loop will always set parent.instantiateChildren before
						// trying to compute widget.instantiate.
						var proto = widget.ctor && widget.ctor.prototype;
						widget.instantiateChildren = !(proto && proto.stopParser && !(options.template));
						widget.instantiate = !parent || (parent.instantiate && parent.instantiateChildren);
						return widget.instantiate;
					}));
				});
			}else{
				// There were no modules to load, so just resolve with the parsed nodes.   This separate code path is for
				// efficiency, to avoid running the require() and the callback code above.
				d.resolve(list);
			}

			// Return the promise
			return d.promise;
		},

		_require: function(/*DOMNode*/ script, /*Object?*/ options){
			// summary:
			//		Helper for _scanAMD().  Takes a `<script type=dojo/require>bar: "acme/bar", ...</script>` node,
			//		calls require() to load the specified modules and (asynchronously) assign them to the specified global
			//		variables, and returns a Promise for when that operation completes.
			//
			//		In the example above, it is effectively doing a require(["acme/bar", ...], function(a){ bar = a; }).

			var hash = myEval("{" + script.innerHTML + "}"), // can't use dojo/json::parse() because maybe no quotes
				vars = [],
				mids = [],
				d = new Deferred();

			var contextRequire = (options && options.contextRequire) || require;

			for(var name in hash){
				vars.push(name);
				mids.push(hash[name]);
			}

			contextRequire(mids, function(){
				for(var i = 0; i < vars.length; i++){
					dlang.setObject(vars[i], arguments[i]);
				}
				d.resolve(arguments);
			});

			return d.promise;
		},

		_scanAmd: function(root, options){
			// summary:
			//		Scans the DOM for any declarative requires and returns their values.
			// description:
			//		Looks for `<script type=dojo/require>bar: "acme/bar", ...</script>` node, calls require() to load the
			//		specified modules and (asynchronously) assign them to the specified global variables,
			//		and returns a Promise for when those operations complete.
			// root: DomNode
			//		The node to base the scan from.
			// options: Object?
			//		a kwArgs options object, see parse() for details

			// Promise that resolves when all the <script type=dojo/require> nodes have finished loading.
			var deferred = new Deferred(),
				promise = deferred.promise;
			deferred.resolve(true);

			var self = this;
			query("script[type='dojo/require']", root).forEach(function(node){
				// Fire off require() call for specified modules.  Chain this require to fire after
				// any previous requires complete, so that layers can be loaded before individual module require()'s fire.
				promise = promise.then(function(){
					return self._require(node, options);
				});

				// Remove from DOM so it isn't seen again
				node.parentNode.removeChild(node);
			});

			return promise;
		},

		parse: function(rootNode, options){
			// summary:
			//		Scan the DOM for class instances, and instantiate them.
			// description:
			//		Search specified node (or root node) recursively for class instances,
			//		and instantiate them. Searches for either data-dojo-type="Class" or
			//		dojoType="Class" where "Class" is a a fully qualified class name,
			//		like `dijit/form/Button`
			//
			//		Using `data-dojo-type`:
			//		Attributes using can be mixed into the parameters used to instantiate the
			//		Class by using a `data-dojo-props` attribute on the node being converted.
			//		`data-dojo-props` should be a string attribute to be converted from JSON.
			//
			//		Using `dojoType`:
			//		Attributes are read from the original domNode and converted to appropriate
			//		types by looking up the Class prototype values. This is the default behavior
			//		from Dojo 1.0 to Dojo 1.5. `dojoType` support is deprecated, and will
			//		go away in Dojo 2.0.
			// rootNode: DomNode?
			//		A default starting root node from which to start the parsing. Can be
			//		omitted, defaulting to the entire document. If omitted, the `options`
			//		object can be passed in this place. If the `options` object has a
			//		`rootNode` member, that is used.
			// options: Object?
			//		A hash of options.
			//
			//		- noStart: Boolean?:
			//			when set will prevent the parser from calling .startup()
			//			when locating the nodes.
			//		- rootNode: DomNode?:
			//			identical to the function's `rootNode` argument, though
			//			allowed to be passed in via this `options object.
			//		- template: Boolean:
			//			If true, ignores ContentPane's stopParser flag and parses contents inside of
			//			a ContentPane inside of a template.   This allows dojoAttachPoint on widgets/nodes
			//			nested inside the ContentPane to work.
			//		- inherited: Object:
			//			Hash possibly containing dir and lang settings to be applied to
			//			parsed widgets, unless there's another setting on a sub-node that overrides
			//		- scope: String:
			//			Root for attribute names to search for.   If scopeName is dojo,
			//			will search for data-dojo-type (or dojoType).   For backwards compatibility
			//			reasons defaults to dojo._scopeName (which is "dojo" except when
			//			multi-version support is used, when it will be something like dojo16, dojo20, etc.)
			//		- propsThis: Object:
			//			If specified, "this" referenced from data-dojo-props will refer to propsThis.
			//			Intended for use from the widgets-in-template feature of `dijit._WidgetsInTemplateMixin`
			//		- contextRequire: Function:
			//			If specified, this require is utilised for looking resolving modules instead of the
			//			`dojo/parser` context `require()`.  Intended for use from the widgets-in-template feature of
			//			`dijit._WidgetsInTemplateMixin`.
			// returns: Mixed
			//		Returns a blended object that is an array of the instantiated objects, but also can include
			//		a promise that is resolved with the instantiated objects.  This is done for backwards
			//		compatibility.  If the parser auto-requires modules, it will always behave in a promise
			//		fashion and `parser.parse().then(function(instances){...})` should be used.
			// example:
			//		Parse all widgets on a page:
			//	|		parser.parse();
			// example:
			//		Parse all classes within the node with id="foo"
			//	|		parser.parse(dojo.byId('foo'));
			// example:
			//		Parse all classes in a page, but do not call .startup() on any
			//		child
			//	|		parser.parse({ noStart: true })
			// example:
			//		Parse all classes in a node, but do not call .startup()
			//	|		parser.parse(someNode, { noStart:true });
			//	|		// or
			//	|		parser.parse({ noStart:true, rootNode: someNode });

			// determine the root node and options based on the passed arguments.
			var root;
			if(!options && rootNode && rootNode.rootNode){
				options = rootNode;
				root = options.rootNode;
			}else if(rootNode && dlang.isObject(rootNode) && !("nodeType" in rootNode)){
				options = rootNode;
			}else{
				root = rootNode;
			}
			root = root ? dom.byId(root) : dwindow.body();

			options = options || {};

			var mixin = options.template ? { template: true } : {},
				instances = [],
				self = this;

			// First scan for any <script type=dojo/require> nodes, and execute.
			// Then scan for all nodes with data-dojo-type, and load any unloaded modules.
			// Then build the object instances.  Add instances to already existing (but empty) instances[] array,
			// which may already have been returned to caller.  Also, use otherwise to collect and throw any errors
			// that occur during the parse().
			var p =
				this._scanAmd(root, options).then(function(){
					return self.scan(root, options);
				}).then(function(parsedNodes){
					return self._instantiate(parsedNodes, mixin, options, true);
				}).then(function(_instances){
					// Copy the instances into the instances[] array we declared above, and are accessing as
					// our return value.
					return instances = instances.concat(_instances);
				}).otherwise(function(e){
					// TODO Modify to follow better pattern for promise error management when available
					console.error("dojo/parser::parse() error", e);
					throw e;
				});

			// Blend the array with the promise
			dlang.mixin(instances, p);
			return instances;
		}
	};

	if( 1 ){
		dojo.parser = parser;
	}

	// Register the parser callback. It should be the first callback
	// after the a11y test.
	if(config.parseOnLoad){
		ready(100, parser, "parse");
	}

	return parser;
});

},
'dojo/_base/url':function(){
define(["./kernel"], function(dojo){
	// module:
	//		dojo/url

	var
		ore = new RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?$"),
		ire = new RegExp("^((([^\\[:]+):)?([^@]+)@)?(\\[([^\\]]+)\\]|([^\\[:]*))(:([0-9]+))?$"),
		_Url = function(){
			var n = null,
				_a = arguments,
				uri = [_a[0]];
			// resolve uri components relative to each other
			for(var i = 1; i<_a.length; i++){
				if(!_a[i]){ continue; }

				// Safari doesn't support this.constructor so we have to be explicit
				// FIXME: Tracked (and fixed) in Webkit bug 3537.
				//		http://bugs.webkit.org/show_bug.cgi?id=3537
				var relobj = new _Url(_a[i]+""),
					uriobj = new _Url(uri[0]+"");

				if(
					relobj.path == "" &&
					!relobj.scheme &&
					!relobj.authority &&
					!relobj.query
				){
					if(relobj.fragment != n){
						uriobj.fragment = relobj.fragment;
					}
					relobj = uriobj;
				}else if(!relobj.scheme){
					relobj.scheme = uriobj.scheme;

					if(!relobj.authority){
						relobj.authority = uriobj.authority;

						if(relobj.path.charAt(0) != "/"){
							var path = uriobj.path.substring(0,
								uriobj.path.lastIndexOf("/") + 1) + relobj.path;

							var segs = path.split("/");
							for(var j = 0; j < segs.length; j++){
								if(segs[j] == "."){
									// flatten "./" references
									if(j == segs.length - 1){
										segs[j] = "";
									}else{
										segs.splice(j, 1);
										j--;
									}
								}else if(j > 0 && !(j == 1 && segs[0] == "") &&
									segs[j] == ".." && segs[j-1] != ".."){
									// flatten "../" references
									if(j == (segs.length - 1)){
										segs.splice(j, 1);
										segs[j - 1] = "";
									}else{
										segs.splice(j - 1, 2);
										j -= 2;
									}
								}
							}
							relobj.path = segs.join("/");
						}
					}
				}

				uri = [];
				if(relobj.scheme){
					uri.push(relobj.scheme, ":");
				}
				if(relobj.authority){
					uri.push("//", relobj.authority);
				}
				uri.push(relobj.path);
				if(relobj.query){
					uri.push("?", relobj.query);
				}
				if(relobj.fragment){
					uri.push("#", relobj.fragment);
				}
			}

			this.uri = uri.join("");

			// break the uri into its main components
			var r = this.uri.match(ore);

			this.scheme = r[2] || (r[1] ? "" : n);
			this.authority = r[4] || (r[3] ? "" : n);
			this.path = r[5]; // can never be undefined
			this.query = r[7] || (r[6] ? "" : n);
			this.fragment	 = r[9] || (r[8] ? "" : n);

			if(this.authority != n){
				// server based naming authority
				r = this.authority.match(ire);

				this.user = r[3] || n;
				this.password = r[4] || n;
				this.host = r[6] || r[7]; // ipv6 || ipv4
				this.port = r[9] || n;
			}
		};
	_Url.prototype.toString = function(){ return this.uri; };

	return dojo._Url = _Url;
});

},
'dojo/promise/all':function(){
define([
	"../_base/array",
	"../Deferred",
	"../when"
], function(array, Deferred, when){
	"use strict";

	// module:
	//		dojo/promise/all

	var some = array.some;

	return function all(objectOrArray){
		// summary:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when all promises have been resolved or one has been rejected.
		// description:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when all promises have been resolved or one has been rejected. If one of
		//		the promises is rejected, the returned promise is also rejected. Canceling
		//		the returned promise will *not* cancel any passed promises.
		// objectOrArray: Object|Array?
		//		The promise will be fulfilled with a list of results if invoked with an
		//		array, or an object of results when passed an object (using the same
		//		keys). If passed neither an object or array it is resolved with an
		//		undefined value.
		// returns: dojo/promise/Promise

		var object, array;
		if(objectOrArray instanceof Array){
			array = objectOrArray;
		}else if(objectOrArray && typeof objectOrArray === "object"){
			object = objectOrArray;
		}

		var results;
		var keyLookup = [];
		if(object){
			array = [];
			for(var key in object){
				if(Object.hasOwnProperty.call(object, key)){
					keyLookup.push(key);
					array.push(object[key]);
				}
			}
			results = {};
		}else if(array){
			results = [];
		}

		if(!array || !array.length){
			return new Deferred().resolve(results);
		}

		var deferred = new Deferred();
		deferred.promise.always(function(){
			results = keyLookup = null;
		});
		var waiting = array.length;
		some(array, function(valueOrPromise, index){
			if(!object){
				keyLookup.push(index);
			}
			when(valueOrPromise, function(value){
				if(!deferred.isFulfilled()){
					results[keyLookup[index]] = value;
					if(--waiting === 0){
						deferred.resolve(results);
					}
				}
			}, deferred.reject);
			return deferred.isFulfilled();
		});
		return deferred.promise;	// dojo/promise/Promise
	};
});

},
'dojo/date/stamp':function(){
define(["../_base/lang", "../_base/array"], function(lang, array){

// module:
//		dojo/date/stamp

var stamp = {
	// summary:
	//		TODOC
};
lang.setObject("dojo.date.stamp", stamp);

// Methods to convert dates to or from a wire (string) format using well-known conventions

stamp.fromISOString = function(/*String*/ formattedString, /*Number?*/ defaultTime){
	// summary:
	//		Returns a Date object given a string formatted according to a subset of the ISO-8601 standard.
	//
	// description:
	//		Accepts a string formatted according to a profile of ISO8601 as defined by
	//		[RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
	//		Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
	//		The following combinations are valid:
	//
	//		- dates only
	//			- yyyy
	//			- yyyy-MM
	//			- yyyy-MM-dd
	//		- times only, with an optional time zone appended
	//			- THH:mm
	//			- THH:mm:ss
	//			- THH:mm:ss.SSS
	//		- and "datetimes" which could be any combination of the above
	//
	//		timezones may be specified as Z (for UTC) or +/- followed by a time expression HH:mm
	//		Assumes the local time zone if not specified.  Does not validate.  Improperly formatted
	//		input may return null.  Arguments which are out of bounds will be handled
	//		by the Date constructor (e.g. January 32nd typically gets resolved to February 1st)
	//		Only years between 100 and 9999 are supported.
  	// formattedString:
	//		A string such as 2005-06-30T08:05:00-07:00 or 2005-06-30 or T08:05:00
	// defaultTime:
	//		Used for defaults for fields omitted in the formattedString.
	//		Uses 1970-01-01T00:00:00.0Z by default.

	if(!stamp._isoRegExp){
		stamp._isoRegExp =
//TODO: could be more restrictive and check for 00-59, etc.
			/^(?:(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(.\d+)?)?((?:[+-](\d{2}):(\d{2}))|Z)?)?$/;
	}

	var match = stamp._isoRegExp.exec(formattedString),
		result = null;

	if(match){
		match.shift();
		if(match[1]){match[1]--;} // Javascript Date months are 0-based
		if(match[6]){match[6] *= 1000;} // Javascript Date expects fractional seconds as milliseconds

		if(defaultTime){
			// mix in defaultTime.  Relatively expensive, so use || operators for the fast path of defaultTime === 0
			defaultTime = new Date(defaultTime);
			array.forEach(array.map(["FullYear", "Month", "Date", "Hours", "Minutes", "Seconds", "Milliseconds"], function(prop){
				return defaultTime["get" + prop]();
			}), function(value, index){
				match[index] = match[index] || value;
			});
		}
		result = new Date(match[0]||1970, match[1]||0, match[2]||1, match[3]||0, match[4]||0, match[5]||0, match[6]||0); //TODO: UTC defaults
		if(match[0] < 100){
			result.setFullYear(match[0] || 1970);
		}

		var offset = 0,
			zoneSign = match[7] && match[7].charAt(0);
		if(zoneSign != 'Z'){
			offset = ((match[8] || 0) * 60) + (Number(match[9]) || 0);
			if(zoneSign != '-'){ offset *= -1; }
		}
		if(zoneSign){
			offset -= result.getTimezoneOffset();
		}
		if(offset){
			result.setTime(result.getTime() + offset * 60000);
		}
	}

	return result; // Date or null
};

/*=====
var __Options = {
	// selector: String
	//		"date" or "time" for partial formatting of the Date object.
	//		Both date and time will be formatted by default.
	// zulu: Boolean
	//		if true, UTC/GMT is used for a timezone
	// milliseconds: Boolean
	//		if true, output milliseconds
};
=====*/

stamp.toISOString = function(/*Date*/ dateObject, /*__Options?*/ options){
	// summary:
	//		Format a Date object as a string according a subset of the ISO-8601 standard
	//
	// description:
	//		When options.selector is omitted, output follows [RFC3339](http://www.ietf.org/rfc/rfc3339.txt)
	//		The local time zone is included as an offset from GMT, except when selector=='time' (time without a date)
	//		Does not check bounds.  Only years between 100 and 9999 are supported.
	//
	// dateObject:
	//		A Date object

	var _ = function(n){ return (n < 10) ? "0" + n : n; };
	options = options || {};
	var formattedDate = [],
		getter = options.zulu ? "getUTC" : "get",
		date = "";
	if(options.selector != "time"){
		var year = dateObject[getter+"FullYear"]();
		date = ["0000".substr((year+"").length)+year, _(dateObject[getter+"Month"]()+1), _(dateObject[getter+"Date"]())].join('-');
	}
	formattedDate.push(date);
	if(options.selector != "date"){
		var time = [_(dateObject[getter+"Hours"]()), _(dateObject[getter+"Minutes"]()), _(dateObject[getter+"Seconds"]())].join(':');
		var millis = dateObject[getter+"Milliseconds"]();
		if(options.milliseconds){
			time += "."+ (millis < 100 ? "0" : "") + _(millis);
		}
		if(options.zulu){
			time += "Z";
		}else if(options.selector != "time"){
			var timezoneOffset = dateObject.getTimezoneOffset();
			var absOffset = Math.abs(timezoneOffset);
			time += (timezoneOffset > 0 ? "-" : "+") +
				_(Math.floor(absOffset/60)) + ":" + _(absOffset%60);
		}
		formattedDate.push(time);
	}
	return formattedDate.join('T'); // String
};

return stamp;
});

},
'dojo/ready':function(){
define(["./_base/kernel", "./has", "require", "./domReady", "./_base/lang"], function(dojo, has, require, domReady, lang){
	// module:
	//		dojo/ready
	// note:
	//		This module should be unnecessary in dojo 2.0

	var
		// truthy if DOMContentLoaded or better (e.g., window.onload fired) has been achieved
		isDomReady = 0,

		// The queue of functions waiting to execute as soon as dojo.ready conditions satisfied
		loadQ = [],

		// prevent recursion in onLoad
		onLoadRecursiveGuard = 0,

		handleDomReady = function(){
			isDomReady = 1;
			dojo._postLoad = dojo.config.afterOnLoad = true;
			onEvent();
		},

		onEvent = function(){
			// Called when some state changes:
			//		- dom ready
			//		- dojo/domReady has finished processing everything in its queue
			//		- task added to loadQ
			//		- require() has finished loading all currently requested modules
			//
			// Run the functions queued with dojo.ready if appropriate.


			//guard against recursions into this function
			if(onLoadRecursiveGuard){
				return;
			}
			onLoadRecursiveGuard = 1;

			// Run tasks in queue if require() is finished loading modules, the dom is ready, and there are no
			// pending tasks registered via domReady().
			// The last step is necessary so that a user defined dojo.ready() callback is delayed until after the
			// domReady() calls inside of dojo.	  Failure can be seen on dijit/tests/robot/Dialog_ally.html on IE8
			// because the dijit/focus.js domReady() callback doesn't execute until after the test starts running.
			while(isDomReady && (!domReady || domReady._Q.length == 0) && (require.idle ? require.idle() : true) && loadQ.length){
				var f = loadQ.shift();
				try{
					f();
				}catch(e){
					// force the dojo.js on("error") handler do display the message
					e.info = e.message;
					if(require.signal){
						require.signal("error", e);
					}else{
						throw e;
					}
				}
			}

			onLoadRecursiveGuard = 0;
		};

	// Check if we should run the next queue operation whenever require() finishes loading modules or domReady
	// finishes processing it's queue.
	require.on && require.on("idle", onEvent);
	if(domReady){
		domReady._onQEmpty = onEvent;
	}

	var ready = dojo.ready = dojo.addOnLoad = function(priority, context, callback){
		// summary:
		//		Add a function to execute on DOM content loaded and all requested modules have arrived and been evaluated.
		//		In most cases, the `domReady` plug-in should suffice and this method should not be needed.
		//
		//		When called in a non-browser environment, just checks that all requested modules have arrived and been
		//		evaluated.
		// priority: Integer?
		//		The order in which to exec this callback relative to other callbacks, defaults to 1000
		// context: Object?|Function
		//		The context in which to run execute callback, or a callback if not using context
		// callback: Function?
		//		The function to execute.
		//
		// example:
		//	Simple DOM and Modules ready syntax
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(function(){ alert("Dom ready!"); });
		//	|	});
		//
		// example:
		//	Using a priority
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(2, function(){ alert("low priority ready!"); })
		//	|	});
		//
		// example:
		//	Using context
		//	|	require(["dojo/ready"], function(ready){
		//	|		ready(foo, function(){
		//	|			// in here, this == foo
		//	|		});
		//	|	});
		//
		// example:
		//	Using dojo/hitch style args:
		//	|	require(["dojo/ready"], function(ready){
		//	|		var foo = { dojoReady: function(){ console.warn(this, "dojo dom and modules ready."); } };
		//	|		ready(foo, "dojoReady");
		//	|	});

		var hitchArgs = lang._toArray(arguments);
		if(typeof priority != "number"){
			callback = context;
			context = priority;
			priority = 1000;
		}else{
			hitchArgs.shift();
		}
		callback = callback ?
			lang.hitch.apply(dojo, hitchArgs) :
			function(){
				context();
			};
		callback.priority = priority;
		for(var i = 0; i < loadQ.length && priority >= loadQ[i].priority; i++){}
		loadQ.splice(i, 0, callback);
		onEvent();
	};

	 1 || has.add("dojo-config-addOnLoad", 1);
	if( 1 ){
		var dca = dojo.config.addOnLoad;
		if(dca){
			ready[(lang.isArray(dca) ? "apply" : "call")](dojo, dca);
		}
	}

	if( 0  && dojo.config.parseOnLoad && !dojo.isAsync){
		ready(99, function(){
			if(!dojo.parser){
				dojo.deprecated("Add explicit require(['dojo/parser']);", "", "2.0");
				require(["dojo/parser"]);
			}
		});
	}

	if(domReady){
		domReady(handleDomReady);
	}else{
		handleDomReady();
	}

	return ready;
});

},
'dojo/domReady':function(){
define(['./has'], function(has){
	var global = this,
		doc = document,
		readyStates = { 'loaded': 1, 'complete': 1 },
		fixReadyState = typeof doc.readyState != "string",
		ready = !!readyStates[doc.readyState],
		readyQ = [],
		recursiveGuard;

	function domReady(callback){
		// summary:
		//		Plugin to delay require()/define() callback from firing until the DOM has finished loading.
		readyQ.push(callback);
		if(ready){ processQ(); }
	}
	domReady.load = function(id, req, load){
		domReady(load);
	};

	// Export queue so that ready() can check if it's empty or not.
	domReady._Q = readyQ;
	domReady._onQEmpty = function(){
		// summary:
		//		Private method overridden by dojo/ready, to notify when everything in the
		//		domReady queue has been processed.  Do not use directly.
		//		Will be removed in 2.0, along with domReady._Q.
	};

	// For FF <= 3.5
	if(fixReadyState){ doc.readyState = "loading"; }

	function processQ(){
		// Calls all functions in the queue in order, unless processQ() is already running, in which case just return

		if(recursiveGuard){ return; }
		recursiveGuard = true;

		while(readyQ.length){
			try{
				(readyQ.shift())(doc);
			}catch(err){
				console.log("Error on domReady callback: " + err);
			}
		}

		recursiveGuard = false;

		// Notification for dojo/ready.  Remove for 2.0.
		// Note that this could add more tasks to the ready queue.
		domReady._onQEmpty();
	}

	if(!ready){
		var tests = [],
			detectReady = function(evt){
				evt = evt || global.event;
				if(ready || (evt.type == "readystatechange" && !readyStates[doc.readyState])){ return; }

				// For FF <= 3.5
				if(fixReadyState){ doc.readyState = "complete"; }

				ready = 1;
				processQ();
			},
			on = function(node, event){
				node.addEventListener(event, detectReady, false);
				readyQ.push(function(){ node.removeEventListener(event, detectReady, false); });
			};

		if(!has("dom-addeventlistener")){
			on = function(node, event){
				event = "on" + event;
				node.attachEvent(event, detectReady);
				readyQ.push(function(){ node.detachEvent(event, detectReady); });
			};

			var div = doc.createElement("div");
			try{
				if(div.doScroll && global.frameElement === null){
					// the doScroll test is only useful if we're in the top-most frame
					tests.push(function(){
						// Derived with permission from Diego Perini's IEContentLoaded
						// http://javascript.nwbox.com/IEContentLoaded/
						try{
							div.doScroll("left");
							return 1;
						}catch(e){}
					});
				}
			}catch(e){}
		}

		on(doc, "DOMContentLoaded");
		on(global, "load");

		if("onreadystatechange" in doc){
			on(doc, "readystatechange");
		}else if(!fixReadyState){
			// if the ready state property exists and there's
			// no readystatechange event, poll for the state
			// to change
			tests.push(function(){
				return readyStates[doc.readyState];
			});
		}

		if(tests.length){
			var poller = function(){
				if(ready){ return; }
				var i = tests.length;
				while(i--){
					if(tests[i]()){
						detectReady("poller");
						return;
					}
				}
				setTimeout(poller, 30);
			};
			poller();
		}
	}

	return domReady;
});

},
'dojo/NodeList-dom':function(){
define(["./_base/kernel", "./query", "./_base/array", "./_base/lang", "./dom-class", "./dom-construct", "./dom-geometry", "./dom-attr", "./dom-style"], function(dojo, query, array, lang, domCls, domCtr, domGeom, domAttr, domStyle){

	// module:
	//		dojo/NodeList-dom.js

	/*=====
	 return function(){
		 // summary:
		 //		Adds DOM related methods to NodeList, and returns NodeList constructor.
	 };
	 =====*/

	var magicGuard = function(a){
		// summary:
		//		the guard function for dojo/dom-attr() and dojo/dom-style()
		return a.length == 1 && (typeof a[0] == "string"); // inline'd type check
	};

	var orphan = function(node){
		// summary:
		//		function to orphan nodes
		var p = node.parentNode;
		if(p){
			p.removeChild(node);
		}
	};
	// FIXME: should we move orphan() to dojo/_base/html?

	var NodeList = query.NodeList,
		awc = NodeList._adaptWithCondition,
		aafe = NodeList._adaptAsForEach,
		aam = NodeList._adaptAsMap;

	function getSet(module){
		return function(node, name, value){
			if(arguments.length == 2){
				return module[typeof name == "string" ? "get" : "set"](node, name);
			}
			// setter
			return module.set(node, name, value);
		};
	}

	lang.extend(NodeList, {
		_normalize: function(/*String||Element||Object||NodeList*/content, /*DOMNode?*/refNode){
			// summary:
			//		normalizes data to an array of items to insert.
			// description:
			//		If content is an object, it can have special properties "template" and
			//		"parse". If "template" is defined, then the template value is run through
			//		dojo/string.substitute (if dojo/string.substitute() has been required elsewhere),
			//		or if templateFunc is a function on the content, that function will be used to
			//		transform the template into a final string to be used for for passing to dojo/dom-construct.toDom().
			//		If content.parse is true, then it is remembered for later, for when the content
			//		nodes are inserted into the DOM. At that point, the nodes will be parsed for widgets
			//		(if dojo/parser has been required elsewhere).

			//Wanted to just use a DocumentFragment, but for the array/NodeList
			//case that meant using cloneNode, but we may not want that.
			//Cloning should only happen if the node operations span
			//multiple refNodes. Also, need a real array, not a NodeList from the
			//DOM since the node movements could change those NodeLists.

			var parse = content.parse === true;

			//Do we have an object that needs to be run through a template?
			if(typeof content.template == "string"){
				var templateFunc = content.templateFunc || (dojo.string && dojo.string.substitute);
				content = templateFunc ? templateFunc(content.template, content) : content;
			}

			var type = (typeof content);
			if(type == "string" || type == "number"){
				content = domCtr.toDom(content, (refNode && refNode.ownerDocument));
				if(content.nodeType == 11){
					//DocumentFragment. It cannot handle cloneNode calls, so pull out the children.
					content = lang._toArray(content.childNodes);
				}else{
					content = [content];
				}
			}else if(!lang.isArrayLike(content)){
				content = [content];
			}else if(!lang.isArray(content)){
				//To get to this point, content is array-like, but
				//not an array, which likely means a DOM NodeList. Convert it now.
				content = lang._toArray(content);
			}

			//Pass around the parse info
			if(parse){
				content._runParse = true;
			}
			return content; //Array
		},

		_cloneNode: function(/*DOMNode*/ node){
			// summary:
			//		private utility to clone a node. Not very interesting in the vanilla
			//		dojo/NodeList case, but delegates could do interesting things like
			//		clone event handlers if that is derivable from the node.
			return node.cloneNode(true);
		},

		_place: function(/*Array*/ary, /*DOMNode*/refNode, /*String*/position, /*Boolean*/useClone){
			// summary:
			//		private utility to handle placing an array of nodes relative to another node.
			// description:
			//		Allows for cloning the nodes in the array, and for
			//		optionally parsing widgets, if ary._runParse is true.

			//Avoid a disallowed operation if trying to do an innerHTML on a non-element node.
			if(refNode.nodeType != 1 && position == "only"){
				return;
			}
			var rNode = refNode, tempNode;

			//Always cycle backwards in case the array is really a
			//DOM NodeList and the DOM operations take it out of the live collection.
			var length = ary.length;
			for(var i = length - 1; i >= 0; i--){
				var node = (useClone ? this._cloneNode(ary[i]) : ary[i]);

				//If need widget parsing, use a temp node, instead of waiting after inserting into
				//real DOM because we need to start widget parsing at one node up from current node,
				//which could cause some already parsed widgets to be parsed again.
				if(ary._runParse && dojo.parser && dojo.parser.parse){
					if(!tempNode){
						tempNode = rNode.ownerDocument.createElement("div");
					}
					tempNode.appendChild(node);
					dojo.parser.parse(tempNode);
					node = tempNode.firstChild;
					while(tempNode.firstChild){
						tempNode.removeChild(tempNode.firstChild);
					}
				}

				if(i == length - 1){
					domCtr.place(node, rNode, position);
				}else{
					rNode.parentNode.insertBefore(node, rNode);
				}
				rNode = node;
			}
		},


		position: aam(domGeom.position),
		/*=====
		position: function(){
			// summary:
			//		Returns border-box objects (x/y/w/h) of all elements in a node list
			//		as an Array (*not* a NodeList). Acts like `dojo/dom-geometry-position`, though
			//		assumes the node passed is each node in this list.

			return dojo.map(this, dojo.position); // Array
		},
		=====*/

		attr: awc(getSet(domAttr), magicGuard),
		/*=====
		attr: function(property, value){
			// summary:
			//		gets or sets the DOM attribute for every element in the
			//		NodeList. See also `dojo/dom-attr`
			// property: String
			//		the attribute to get/set
			// value: String?
			//		optional. The value to set the property to
			// returns:
			//		if no value is passed, the result is an array of attribute values
			//		If a value is passed, the return is this NodeList
			// example:
			//		Make all nodes with a particular class focusable:
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		query(".focusable").attr("tabIndex", -1);
			//	|	});
			// example:
			//		Disable a group of buttons:
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		query("button.group").attr("disabled", true);
			//	|	});
			// example:
			//		innerHTML can be assigned or retrieved as well:
			//	|	// get the innerHTML (as an array) for each list item
			//	|	require(["dojo/query", "dojo/NodeList-dom"], function(query){
			//	|		var ih = query("li.replaceable").attr("innerHTML");
			//	|	});
			return; // dojo/NodeList|Array
		},
		=====*/

		style: awc(getSet(domStyle), magicGuard),
		/*=====
		style: function(property, value){
			// summary:
			//		gets or sets the CSS property for every element in the NodeList
			// property: String
			//		the CSS property to get/set, in JavaScript notation
			//		("lineHieght" instead of "line-height")
			// value: String?
			//		optional. The value to set the property to
			// returns:
			//		if no value is passed, the result is an array of strings.
			//		If a value is passed, the return is this NodeList
			return; // dojo/NodeList
			return; // Array
		},
		=====*/

		addClass: aafe(domCls.add),
		/*=====
		addClass: function(className){
			// summary:
			//		adds the specified class to every node in the list
			// className: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			return; // dojo/NodeList
		},
		=====*/

		removeClass: aafe(domCls.remove),
		/*=====
		removeClass: function(className){
			// summary:
			//		removes the specified class from every node in the list
			// className: String|Array?
			//		An optional String class name to remove, or several space-separated
			//		class names, or an array of class names. If omitted, all class names
			//		will be deleted.
			// returns:
			//		this list
			return; // dojo/NodeList
		},
		=====*/

		toggleClass: aafe(domCls.toggle),
		/*=====
		toggleClass: function(className, condition){
			// summary:
			//		Adds a class to node if not present, or removes if present.
			//		Pass a boolean condition if you want to explicitly add or remove.
			// condition: Boolean?
			//		If passed, true means to add the class, false means to remove.
			// className: String
			//		the CSS class to add
			return; // dojo/NodeList
		},
		=====*/

		replaceClass: aafe(domCls.replace),
		/*=====
		replaceClass: function(addClassStr, removeClassStr){
			// summary:
			//		Replaces one or more classes on a node if not present.
			//		Operates more quickly than calling `removeClass()` and `addClass()`
			// addClassStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			// removeClassStr: String|Array?
			//		A String class name to remove, or several space-separated class names,
			//		or an array of class names.
			return; // dojo/NodeList
		 },
		 =====*/

		empty: aafe(domCtr.empty),
		/*=====
		empty: function(){
			// summary:
			//		clears all content from each node in the list. Effectively
			//		equivalent to removing all child nodes from every item in
			//		the list.
			return this.forEach("item.innerHTML='';"); // dojo/NodeList
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		=====*/

		removeAttr: aafe(domAttr.remove),
		/*=====
		 removeAttr: function(name){
			// summary:
			//		Removes an attribute from each node in the list.
			// name: String
			//		the name of the attribute to remove
			return;		// dojo/NodeList
		},
		=====*/

		marginBox: aam(domGeom.getMarginBox),
		/*=====
		marginBox: function(){
			// summary:
			//		Returns margin-box size of nodes
		 	return; // dojo/NodeList
		 },
		 =====*/

		// FIXME: connectPublisher()? connectRunOnce()?

		/*
		destroy: function(){
			// summary:
			//		destroys every item in the list.
			this.forEach(d.destroy);
			// FIXME: should we be checking for and/or disposing of widgets below these nodes?
		},
		*/

		place: function(/*String||Node*/ queryOrNode, /*String*/ position){
			// summary:
			//		places elements of this node list relative to the first element matched
			//		by queryOrNode. Returns the original NodeList. See: `dojo/dom-construct.place`
			// queryOrNode:
			//		may be a string representing any valid CSS3 selector or a DOM node.
			//		In the selector case, only the first matching element will be used
			//		for relative positioning.
			// position:
			//		can be one of:
			//
			//		-	"last" (default)
			//		-	"first"
			//		-	"before"
			//		-	"after"
			//		-	"only"
			//		-	"replace"
			//
			//		or an offset in the childNodes property
			var item = query(queryOrNode)[0];
			return this.forEach(function(node){ domCtr.place(node, item, position); }); // dojo/NodeList
		},

		orphan: function(/*String?*/ filter){
			// summary:
			//		removes elements in this list that match the filter
			//		from their parents and returns them as a new NodeList.
			// filter:
			//		CSS selector like ".foo" or "div > span"
			// returns:
			//		NodeList containing the orphaned elements
			return (filter ? query._filterResult(this, filter) : this).forEach(orphan); // dojo/NodeList
		},

		adopt: function(/*String||Array||DomNode*/ queryOrListOrNode, /*String?*/ position){
			// summary:
			//		places any/all elements in queryOrListOrNode at a
			//		position relative to the first element in this list.
			//		Returns a dojo/NodeList of the adopted elements.
			// queryOrListOrNode:
			//		a DOM node or a query string or a query result.
			//		Represents the nodes to be adopted relative to the
			//		first element of this NodeList.
			// position:
			//		can be one of:
			//
			//		-	"last" (default)
			//		-	"first"
			//		-	"before"
			//		-	"after"
			//		-	"only"
			//		-	"replace"
			//
			//		or an offset in the childNodes property
			return query(queryOrListOrNode).place(this[0], position)._stash(this);	// dojo/NodeList
		},

		// FIXME: do we need this?
		query: function(/*String*/ queryStr){
			// summary:
			//		Returns a new list whose members match the passed query,
			//		assuming elements of the current NodeList as the root for
			//		each search.
			// example:
			//		assume a DOM created by this markup:
			//	|	<div id="foo">
			//	|		<p>
			//	|			bacon is tasty, <span>dontcha think?</span>
			//	|		</p>
			//	|	</div>
			//	|	<div id="bar">
			//	|		<p>great comedians may not be funny <span>in person</span></p>
			//	|	</div>
			//		If we are presented with the following definition for a NodeList:
			//	|	require(["dojo/dom", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(dom, query){
			//	|		var l = new NodeList(dom.byId("foo"), dom.byId("bar"));
			//		it's possible to find all span elements under paragraphs
			//		contained by these elements with this sub-query:
			//	|		var spans = l.query("p span");
			//	|	});

			// FIXME: probably slow
			if(!queryStr){ return this; }
			var ret = new NodeList;
			this.map(function(node){
				// FIXME: why would we ever get undefined here?
				query(queryStr, node).forEach(function(subNode){
					if(subNode !== undefined){
						ret.push(subNode);
					}
				});
			});
			return ret._stash(this);	// dojo/NodeList
		},

		filter: function(/*String|Function*/ filter){
			// summary:
			//		"masks" the built-in javascript filter() method (supported
			//		in Dojo via `dojo.filter`) to support passing a simple
			//		string filter in addition to supporting filtering function
			//		objects.
			// filter:
			//		If a string, a CSS rule like ".thinger" or "div > span".
			// example:
			//		"regular" JS filter syntax as exposed in dojo.filter:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("*").filter(function(item){
			//	|			// highlight every paragraph
			//	|			return (item.nodeName == "p");
			//	|		}).style("backgroundColor", "yellow");
			//	|	});
			// example:
			//	the same filtering using a CSS selector
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("*").filter("p").styles("backgroundColor", "yellow");
			//	|	});
			var a = arguments, items = this, start = 0;
			if(typeof filter == "string"){ // inline'd type check
				items = query._filterResult(this, a[0]);
				if(a.length == 1){
					// if we only got a string query, pass back the filtered results
					return items._stash(this); // dojo/NodeList
				}
				// if we got a callback, run it over the filtered items
				start = 1;
			}
			return this._wrap(array.filter(items, a[start], a[start + 1]), this);	// dojo/NodeList
		},

		/*
		// FIXME: should this be "copyTo" and include parenting info?
		clone: function(){
			// summary:
			//		creates node clones of each element of this list
			//		and returns a new list containing the clones
		},
		*/

		addContent: function(/*String||DomNode||Object||dojo/NodeList*/ content, /*String||Integer?*/ position){
			// summary:
			//		add a node, NodeList or some HTML as a string to every item in the
			//		list.  Returns the original list.
			// description:
			//		a copy of the HTML content is added to each item in the
			//		list, with an optional position argument. If no position
			//		argument is provided, the content is appended to the end of
			//		each item.
			// content:
			//		DOM node, HTML in string format, a NodeList or an Object. If a DOM node or
			//		NodeList, the content will be cloned if the current NodeList has more than one
			//		element. Only the DOM nodes are cloned, no event handlers. If it is an Object,
			//		it should be an object with at "template" String property that has the HTML string
			//		to insert. If dojo.string has already been dojo.required, then dojo.string.substitute
			//		will be used on the "template" to generate the final HTML string. Other allowed
			//		properties on the object are: "parse" if the HTML
			//		string should be parsed for widgets (dojo.require("dojo.parser") to get that
			//		option to work), and "templateFunc" if a template function besides dojo.string.substitute
			//		should be used to transform the "template".
			// position:
			//		can be one of:
			//
			//		-	"last"||"end" (default)
			//		-	"first||"start"
			//		-	"before"
			//		-	"after"
			//		-	"replace" (replaces nodes in this NodeList with new content)
			//		-	"only" (removes other children of the nodes so new content is the only child)
			//
			//		or an offset in the childNodes property
			// example:
			//		appends content to the end if the position is omitted
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("h3 > p").addContent("hey there!");
			//	|	});
			// example:
			//		add something to the front of each element that has a
			//		"thinger" property:
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query("[thinger]").addContent("...", "first");
			//	|	});
			// example:
			//		adds a header before each element of the list
			//	|	require(["dojo/query", "dojo/NodeList-dom"
			//	|	], function(query){
			//	|		query(".note").addContent("<h4>NOTE:</h4>", "before");
			//	|	});
			// example:
			//		add a clone of a DOM node to the end of every element in
			//		the list, removing it from its existing parent.
			//	|	require(["dojo/dom", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(dom, query){
			//	|		query(".note").addContent(dom.byId("foo"));
			//	|	});
			// example:
			//		Append nodes from a templatized string.
			//	|	require(["dojo/string", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(string, query){
			//	|		query(".note").addContent({
			//	|			template: '<b>${id}: </b><span>${name}</span>',
			//	|			id: "user332",
			//	|			name: "Mr. Anderson"
			//	|		});
			//	|	});
			// example:
			//		Append nodes from a templatized string that also has widgets parsed.
			//	|	require(["dojo/string", "dojo/parser", "dojo/query", "dojo/NodeList-dom"
			//	|	], function(string, parser, query){
			//	|		var notes = query(".note").addContent({
			//	|			template: '<button dojoType="dijit/form/Button">${text}</button>',
			//	|			parse: true,
			//	|			text: "Send"
			//	|		});
			//	|	});
			content = this._normalize(content, this[0]);
			for(var i = 0, node; (node = this[i]); i++){
				if(content.length){
					this._place(content, node, position, i > 0);
				}else{
					// if it is an empty array, we empty the target node
					domCtr.empty(node);
				}
			}
			return this; // dojo/NodeList
		}
	});

	return NodeList;
});

},
'dojo/dom-class':function(){
define(["./_base/lang", "./_base/array", "./dom"], function(lang, array, dom){
	// module:
	//		dojo/dom-class

	var className = "className";

	/* Part I of classList-based implementation is preserved here for posterity
	var classList = "classList";
	has.add("dom-classList", function(){
		return classList in document.createElement("p");
	});
	*/

	// =============================
	// (CSS) Class Functions
	// =============================

	var cls, // exports object
		spaces = /\s+/, a1 = [""];

	function str2array(s){
		if(typeof s == "string" || s instanceof String){
			if(s && !spaces.test(s)){
				a1[0] = s;
				return a1;
			}
			var a = s.split(spaces);
			if(a.length && !a[0]){
				a.shift();
			}
			if(a.length && !a[a.length - 1]){
				a.pop();
			}
			return a;
		}
		// assumed to be an array
		if(!s){
			return [];
		}
		return array.filter(s, function(x){ return x; });
	}

	/* Part II of classList-based implementation is preserved here for posterity
	if(has("dom-classList")){
		// new classList version
		cls = {
			contains: function containsClass(node, classStr){
				var clslst = classStr && dom.byId(node)[classList];
				return clslst && clslst.contains(classStr); // Boolean
			},

			add: function addClass(node, classStr){
				node = dom.byId(node);
				classStr = str2array(classStr);
				for(var i = 0, len = classStr.length; i < len; ++i){
					node[classList].add(classStr[i]);
				}
			},

			remove: function removeClass(node, classStr){
				node = dom.byId(node);
				if(classStr === undefined){
					node[className] = "";
				}else{
					classStr = str2array(classStr);
					for(var i = 0, len = classStr.length; i < len; ++i){
						node[classList].remove(classStr[i]);
					}
				}
			},

			replace: function replaceClass(node, addClassStr, removeClassStr){
				node = dom.byId(node);
				if(removeClassStr === undefined){
					node[className] = "";
				}else{
					removeClassStr = str2array(removeClassStr);
					for(var i = 0, len = removeClassStr.length; i < len; ++i){
						node[classList].remove(removeClassStr[i]);
					}
				}
				addClassStr = str2array(addClassStr);
				for(i = 0, len = addClassStr.length; i < len; ++i){
					node[classList].add(addClassStr[i]);
				}
			},

			toggle: function toggleClass(node, classStr, condition){
				node = dom.byId(node);
				if(condition === undefined){
					classStr = str2array(classStr);
					for(var i = 0, len = classStr.length; i < len; ++i){
						node[classList].toggle(classStr[i]);
					}
				}else{
					cls[condition ? "add" : "remove"](node, classStr);
				}
				return condition;   // Boolean
			}
		}
	}
	*/

	// regular DOM version
	var fakeNode = {};  // for effective replacement
	cls = {
		// summary:
		//		This module defines the core dojo DOM class API.

		contains: function containsClass(/*DomNode|String*/ node, /*String*/ classStr){
			// summary:
			//		Returns whether or not the specified classes are a portion of the
			//		class list currently applied to the node.
			// node: String|DOMNode
			//		String ID or DomNode reference to check the class for.
			// classStr: String
			//		A string class name to look for.
			// example:
			//		Do something if a node with id="someNode" has class="aSillyClassName" present
			//	|	if(dojo.hasClass("someNode","aSillyClassName")){ ... }

			return ((" " + dom.byId(node)[className] + " ").indexOf(" " + classStr + " ") >= 0); // Boolean
		},

		add: function addClass(/*DomNode|String*/ node, /*String|Array*/ classStr){
			// summary:
			//		Adds the specified classes to the end of the class list on the
			//		passed node. Will not re-apply duplicate classes.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to add a class string too
			//
			// classStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			//
			// example:
			//		Add a class to some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", "anewClass");
			//	|	});
			//
			// example:
			//		Add two classes at once:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", "firstClass secondClass");
			//	|	});
			//
			// example:
			//		Add two classes at once (using array):
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.add("someNode", ["firstClass", "secondClass"]);
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple additions
			//	|	require(["dojo/query"], function(query){
			//	|		query("ul > li").addClass("firstLevel");
			//	|	});

			node = dom.byId(node);
			classStr = str2array(classStr);
			var cls = node[className], oldLen;
			cls = cls ? " " + cls + " " : " ";
			oldLen = cls.length;
			for(var i = 0, len = classStr.length, c; i < len; ++i){
				c = classStr[i];
				if(c && cls.indexOf(" " + c + " ") < 0){
					cls += c + " ";
				}
			}
			if(oldLen < cls.length){
				node[className] = cls.substr(1, cls.length - 2);
			}
		},

		remove: function removeClass(/*DomNode|String*/ node, /*String|Array?*/ classStr){
			// summary:
			//		Removes the specified classes from node. No `contains()`
			//		check is required.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to remove the class from.
			//
			// classStr: String|Array
			//		An optional String class name to remove, or several space-separated
			//		class names, or an array of class names. If omitted, all class names
			//		will be deleted.
			//
			// example:
			//		Remove a class from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", "firstClass");
			//	|	});
			//
			// example:
			//		Remove two classes from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", "firstClass secondClass");
			//	|	});
			//
			// example:
			//		Remove two classes from some node (using array):
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode", ["firstClass", "secondClass"]);
			//	|	});
			//
			// example:
			//		Remove all classes from some node:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.remove("someNode");
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple removal
			//	|	require(["dojo/query"], function(query){
			//	|		query("ul > li").removeClass("foo");
			//	|	});

			node = dom.byId(node);
			var cls;
			if(classStr !== undefined){
				classStr = str2array(classStr);
				cls = " " + node[className] + " ";
				for(var i = 0, len = classStr.length; i < len; ++i){
					cls = cls.replace(" " + classStr[i] + " ", " ");
				}
				cls = lang.trim(cls);
			}else{
				cls = "";
			}
			if(node[className] != cls){ node[className] = cls; }
		},

		replace: function replaceClass(/*DomNode|String*/ node, /*String|Array*/ addClassStr, /*String|Array?*/ removeClassStr){
			// summary:
			//		Replaces one or more classes on a node if not present.
			//		Operates more quickly than calling dojo.removeClass and dojo.addClass
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to remove the class from.
			//
			// addClassStr: String|Array
			//		A String class name to add, or several space-separated class names,
			//		or an array of class names.
			//
			// removeClassStr: String|Array?
			//		A String class name to remove, or several space-separated class names,
			//		or an array of class names.
			//
			// example:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.replace("someNode", "add1 add2", "remove1 remove2");
			//	|	});
			//
			// example:
			//	Replace all classes with addMe
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.replace("someNode", "addMe");
			//	|	});
			//
			// example:
			//	Available in `dojo/NodeList` for multiple toggles
			//	|	require(["dojo/query"], function(query){
			//	|		query(".findMe").replaceClass("addMe", "removeMe");
			//	|	});

			node = dom.byId(node);
			fakeNode[className] = node[className];
			cls.remove(fakeNode, removeClassStr);
			cls.add(fakeNode, addClassStr);
			if(node[className] !== fakeNode[className]){
				node[className] = fakeNode[className];
			}
		},

		toggle: function toggleClass(/*DomNode|String*/ node, /*String|Array*/ classStr, /*Boolean?*/ condition){
			// summary:
			//		Adds a class to node if not present, or removes if present.
			//		Pass a boolean condition if you want to explicitly add or remove.
			//		Returns the condition that was specified directly or indirectly.
			//
			// node: String|DOMNode
			//		String ID or DomNode reference to toggle a class string
			//
			// classStr: String|Array
			//		A String class name to toggle, or several space-separated class names,
			//		or an array of class names.
			//
			// condition:
			//		If passed, true means to add the class, false means to remove.
			//		Otherwise dojo.hasClass(node, classStr) is used to detect the class presence.
			//
			// example:
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.toggle("someNode", "hovered");
			//	|	});
			//
			// example:
			//		Forcefully add a class
			//	|	require(["dojo/dom-class"], function(domClass){
			//	|		domClass.toggle("someNode", "hovered", true);
			//	|	});
			//
			// example:
			//		Available in `dojo/NodeList` for multiple toggles
			//	|	require(["dojo/query"], function(query){
			//	|		query(".toggleMe").toggleClass("toggleMe");
			//	|	});

			node = dom.byId(node);
			if(condition === undefined){
				classStr = str2array(classStr);
				for(var i = 0, len = classStr.length, c; i < len; ++i){
					c = classStr[i];
					cls[cls.contains(node, c) ? "remove" : "add"](node, c);
				}
			}else{
				cls[condition ? "add" : "remove"](node, classStr);
			}
			return condition;   // Boolean
		}
	};

	return cls;
});

}}});
/**
 * A module for creating tag clouds.
 * @module tag-cloud-bookmarklet/main
 */
define([
	'exports',
	'dojo/query',
	'dojo/_base/array',
	'dojo/html',
	'dojo/NodeList-dom'
], function (tagCloudBookmarklet, query, array, html) {
	var allowed_tags = ['A', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5'];
	var words = [];
	var by_words = {};

	/**
	 * @method traverse
	 * @param {query} node A Dojo query node. 
	 */
	tagCloudBookmarklet.traverse = function(node) {
		// summary:
		// 	This is a recursive function that drills down the node tree
		// 	to find text.
		var node_obj = query(node)[0];
		var nodes = node_obj.childNodes;
		var node_inner = node_obj.innerText;
		if (array.indexOf(allowed_tags, node_obj.tagName) > -1 && node_inner.length > 0 && node_inner[0] != '<') {
			array.forEach(node_inner.match(/[a-z-A-Z]{2,}\w/g), function(word, word_index) {
				if (by_words[word] === undefined) {
					words.push(word);
					by_words[word] = {'name': word, 'size': 0};
				}
				by_words[word].size += 1;
			});
		}
		array.forEach(nodes, function(child_node, node_index) {
			tagCloudBookmarklet.traverse(child_node);
		});
	};

	/**
	 * @method init tag cloud initializer
	 */
	tagCloudBookmarklet.init = function () {
		// summary:
		//	This method will run after dojo has loaded. It calls a method to find all
		//	of the words. It then sorts them alphabetically, wipes the body tag, and writes 
		//	each to the body
		var bod = query('body');
		tagCloudBookmarklet.traverse(bod);
		bod[0].innerHTML = '';
		var cloudElement = document.createElement('p');
		cloudElement.id = 'cloud-text';
		bod.addContent(cloudElement);
		var cloudText = query('#cloud-text');
		words.sort();
		for (var word_instance in words) {
			var word_obj = by_words[words[word_instance]];
			console.log(cloudText);
			cloudText.addContent('<a style="font-size:' + word_obj.size + 'em;">' + word_obj.name + '</a>');
			//bod.addContent('<p style="font-size:' + word_obj.size + 'em; float: left;">' + word_obj.name + '</p>');
		}
		
	};
});
