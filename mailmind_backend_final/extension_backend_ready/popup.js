// popup/popup.js — LOGOUT 100% FUNCIONAL

document.getElementById("loginBtn").onclick = () => {
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.innerHTML = "Abrindo Google...";
  chrome.runtime.sendMessage({ type: "login" });
};

chrome.runtime.sendMessage({ type: "get_session" }, (res) => {
  if (res?.user_profile) {
    document.getElementById("login").classList.add("hidden");
    document.getElementById("user").classList.remove("hidden");
    document.getElementById("name").textContent = res.user_profile.name || res.user_profile.email;
    document.getElementById("credits").textContent = res.user_profile.credits ?? 0;
  }
});

// BOTÃO DE SAIR — FUNCIONA NA HORA
document.querySelector("#user button").onclick = () => {
  chrome.runtime.sendMessage({ type: "logout" }, () => {
    location.reload();
  });
};

// Atualiza se logar em outra aba
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REFRESH_POPUP") location.reload();

  // Atualiza o popup quando o background mandar
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "REFRESH_POPUP") {
    location.reload();
  }
});
});
