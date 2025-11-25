// popup/popup.js
document.getElementById("loginBtn").onclick = () => {
  const btn = document.getElementById("loginBtn");
  btn.innerHTML = "Abrindo Google...";
  btn.disabled = true;
  chrome.runtime.sendMessage({ type: "login" }, () => {
    setTimeout(() => {
      btn.innerHTML = '<img src="https://www.google.com/favicon.ico" width="20"> Entrar com Google';
      btn.disabled = false;
    }, 3000);
  });
};

// Carrega usuário
chrome.runtime.sendMessage({ type: "get_session" }, (res) => {
  if (res?.user_profile) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("user").classList.remove("hidden");
    document.getElementById("name").textContent = res.user_profile.name || res.user_profile.email;
    document.getElementById("credits").textContent = res.user_profile.credits;
  }
});

// Atualiza se logar em outra aba
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REFRESH_POPUP") location.reload();
});
