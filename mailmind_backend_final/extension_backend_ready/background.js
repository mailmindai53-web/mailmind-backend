const CLIENT_ID = 'SEU_CLIENT_ID.apps.googleusercontent.com';
const REDIRECT = `https://${chrome.runtime.id}/oauth2`;

chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  if (msg.action === 'login') {
    chrome.identity.launchWebAuthFlow({
      url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT)}&scope=openid%20email%20profile`,
      interactive: true
    }, redirect => {
      if (!redirect) return;
      const token = redirect.split('access_token=')[1].split('&')[0];
      chrome.storage.sync.set({token});
    });
  }

  if (msg.action === 'realLogout') {
    chrome.storage.sync.get(['token'], result => {
      const token = result.token;
      if (token) {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        chrome.identity.clearAllCachedAuthTokens();
      }
      chrome.storage.sync.clear();
      // força atualização imediata do popup
      chrome.runtime.sendMessage({action: 'forceRefresh'});
    });
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'forceRefresh') updateUI();
});
