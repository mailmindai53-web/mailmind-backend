const CLIENT_ID = 'SEU_CLIENT_ID.apps.googleusercontent.com';
const REDIRECT_URI = `https://${chrome.runtime.id}/oauth2`;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'login') {
    chrome.identity.launchWebAuthFlow({
      url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=openid%20email%20profile`,
      interactive: true
    }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) return;
      const token = redirectUrl.split('access_token=')[1].split('&')[0];
      chrome.storage.sync.set({token: token});
      // ENVIA PARA SUA API AQUI (se quiser)
      fetch('https://minhaapi.com/auth', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    });
  }

  if (msg.action === 'logout') {
    chrome.identity.getAuthToken({interactive: false}, (token) => {
      if (token) {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
        chrome.identity.removeCachedAuthToken({token: token});
      }
    });
    chrome.storage.sync.remove(['token']);
  }
});
