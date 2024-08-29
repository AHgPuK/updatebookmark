const detectBrowser = function () {
	const manifest = chrome.runtime.getManifest();

	if ('scripts' in manifest.background)
	{
		return 'Firefox';
	}

	return 'Chrome';
}

var isChrome = detectBrowser() == 'Chrome';

var Lib = {
	matchWeight: function (u, v, comparePaths) {
		if (comparePaths)
		{
			u = Lib.urlPath(u);
			v = Lib.urlPath(v);
		}
		var max = Math.min(u.length, v.length);
		for (var i = 0; i < max && u[i] == v[i]; ++i)
		{
		}

		if (i == 0 && !comparePaths)
		{
			i = Lib.longestCommonSubstring(u, v) / 3;
		}

		return i;
	},

	urlPath: function (url) {

		var urlObj = Lib.getUrlObject(url);

		return urlObj.pathname + urlObj.search;
	},

	/**
	 * http://en.wikibooks.org/wiki/Algorithm_implementation
	 *   /Strings/Longest_common_substring#JavaScript
	 */
	longestCommonSubstring: function (string1, string2) {
		var longestCommonSubstring = 0;
		/* init 2D array with 0 */
		var table = Array(string1.length);
		for (var a = 0; a <= string1.length; a++)
		{
			table[a] = Array(string2.length);
			for (var b = 0; b <= string2.length; b++)
			{
				table[a][b] = 0;
			}
		}
		/* fill table */
		for (var i = 0; i < string1.length; i++)
		{
			for (var j = 0; j < string2.length; j++)
			{
				if (string1[i] == string2[j])
				{
					if (table[i][j] == 0)
					{
						table[i + 1][j + 1] = 1;
					}
					else
					{
						table[i + 1][j + 1] = table[i][j] + 1;
					}
					if (table[i + 1][j + 1] > longestCommonSubstring)
					{
						longestCommonSubstring = table[i + 1][j + 1];
					}
				}
				else
				{
					table[i + 1][j + 1] = 0;
				}
			}
		}
		return longestCommonSubstring;
	},

	getUrlObject: function (uri) {

		let anchor = null;

		try {
			anchor = new URL(uri);
		}
		catch (err) {
			anchor = new URL('a:');
		}

		return anchor;
	},

	removeAllNodes: function (node) {

		while (node.hasChildNodes())
		{
			node.removeChild(node.childNodes[node.childNodes.length - 1]);
		}

	},

	promisify: function () {

		let args = Object.values(arguments);

		return new Promise(function (f, r) {

			let func = args.shift();

			args.push(function (result) {
				f(result);
			});

			func.apply(this, args)

		})

	},

	getBookmarksForURI: function (uri, name) {

		var origin = Lib.getUrlObject(uri);

		var protocols = ['http:', 'https:', 'file:'];

		return Promise.resolve()
		.then(function () {

			if (protocols.indexOf(origin.protocol) == -1)
			{
				return Promise.reject();
			}
		})
		.then(function () {

			var query = origin.protocol == 'file:' ? decodeURI(uri) : {
				url: uri
			};

			if (isChrome)
			{
				return Lib.promisify(chrome.bookmarks.search, query);
			}

			return chrome.bookmarks.search(query);

		})
		.then(function (result) {

			if (result.length == 1)
			{
				return result;
			}

			if (isChrome)
			{
				return Lib.promisify(chrome.bookmarks.search, {});
			}

			return chrome.bookmarks.search({});
		})
		.then(function (result) {

			var urls = [];

			for (var i = 0; i < result.length; i++)
			{
				var bookmark = result[i];
				var url = bookmark.url;
				var title = bookmark.title;
				var urlObject = Lib.getUrlObject(url);

				if (origin.host == urlObject.host)
				{
					bookmark.weight = Lib.matchWeight(uri, url, true) * 100;
					bookmark.weightUrl = bookmark.weight;
					// bookmark.weight += Lib.matchWeight(name, title, true);

					if (name)
					{
						bookmark.weightTitle = Lib.longestCommonSubstring(name, title) * 50;
						bookmark.weight += bookmark.weightTitle;
					}

					urls.push(bookmark);
				}
			}

			return urls.sort(function (a, b) {
				return b.weight - a.weight;
			});
		})
		.catch(function (err) {

			if (err)
			{
				return Promise.reject(err);
			}

			return Promise.resolve();
		})
	},

	getCurrentTab: function () {

		let currentTab = null;

		return Lib.waitForResultWithPromise(function () {

			return Promise.resolve()
			.then(function () {

				if (isChrome)
				{
					return new Promise(function (f, r) {

						chrome.tabs.query({
							active: true,
							currentWindow: true
						}, function (tabs) {
							f(tabs);
						})

					})
				}

				return chrome.tabs.query({
					active: true,
					currentWindow: true
				})

			})
			.then(function (tabs) {

				if (!(tabs && tabs[0]))
				{
					console.error('No tabs in browser. Weird.');
					return false;
				}

				var tab = tabs[0];

				if ((tab.title && tab.url) || tab.status == 'complete')
				{
					// console.log(JSON.stringify(tab, null, 4));
					currentTab = tab;
					return true;
				}

				// var promise = new Promise(function (fulfill, reject) {
				//
				// 	chrome.webNavigation.onDOMContentLoaded.addListener(
				// 		function (event) {
				// 			currentTab = tab;
				// 			fulfill(true);
				// 		}
				// 	);
				//
				// 	if (tab.status == 'complete')
				// 	{
				// 		// console.log(JSON.stringify(tab, null, 4));
				// 		currentTab = tab;
				// 		fulfill(true);
				// 		return;
				// 	}
				//
				// });
				//
				// return promise;

				return false;
			});

		}, 100)
		.then(function () {
			return currentTab;
		})
	},

	waitForResultWithPromise: function (func, time) {
		var promise = new Promise(function (fulfill, reject) {
			var loopFunc = function () {
				Promise.resolve()
					.then(function () {
						return func();
					})
					.then(function (result) {
						if (result)
						{
							fulfill(result);
							return;
						}

						setTimeout(function () {
							loopFunc()
						}, time || 0);

					})
					.catch(function (err) {
						reject(err);
					})
			}

			loopFunc();

		})

		return promise;
	},
}

// export { Lib };
