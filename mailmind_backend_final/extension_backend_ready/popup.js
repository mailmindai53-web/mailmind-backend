

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


// ... (resto igual)

// No final do popup.js, adicione isso:
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "LOGIN_SUCCESS") {
    // Recarrega o popup pra mostrar UI logada
    window.location.reload();
  }
});

loginBtn.onclick = () => {
  loginBtn.textContent = "Abrindo Google...";
  loginBtn.disabled = true;

  chrome.runtime.sendMessage({ type: "login" }, (res) => {
    loginBtn.textContent = "Entrar com Google";
    loginBtn.disabled = false;

    if (res?.error) {
      alert("Erro: " + res.error);
    }
    // Se sucesso, o popup vai recarregar automaticamente pelo listener
  });
};
    }
  });
};
