var BookmarkList = [];
var currentUrl = null;
var currentTitle = null;





function browserAction() {

	let isChrome = false;

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

		return Lib.getCurrentTab();

	})
	.then(function (currentTab) {

		if (!currentTab)
		{
			console.error('no current tab');
			return;
		}

		currentUrl = currentTab.url;
		currentTitle = currentTab.title;

		return Lib.getBookmarksForURI(currentUrl, currentTitle);
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
			return Lib.promisify(browser.bookmarks.update, bookmark.id, update);
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