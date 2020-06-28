function saveOptions(e) {

    let timeout = (document.querySelector('#timeout').value || 0) * 1000;

    browser.storage.local.set({
        defaultShortcutAction: document.querySelector('input:checked').value,
        timeout: timeout,
        isContextMenuEnabled: document.querySelector('#isContextMenuEnabled').checked,
    });

    e.preventDefault();
}

function restoreOptions() {

    document.documentElement.lang = getLanguage();

    const defaultValues = {
        defaultShortcutAction: 'firstButton',
        timeout: 2000,
        isContextMenuEnabled: true,
    };

    const storageItem = browser.storage.local.get(defaultValues);

    storageItem.then((res) => {
        res = res || defaultValues;

        let value = res && res.defaultShortcutAction || 'firstButton';

        let elem = document.querySelector(`#${value}`);

        if (elem)
        {
            elem.checked = true;
        }

        document.querySelector('#timeout').value = (res.timeout / 1000);

        document.querySelector('#isContextMenuEnabled').checked = !!res.isContextMenuEnabled;
    })
    .catch(function (err) {
        console.error('browser.storage.local:', err);
    });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

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
