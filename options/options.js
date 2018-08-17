function saveOptions(e) {

    browser.storage.local.set({
        defaultShortcutAction: document.querySelector('input:checked').value
    });

    e.preventDefault();
}

function restoreOptions() {

    var storageItem = browser.storage.local.get('defaultShortcutAction');

    storageItem.then((res) => {

        let value = res && res.defaultShortcutAction || 'firstButton';

        let elem = document.querySelector(`#${value}`);

        if (elem)
        {
            elem.checked = true;
        }
    })
    .catch(function (err) {
        console.error('browser.storage.local:', err);
    });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);