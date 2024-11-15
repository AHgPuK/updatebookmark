

function saveOptions(e) {

    let timeout = (document.querySelector('#timeout').value || 0) * 1000;

    chrome.storage.local.set({
        defaultShortcutAction: document.querySelector('input:checked').value,
        timeout: timeout,
        isContextMenuEnabled: document.querySelector('#isContextMenuEnabled').checked,
        isStrictSearch: document.querySelector('#isStrictSearch').checked,
        isStrictSearchPopup: document.querySelector('#isStrictSearchPopup').checked,
    });

    e.preventDefault();
}

function restoreOptions() {

    document.documentElement.lang = getLanguage();

    const defaultValues = {
        defaultShortcutAction: 'firstButton',
        timeout: 2000,
        isContextMenuEnabled: true,
        isStrictSearch: true,
        isStrictSearchPopup: false,
    };

    const storageItem = chrome.storage.local.get(defaultValues);

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
        console.error('chrome.storage.local:', err);
    });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);

var Translations = {
    en: {
    },
    ru: {
    }
}

var getLanguage = function () {

    var lang = navigator.language;
    lang = lang.split('-')[0];

    if (lang in Translations)
    {
        return lang;
    }

    return 'en';
}
