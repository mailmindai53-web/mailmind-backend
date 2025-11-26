chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'SAIR_TOTAL') {
    chrome.storage.sync.get(['token'], result => {
      if (result.token) {
        fetch(`https://accounts.google.com/o/oauth2/revoke?token=${result.token}`);
        chrome.identity.removeCachedAuthToken({token: result.token});
      }
    });

    // mata tudo mesmo
    chrome.identity.clearAllCachedAuthTokens();
    chrome.storage.sync.clear(() => {
      chrome.runtime.reload(); // força reload da extensão inteira
    });
  }
});
