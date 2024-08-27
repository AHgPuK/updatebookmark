try {
	importScripts('common/lib.js');
} catch (e) {
	console.error(e);
}

let MENU_ENTRY = {
	MAIN_MENU: 'MAIN_MENU',
	UPDATE_TITLE: 'UPDATE_TITLE',
	UPDATE_URL: 'UPDATE_URL',
	UPDATE_TITLE_URL: 'UPDATE_TITLE_URL',
	UPDATE_URL_FROM_LINK: 'UPDATE_URL_FROM_LINK',
}

var Translations = {
	en: {
		'Update bookmark': 'Update bookmark',
		'Update URL': 'Update URL',
		'Update URL/Title': 'Update URL/Title',
		'Update Title': 'Update Title',
	},
	ru: {
		'Update bookmark': 'Обновить закладку',
		'Update URL': 'Обновить ссылку',
		'Update URL/Title': 'Обновить ссылку и название',
		'Update Title': 'Обновить название',
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

function getOptions() {

	const defaultValues = {
		defaultShortcutAction: 'firstButton',
		timeout: 2000,
		isContextMenuEnabled: true,
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

if (!isChrome) {

	getOptions()
	.then(function (res) {

		if (res.isContextMenuEnabled)
		{
			const lang = getLanguage();

			browser.contextMenus.create({
				id: MENU_ENTRY.MAIN_MENU,
				title: getString('Update bookmark', lang),
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_URL,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: getString('Update URL', lang),
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_TITLE_URL,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: getString('Update URL/Title', lang),
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_TITLE,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: getString('Update Title', lang),
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_URL_FROM_LINK,
				title: getString('Update URL', lang),
				contexts: ["link"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.onClicked.addListener((info, tab) => {

				if (info.menuItemId === MENU_ENTRY.UPDATE_URL) {
					bookmarkSelected(info.bookmarkId, true, false);
				} else if (info.menuItemId === MENU_ENTRY.UPDATE_TITLE_URL) {
					bookmarkSelected(info.bookmarkId, true, true);
				} else if (info.menuItemId === MENU_ENTRY.UPDATE_TITLE) {
					bookmarkSelected(info.bookmarkId, false, true);
				} else if (info.menuItemId === MENU_ENTRY.UPDATE_URL_FROM_LINK) {
					// debugger
					// console(info);
					bookmarkFindAndUpdate(info.linkUrl);
					// bookmarkUpdate(info);
				}

			});
		}

	})
	.catch(function (err) {

	})



}

function bookmarkSelected(bookmarkId, isUrl, isTitle) {

	browser.tabs.query({active: true, currentWindow: true})
	.then(function (tabs) {

		if (!(tabs && tabs[0]))
		{
			return Promise.reject(0);
		}

		var tab = tabs[0];

		if ((tab.title && tab.url) || tab.status == 'complete')
		{

		}
		else
		{
			return Promise.reject(0);
		}

		var update = {};

		if (isUrl)
		{
			update.url = tab.url;
		}

		if (isTitle)
		{
			update.title = tab.title;
		}

		return browser.bookmarks.update(bookmarkId, update);
	})
	.catch(function (err) {
		return Promise.resolve();
	})

}

function bookmarkFindAndUpdate(url) {

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
			isUpToDate = false;
			bookmarksToUpdate.push(item);
		}

		if (isUpToDate == true)
		{
			return;
		}

		return bookmarksToUpdate;

	})
	.then(function (bookmarksToUpdate) {

		if (!bookmarksToUpdate) return;

		var bookmark = bookmarksToUpdate[0];

		return browser.bookmarks.update(bookmark.id, {
			url: url,
		})

	})
	.catch(function (err) {

		if (err)
		{
			console.error(err);
		}

		return Promise.resolve();
	})

}
