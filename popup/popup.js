var isChrome = false;

if (typeof chrome !== 'undefined' && typeof browser === 'undefined')
{
	console = chrome.extension.getBackgroundPage().console;
	browser = chrome;
	isChrome = true;
}

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

var promisify = function () {

	let args = Object.values(arguments);

	return new Promise(function (f, r) {

		let func = args.shift();

		args.push(function (result) {
			f(result);
		});

		func.apply(this, args)

	})

}

function getBookmarksForURI(uri, name) {

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
			return promisify(browser.bookmarks.search, query);
		}

		return browser.bookmarks.search(query);

	})
	.then(function (result) {

		if (result.length == 1)
		{
			return result;
		}

		if (isChrome)
		{
			return promisify(browser.bookmarks.search, {});
		}

		return browser.bookmarks.search({});
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
	});
}


function browserAction() {

	let isChrome = false;
	let currentTab = null;

	if (typeof chrome !== 'undefined' && typeof browser === 'undefined')
	{
		browser = chrome;
		isChrome = true;
	}

	Promise.resolve()
	.then(function () {

		if (typeof browser == 'undefined')
		{
			return Promise.reject(new Error('Not WebExtension'));
		}

		return waitForResultWithPromise(function () {

			return Promise.resolve()
			.then(function () {

				if (isChrome)
				{
					return new Promise(function (f, r) {

						browser.tabs.query({
							active: true,
							currentWindow: true
						}, function (tabs) {
							f(tabs);
						})

					})
				}

				return browser.tabs.query({
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
				// 	browser.webNavigation.onDOMContentLoaded.addListener(
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

		}, 100);

	})
	.then(function () {

		if (!currentTab)
		{
			console.error('no current tab');
			return;
		}

		currentUrl = currentTab.url;
		currentTitle = currentTab.title;

		return getBookmarksForURI(currentUrl, currentTitle);
	})
	.then(function (result) {

		// console.log(result);

		if (!result)
		{
			// No bookmark match
			noBookmarks();
			return;
		}

		if (result.length == 0)
		{
			// No bookmark match
			noBookmarks();
			return;
		}

		var isUpToDate = true;
		var bookmarksToUpdate = [];

		for (var i = 0; i < result.length; i++)
		{
			var item = result[i];

			if (currentUrl == item.url && currentTitle == item.title)
			{
				continue;
			}

			isUpToDate = false;
			bookmarksToUpdate.push(item);
		}

		if (isUpToDate == true)
		{
			bookmarkIsUpToDate();
			return;
		}

		BookmarkList = result;

		return showBookmarks(bookmarksToUpdate);

	})
	.then(function () {


	})
	.catch(function (err) {

		if (err)
		{
			console.error(err);
		}

		return Promise.resolve();
	})

}

// browser.browserAction.onClicked.addListener(browserAction);

function showElem(elem, isVisible) {

	if (isVisible)
	{
		elem.classList.remove('hidden');
	}
	else
	{
		elem.classList.add('hidden');
	}

}

function noBookmarks() {

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var title = getTitle('This page is not bookmarked');

	content.appendChild(title);
	showElem(content, true);

	showElem(document.querySelector('.loader'), false);
}

function bookmarkIsUpToDate() {

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var title = getTitle('Bookmark is up to date');

	content.appendChild(title);
	showElem(content, true);

	showElem(document.querySelector('.loader'), false);
}

function init() {

	showElem(document.querySelector('.loader'), true);

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	showElem(content, false);
}

async function showBookmarks(list) {

	var buttonsConfig = [
		{
			name: 'Update URL',
			isUpdateUrl: true,
			isUpdateTitle: false,
			buttonElem: null,
		},
		{
			name: 'Update a title',
			isUpdateUrl: false,
			isUpdateTitle: true,
			buttonElem: null,
		},
		{
			name: 'Update URL & title',
			isUpdateUrl: true,
			isUpdateTitle: true,
			buttonElem: null,
		}
	];

	var content = document.querySelector('.content');
	Lib.removeAllNodes(content);

	var manifest = {
		version: 'Standalone'
	};

	if (typeof browser != 'undefined')
	{
		manifest = browser.runtime.getManifest();
	}

	var title = getTitle('Bookmarks v' + manifest.version);
	content.appendChild(title);

	var select = document.createElement('select');
	select.classList.add('select');
	select.size = 8;
	content.appendChild(select);

	for (var i = 0; i < list.length; i++)
	{
		var item = list[i];

		var option = document.createElement('option');
		// option.text = `${item.weight}=${item.weightUrl}+${item.weightTitle}` + ' : ' + item.title;
		option.text = item.title;
		option.title = item.url;
		option.value = i;
		// if (i == 0) {
		// 	option.selected = 'selected';
		// }
		option.setAttribute('data', i);
		option.addEventListener('dblclick', function () {
			onDoubleClick(this, buttonsConfig);
		}, false);

		select.add(option);
	}

	showElem(document.querySelector('.loader'), false);
	showElem(content, true);

	select.addEventListener('keypress', function (event) {
        onKeyPress(this, event, buttonsConfig);
    }, false);

	var buttonPanel = document.createElement('div');
	buttonPanel.classList.add('buttonPanel');

	const options = await getOptions();
	const language = getLanguage();

	for (let i = 0; i < buttonsConfig.length; i++)
	{
		let config = buttonsConfig[i];
		let buttonElem = document.createElement('button');
		buttonElem.classList.add('updateButton');
		buttonElem.classList.add('title-background');
		buttonElem.classList.add('whiteFont');
		const name = getString(config.name, language);
		buttonElem.appendChild(document.createTextNode(name));

		buttonElem.addEventListener('click', () => {
			onUpdateButtonClick(config);
		}, false);

		buttonPanel.appendChild(buttonElem);

		config.buttonElem = buttonElem;
		config.timeout = options.timeout;
	}

	select.addEventListener('change', function () {

		var index = this.selectedIndex;

		var bookmark = BookmarkList[index];

		updateButtons(bookmark, buttonsConfig);

	}, false);


	content.appendChild(buttonPanel);

	var index = 0;
	select.options[index].selected = 'selected';

	updateButtons(BookmarkList[index], buttonsConfig);

	if (typeof browser != 'undefined')
	{
		browser.commands.onCommand.addListener(function(command) {

			if (command == 'update-url')
			{
				getButtonsOptions(buttonsConfig)
				.then(function(options) {

					if (!options)
					{
						return;
					}

					onUpdateButtonClick(options);

				})
			}
		});
	}

	// setTimeout(function () {
	// 	select.focus();
	// }, 100);
	//
	// window.focus();
}

function getOptions() {

	const defaultValues = {
		defaultShortcutAction: 'firstButton',
		timeout: 2000,
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
}


function getButtonsOptions(buttonsConfig) {

    var retValue = {
		isUpdateUrl: false,
		isUpdateTitle: false,
		timeout: 2000,
    }

	return getOptions()
	.then(function (res) {

		retValue.timeout = res.timeout;

		var value = res && res.defaultShortcutAction || 'firstButton';

		if (value == 'firstButton')
		{
			var buttonConfigIndex = getFirstEnabledButtonIndex(buttonsConfig);

			if (buttonConfigIndex < 0)
			{
				throw new Error('No buttons available');
			}

			var config = buttonsConfig[buttonConfigIndex];

			retValue.isUpdateUrl = config.isUpdateUrl;
			retValue.isUpdateTitle = config.isUpdateTitle;
		}
		else if (value == 'updateUrl')
		{
			retValue.isUpdateUrl = true;
			retValue.isUpdateTitle = false;
		}
		else if (value == 'updateUrlAndTitle')
		{
			retValue.isUpdateUrl = true;
			retValue.isUpdateTitle = true;
		}
		else if (value == 'updateTitle')
		{
			retValue.isUpdateUrl = false;
			retValue.isUpdateTitle = true;
		}

		return retValue;
	})
	.catch(function (err) {

		console.error('getButtonsOptions:', err.message);
		return Promise.resolve(null);

	});

}

function updateButtons(bookmark, buttonsConfig) {

	for (var i = 0; i < buttonsConfig.length; i++)
	{
		var config = buttonsConfig[i];

		var isUrlMatch = (bookmark.url == currentUrl);
		var isTitleMatch = (bookmark.title == currentTitle);

		if (isUrlMatch != config.isUpdateUrl && isTitleMatch != config.isUpdateTitle)
		{
			if (isUrlMatch == false || isTitleMatch == false)
			{
				config.buttonElem.classList.remove('hidden');
			}
			else
			{
				config.buttonElem.classList.add('hidden');
			}
		}
		else
		{
			if (isUrlMatch == false && isTitleMatch == false)
			{
				config.buttonElem.classList.remove('hidden');
			}
			else
			{
				config.buttonElem.classList.add('hidden');
			}
			// config.buttonElem.classList.add('hidden');
		}
	}
}

function getFirstEnabledButtonIndex(buttonsConfig) {

	for (var i = 0; i < buttonsConfig.length; i++)
	{
		var config = buttonsConfig[i];

		if (config.buttonElem.classList.contains('hidden') == false)
		{
			return i;
		}
	}

	return -1;
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
	var titleRow = document.createElement('tr');

	var text = document.createTextNode(getString(title, getLanguage()));
	titleCell.appendChild(text);
	titleRow.appendChild(titleCell);
	titleElem.appendChild(titleRow);

	return titleElem;
}


function onDoubleClick(elem, buttonsConfig) {

	var index = Number(elem.getAttribute('data'));

	var bookmark = BookmarkList[index];

	getButtonsOptions(buttonsConfig)
    .then(function (options) {

        if (!options)
        {
            return;
        }

        bookmarkSelected(bookmark, options);

    })

}

function onKeyPress(context, event, buttonsConfig) {

	var keyCode = event.keyCode;

	if (!(keyCode == 13 || keyCode == 32))
	{
		return;
	}

    var bookmark = BookmarkList[context.selectedIndex];

	getButtonsOptions(buttonsConfig)
    .then(function (options) {

        if (!options)
        {
            return;
        }

        bookmarkSelected(bookmark, options);

    })
}

function onUpdateButtonClick(options) {

	var selectElem = document.querySelector('select');

	var bookmark = BookmarkList[selectElem.selectedIndex];

	if (bookmark)
	{
		bookmarkSelected(bookmark, options);
	}
}

function bookmarkSelected(bookmark, options) {

	// console.log('id:', bookmark.id);
	// console.log('url:', currentUrl);
	// console.log('title:', currentTitle);

	const update = {};
	const {isUpdateUrl, isUpdateTitle, timeout} = options;

	if (isUpdateUrl)
	{
		update.url = currentUrl;
	}

	if (isUpdateTitle)
	{
		update.title = currentTitle;
	}

	return Promise.resolve()
	.then(function () {

		if (isChrome)
		{
			return promisify(browser.bookmarks.update, bookmark.id, update);
		}

		return browser.bookmarks.update(bookmark.id, update)

	})
	.then(function () {

		bookmarkUpdated();

		return new Promise(function (fulfill, reject) {
			setTimeout(function () {
				fulfill();
			}, timeout);

		})
	})
	.then(function () {

		window.close();

	})
	.catch(function (err) {
		console.error(err);
	})

}

function waitForResultWithTimeout(func, time) {
	var promise = new Promise(function (fulfill, reject) {
		var loopFunc = function () {
			try
			{
				var result = func();

				if (result)
				{
					fulfill(result);
					return;
				}

			}
			catch (e)
			{
				reject(e);
				return;
			}

			setTimeout(function () {
				loopFunc()
			}, time);
		}

		loopFunc();

	});

	return promise;
}

function waitForResultWithPromise(func, time) {
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
}

browserAction();

if (typeof browser != 'undefined')
{
	const events = [
		'onRemoved',
		'onActivated',
		'onUpdated',
	];

	events.map(function (eventName) {
		browser.tabs[eventName].addListener(function(id, changeInfo, tab)
		{
			if (tab && tab.active == true && tab.status == 'complete')
			{
				init();
				browserAction();
			}
		});
	})
}

// browser.pageAction.onClicked.addListener(function () {
// 	console.log('pageAction.onClicked');
// });

function setLayout () {

	if (document.documentElement.clientWidth == 0 && document.documentElement.clientWidth == document.body.clientWidth)
	{
		document.body.className = 'bodyoverflowmenu';
	}
	else
	{
		document.body.className = 'body';
	}
}

setTimeout(function () {

	setLayout();

	if (typeof browser != 'undefined')
	{
		return;
	}

	currentTitle = '3';
	currentUrl = '3';

	BookmarkList = [
		{
			title: '1',
			url: '1',
		},
		{
			title: '1',
			url: '2',
		},
		{
			title: '2',
			url: '1',
		},
		{
			title: '2',
			url: '2',
		},
	];

	return showBookmarks(BookmarkList);
}, 100);

var Translations = {
	en: {
		'Update URL': 'Update URL',
		'Update a title': 'Update a title',
		'Update URL & title': 'Update URL & title',
		'This page is not bookmarked': 'This page is not bookmarked',
		'Bookmark is up to date': 'Bookmark is up to date',
	},
	ru: {
		'Update URL': 'Обновить ссылку',
		'Update a title': 'Обновить название',
		'Update URL & title': 'Обновить ссылку и название',
		'This page is not bookmarked': 'Страницы нет в закладках',
		'Bookmark is up to date': 'Закладка обновления не требует',
	}
}

var getLanguage = function () {

	// var lang = getCookie('language');
	//
	// if (lang in Translations)
	// {
	// 	return lang;
	// }

	var lang = navigator.language;
	lang = lang.split('-')[0];

	if (lang in Translations)
	{
		return lang;
	}

	return 'en';
}

var getString = function (id, language)
{
	var langDict = Translations[language] || Translations['en'];

	if (!langDict)
	{
		return id;
	}

	var str = langDict[id];

	if (!str && langDict != Translations['en'])
	{
		str = Translations['en'][id] || id;
	}

	return str || id;
}