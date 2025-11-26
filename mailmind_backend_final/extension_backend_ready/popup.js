const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

function updateUI() {
  chrome.storage.sync.get(['token'], (result) => {
    if (result.token) {
      loginBtn.style.display = 'none';
      logoutBtn.style.display = 'block';
    } else {
      loginBtn.style.display = 'block';
      logoutBtn.style.display = 'none';
    }
  });
}

loginBtn.onclick = () => {
  chrome.runtime.sendMessage({action: 'login'});
};

logoutBtn.onclick = () => {
  chrome.runtime.sendMessage({action: 'logout'});
};

chrome.storage.onChanged.addListener(updateUI);
updateUI();
