const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginArea = document.getElementById("loginArea");
const appArea = document.getElementById("appArea");
const userInfo = document.getElementById("userInfo");
const askBtn = document.getElementById("askBtn");
const promptInput = document.getElementById("prompt");
const aiResponse = document.getElementById("aiResponse");
const creditsInfo = document.createElement("p"); // Novo: Mostrar créditos
appArea.insertBefore(creditsInfo, askBtn);

async function session() {
  return new Promise(r => chrome.runtime.sendMessage({ type:"get_session" }, res => r(res)));
}

loginBtn.onclick = () => {
  chrome.runtime.sendMessage({ type:"login" }, async (res) => {
    if (chrome.runtime.lastError) {
      alert("Erro interno: " + chrome.runtime.lastError.message);
      return;
    }
    if (!res) {
      alert("Resposta vazia do background");
      return;
    }
    if (res.error) {
      alert("Falha ao realizar login: " + res.error);
      return;
    }
    const s = await session();
    if (s && s.user_profile) {
      loginArea.classList.add("hidden");
      appArea.classList.remove("hidden");
      userInfo.textContent = s.user_profile.name + " (" + s.user_profile.email + ")";
      creditsInfo.textContent = `Créditos restantes: ${s.user_profile.credits}`;
    } else {
      alert("Login efetuado mas não foi possível recuperar o perfil.");
    }
  });
};

logoutBtn.onclick = () => {
  chrome.runtime.sendMessage({ type:"logout" }, () => {
    appArea.classList.add("hidden");
    loginArea.classList.remove("hidden");
  });
};

askBtn.onclick = async () => {
  const s = await session();
  const prompt = promptInput.value.trim();
  if (!prompt) { aiResponse.textContent = "Digite uma pergunta."; return; }
  if (!s || !s.session_token) { aiResponse.textContent = "Usuário não autenticado."; return; }

  aiResponse.textContent = "Enviando...";
  try {
    const res = await fetch("https://mailmind-backend-09hd.onrender.com/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + s.session_token
      },
      body: JSON.stringify({ text: prompt }) // Sem tone por default
    });
    if (!res.ok) throw new Error("AI backend retornou " + res.status);
    const data = await res.json();
    aiResponse.textContent = data.reply || JSON.stringify(data, null, 2);
    creditsInfo.textContent = `Créditos restantes: ${data.creditsLeft}`; // Atualiza UI
  } catch (e) {
    aiResponse.textContent = "Erro: " + e.message;
  }
};

// Ao abrir popup verifica se já existe sessão
(async () => {
  const s = await session();
  if (s && s.user_profile) {
    loginArea.classList.add("hidden");
    appArea.classList.remove("hidden");
    userInfo.textContent = s.user_profile.name + " (" + s.user_profile.email + ")";
    creditsInfo.textContent = `Créditos restantes: ${s.user_profile.credits}`;
  }
})();