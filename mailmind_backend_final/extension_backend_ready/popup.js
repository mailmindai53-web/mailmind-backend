document.getElementById('sairBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({action: 'SAIR_TOTAL'});
});

// atualiza créditos e esconde/mostra coisas
function refresh() {
  chrome.storage.sync.get(['token', 'credits'], data => {
    if (data.token) {
      document.getElementById('num').textContent = data.credits || 0;
    } else {
      document.getElementById('num').textContent = 0;
    }
  });
}

chrome.storage.onChanged.addListener(refresh);
refresh();
