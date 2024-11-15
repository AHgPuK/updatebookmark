const detectBrowser = function () {
	if (typeof chrome === 'undefined') return;

	const manifest = chrome.runtime.getManifest();

	if (!manifest) return;

	if ('scripts' in manifest.background)
	{
		return 'Firefox';
	}

	return 'Chrome';
}

const isChrome = detectBrowser() == 'Chrome';

const Lib = {

	calcWeightForBookmarkStandard: function ({
		uri,
		bookmark,
		name,
		title,
	 }) {
		bookmark.weight = Lib.matchWeight(uri, bookmark.url) * 100;
		bookmark.weightUrl = bookmark.weight;

		if (name)
		{
			bookmark.weightTitle = Lib.longestCommonSubstring(name, title) * 50;
			bookmark.weight += bookmark.weightTitle;
		}

		return bookmark;
	},

	matchWeight: function (u, v, comparePaths = true) {

		u = Lib.urlPath(u);
		v = Lib.urlPath(v);

		const max = Math.min(u.length, v.length);

		let index = 0;
		while (index < max && u[index] == v[index])
		{
			++index;
		}

		if (index == 0 && !comparePaths)
		{
			index = Lib.longestCommonSubstring(u, v) / 3;
		}

		return index;
	},

	calcWeightForBookmarkStrict: function ({
		uri,
		bookmark,
		name,
		title,
	}) {

		bookmark.weight = Lib.matchWeightStrict(uri, bookmark.url) * 100;

		if (bookmark.weight) {

			if (name)
			{
				bookmark.weightTitle = Lib.longestCommonSubstring(name, title) * 50;
				bookmark.weight += bookmark.weightTitle;
			}

			return bookmark;
		}

		return null;
	},

	matchWeightStrict: function (u, v) {
		const uSearch = new URL(u);
		const vSearch = new URL(v);

		// A path should be equal
		const [path1, file1] = Lib.getPathAndName(uSearch.pathname);
		const [path2, file2] = Lib.getPathAndName(vSearch.pathname);

		if (path1 != path2) {
			return;
		}

		if (uSearch.searchParams.size == vSearch.searchParams.size)
		{
			let weight = 0;

			// Here we compare only file name.
			weight = Lib.longestCommonSubstring(file1, file2) * 1000;

			if (uSearch.searchParams.size == 0)
			{
				return weight;
			}

			const allKeys = [...new Set([...uSearch.searchParams.keys(), ...vSearch.searchParams.keys()])];

			if (allKeys.length > uSearch.searchParams.size)
			{
				// Parameters are different
				return;
			}

			// Count of parameters is the same in both urls

			for (let i = 0; i < allKeys.length; i++) {
				const key = allKeys[i];

				const uValue = uSearch.searchParams.get(key);
				const vValue = vSearch.searchParams.get(key);

				if (uValue == vValue)
				{
					weight += 250;
				}
				else
				{
					weight +=  Lib.longestCommonSubstring(uValue, vValue) * 25;
				}
			}

			return weight;
		}

		return;
	},

	urlPath: function (url) {

		const urlObj = Lib.getUrlObject(url);

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

	getBookmarksForURI: function (uri, name, options) {

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
		.then(async function (result) {

			const calcWeightForBookmark = options.isStrictSearch ? Lib.calcWeightForBookmarkStrict : Lib.calcWeightForBookmarkStandard;

			const bookmarks = [];

			for (let i = 0; i < result.length; i++)
			{
				const bookmark = result[i];

				if (!bookmark.url) continue;

				const title = bookmark.title;
				const urlObject = Lib.getUrlObject(bookmark.url);

				if (origin.host == urlObject.host)
				{
					const res = calcWeightForBookmark({
						uri,
						bookmark,
						name,
						title,
					});

					res && bookmarks.push(res);
				}
			}

			return bookmarks.sort(function (a, b) {
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
		const promise = new Promise(function (fulfill, reject) {
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

	getOptions() {

		const defaultValues = {
			defaultShortcutAction: 'firstButton',
			timeout: 2000,
			isContextMenuEnabled: true,
			isStrictSearch: true,
			isStrictSearchPopup: false,
		};

		return Promise.resolve()
		.then(function () {

			if (typeof browser === 'undefined')
			{
				return;
			}

			return browser.storage.local.get(defaultValues);

		})
		.then(function (res) {

			return res || defaultValues;

		})
		.catch(function (err) {

			console.error('getOptions:', err.message);
			return Promise.resolve(defaultValues);

		});
	},

	getPathAndName: function (url) {
		const parts = url.split('/');
		const file = parts.pop();

		return [parts.join('/'), file];
	},
}

// export { Lib };
if (typeof global !== 'undefined')
{
	module.exports = Lib;
}
