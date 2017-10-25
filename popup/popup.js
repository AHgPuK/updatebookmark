var Lib = {
	matchWeight: function (u, v, comparePaths) {
		if (comparePaths) {
			u = Lib.urlPath(u);
			v = Lib.urlPath(v);
		}
		var max = Math.min(u.length, v.length);
		for (var i = 0; i < max && u[i] == v[i]; ++i) {
		}

		if (i == 0 && !comparePaths) {
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
		for (var a = 0; a <= string1.length; a++) {
			table[a] = Array(string2.length);
			for (var b = 0; b <= string2.length; b++) {
				table[a][b] = 0;
			}
		}
		/* fill table */
		for (var i = 0; i < string1.length; i++) {
			for (var j = 0; j < string2.length; j++) {
				if (string1[i] == string2[j]) {
					if (table[i][j] == 0) {
						table[i + 1][j + 1] = 1;
					}
					else {
						table[i + 1][j + 1] = table[i][j] + 1;
					}
					if (table[i + 1][j + 1] > longestCommonSubstring) {
						longestCommonSubstring = table[i + 1][j + 1];
					}
				}
				else {
					table[i + 1][j + 1] = 0;
				}
			}
		}
		return longestCommonSubstring;
	},

	getUrlObject: function (uri) {

		var anchor = document.createElement('a');
		anchor.href = uri;

		return anchor;
	},

	removeAllNodes: function (node) {

		while (node.hasChildNodes())
		{
			node.removeChild(node.childNodes[node.childNodes.length - 1]);
		}

	}
}

var BookmarkList = [];
var currentUrl = null;
var currentTitle = null;

function getBookmarksForURI(uri) {

	var origin = Lib.getUrlObject(uri);

	var protocols = ['http:', 'https:'];

	return Promise.resolve()
	.then(function () {

		if (protocols.indexOf(origin.protocol) == -1) {
			return Promise.reject();
		}
	})
	.then(function () {

		return browser.bookmarks.search({
			url: uri
		});

	})
	.then(function (result) {

		if (result.length == 1) {
			return result;
		}

		return browser.bookmarks.search({});
	})
	.then(function (result) {

		var urls = [];

		for (var i = 0; i < result.length; i++) {
			var bookmark = result[i];

			var url = bookmark.url;
			var urlObject = Lib.getUrlObject(url);

			if (origin.host == urlObject.host) {

				bookmark.weight = Lib.matchWeight(uri, url, true);

				urls.push(bookmark);
			}
		}

		return urls.sort(function (a, b) {
			return b.weight - a.weight;
		});
	})
	.catch(function (err) {

		if (err) {
			return Promise.reject(err);
		}

		return Promise.resolve();
	});
}


function browserAction() {

	var currentTab = null;

	Promise.resolve()
	.then(function () {
		return browser.tabs.query({active: true, currentWindow: true});
	})
	.then(function (tabs) {

		currentTab = tabs[0];
		currentUrl = currentTab.url;
		currentTitle = currentTab.title;

		return getBookmarksForURI(currentUrl);
	})
	.then(function (result) {

		// console.log(result);

		if (!result) {
			// No bookmark match
			noBookmarks();
			return;
		}

		if (result.length == 0) {
			// No bookmark match
			noBookmarks();
			return;
		}

		if (result.length == 1) {

			var item = result[0];

			if (currentUrl == item.url && currentTitle == item.title)
			{
				bookmarkIsUpToDate();
				return;
			}
		}

		BookmarkList = result;

		showBookmarks(result);
	})
	// .then(function () {
	// 	console.debug('Finished');
	// })
	.catch(function (err) {

		if (err) {
			console.error(err);
		}

		return Promise.resolve();
	})

}

// browser.browserAction.onClicked.addListener(browserAction);

function showElem(elem, isVisible) {

	if (isVisible) {
		elem.classList.remove('hidden');
	}
	else {
		elem.classList.add('hidden');
	}

}

function noBookmarks() {

	showElem(document.querySelector('.loader'), false);

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var title = getTitle('This page is not bookmarked');

	content.appendChild(title);
	showElem(content, true);

}

function bookmarkIsUpToDate() {

	showElem(document.querySelector('.loader'), false);

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var title = getTitle('Bookmark is up to date');

	content.appendChild(title);
	showElem(content, true);

}

function showBookmarks(list) {

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var title = getTitle('Bookmarks');
	content.appendChild(title);

	var select = document.createElement('select');
	select.classList.add('select');
	select.size = 9;
	content.appendChild(select);

	for (var i = 0; i < list.length; i++) {
		var item = list[i];

		var option = document.createElement('option');
		option.text = item.title;
		option.value = i;
		option.setAttribute('data', i);
		option.addEventListener('dblclick', bookmarkSelected, false);

		select.add(option);
	}

	showElem(document.querySelector('.loader'), false);
	showElem(content, true);

}

function bookmarkUpdated() {

	var content = document.querySelector('.content');

	Lib.removeAllNodes(content);

	var title = getTitle(`Bookmark ${currentTitle} is updated`);

	content.appendChild(title);

	showElem(document.querySelector('.loader'), false);
	showElem(content, true);
}

function getTitle(title) {

	var titleElem = document.createElement('table');
	titleElem.className = 'title title-background whiteFont';

	var titleCell = document.createElement('td');

	var text = document.createTextNode(title);
	titleCell.appendChild(text);
	titleElem.appendChild(titleCell);

	return titleElem;
}

function bookmarkSelected() {

	var index = Number(this.getAttribute('data'));

	var bookmark = BookmarkList[index];

	// console.log('id:', bookmark.id);
	// console.log('url:', currentUrl);
	// console.log('title:', currentTitle);

	browser.bookmarks.update(
		bookmark.id,
		{
			title: currentTitle,
			url: currentUrl,
		}
	)
	.then(function () {

		bookmarkUpdated();

		return new Promise(function (fulfill, reject) {
			setTimeout(function () {
				fulfill();
			}, 1000);

		})
	})
	.then(function () {

		window.close();

	})
	.catch(function (err) {
		console.error(err);
	})

}

browserAction();


