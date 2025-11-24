// Substitua TODA a função startGoogleLogin por esta versão abaixo:

function startGoogleLogin(sendResponse) {
  console.log("Iniciando login Google com método 100% confiável...");
  const authUrl = buildAuthUrl();

  // MÉTODO ÚNICO E IMBATÍVEL: abre em aba nova
  chrome.tabs.create({
    url: authUrl,
    active: true
  }, (tab) => {
    console.log("Aba de login aberta:", tab.id);

    // Listener que espera a aba fechar (usuário terminou o login)
    const listener = (tabId, changeInfo, updatedTab) => {
      if (tabId === tab.id && changeInfo.status === "complete") {
        // Verifica se a URL mudou pra redirect (contém access_token)
        if (updatedTab.url && updatedTab.url.includes(chrome.identity.getRedirectURL())) {
          chrome.tabs.onUpdated.removeListener(listener);
          
          try {
            const accessToken = extractAccessTokenFromUrl(updatedTab.url);
            if (!accessToken) throw new Error("Token não encontrado");

            (async () => {
              try {
                const userinfo = await fetchUserInfo(accessToken);
                const result = await sendToBackendAndSave(accessToken, userinfo);
                chrome.tabs.remove(tab.id); // fecha a aba automaticamente
                sendResponse({ ok: true, user: result.user_profile });
                chrome.runtime.sendMessage({ type: "LOGIN_SUCCESS" });
              } catch (err) {
                console.error("Erro final:", err);
                sendResponse({ error: err.message });
              }
            })();
          } catch (err) {
            sendResponse({ error: err.message });
          }
        }
      }
    };

    chrome.tabs.onUpdated.addListener(listener);

    // Caso o usuário feche a aba manualmente
    chrome.tabs.onRemoved.addListener(function removed(tabId) {
      if (tabId === tab.id) {
        chrome.tabs.onUpdated.removeListener(listener);
        chrome.tabs.onRemoved.removeListener(removed);
        sendResponse({ error: "Login cancelado" });
      }
    });
  });

  return true; // mantém a mensagem viva
}
