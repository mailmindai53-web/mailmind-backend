// No onclick do loginBtn, adicione isso no início:
loginBtn.onclick = () => {
  loginBtn.textContent = "Abrindo login..."; // ← Feedback
  chrome.runtime.sendMessage({ type:"login" }, async (res) => {
    loginBtn.textContent = "Entrar com Google"; // ← Reset
    // ... resto igual
  });
};

// Função para buscar os créditos atualizados do backend
async function atualizarCreditos() {
  try {
    const result = await chrome.storage.local.get(["session_token"]);
    if (!result.session_token) return;

    const res = await fetch("https://mailmind-backend-09hd.onrender.com/api/auth/me", {
      headers: {
        "Authorization": "Bearer " + result.session_token
      }
    });

    if (res.ok) {
      const data = await res.json();
      const creditsElement = document.getElementById("credits-count"); // ajuste o ID se for diferente
      if (creditsElement) {
        creditsElement.textContent = data.user.credits;
      }
    }
  } catch (err) {
    console.log("Não conseguiu atualizar créditos");
  }
}

// Roda quando abre o popup
document.addEventListener("DOMContentLoaded", atualizarCreditos);

// Roda toda vez que o usuário clica no popup (atualiza em tempo real)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CREDITS_UPDATED") {
    atualizarCreditos();
  }
});
