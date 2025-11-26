document.getElementById('loginBtn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({action: 'login'});
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  chrome.runtime.sendMessage({action: 'realLogout'});
});

function updateUI() {
  chrome.storage.sync.get(['token'], r => {
    if (r.token) {
      document.getElementById('loginBtn')?.style = 'display:none';
      document.getElementById('logoutBtn')?.style = 'display:block';
    } else {
      document.getElementById('loginBtn')?.style = 'display:block';
      document.getElementById('logoutBtn')?.style = 'display:none';
    }
  });
}

chrome.storage.onChanged.addListener(updateUI);
updateUI();
