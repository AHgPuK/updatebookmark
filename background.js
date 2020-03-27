let MENU_ENTRY = {
	MAIN_MENU: 'MAIN_MENU',
	UPDATE_TITLE: 'UPDATE_TITLE',
	UPDATE_URL: 'UPDATE_URL',
	UPDATE_TITLE_URL: 'UPDATE_TITLE_URL',
}

let isChrome = false;

if (typeof chrome !== 'undefined' && typeof browser === 'undefined')
{
	browser = chrome;
	isChrome = true;
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
			browser.contextMenus.create({
				id: MENU_ENTRY.MAIN_MENU,
				title: "Update bookmark",
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_URL,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: "Update URL",
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_TITLE_URL,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: "Update URL/Title",
				contexts: ["bookmark"],
				type: 'normal',
				icons: {
					'32': 'icons/icon32.png'
				}
			});

			browser.contextMenus.create({
				id: MENU_ENTRY.UPDATE_TITLE,
				parentId: MENU_ENTRY.MAIN_MENU,
				title: "Update Title",
				contexts: ["bookmark"],
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
