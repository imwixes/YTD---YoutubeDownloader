// ...existing code...
const urlInput = document.getElementById('urlInput');
const downloadBtn = document.getElementById('downloadBtn');
const progressArea = document.getElementById('progressArea');
const pathLabel = document.getElementById('pathLabel');
const changePathBtn = document.getElementById('changePath');
const githubLink = document.getElementById('githubLink');

let outDir = null;

async function init() {
  const downloads = await window.api.getDownloadPath();
  outDir = downloads;
  pathLabel.textContent = `Путь: ${outDir}`;
}

downloadBtn.addEventListener('click', () => {
  const url = urlInput.value.trim();
  if (!url) {
    progressArea.textContent = 'Введите URL.';
    return;
  }
  progressArea.textContent = 'Запущено...';
  window.api.download(url, outDir);
});

changePathBtn.addEventListener('click', async () => {
  const chosen = await window.api.chooseFolder();
  if (chosen) {
    outDir = chosen;
    pathLabel.textContent = `Путь: ${outDir}`;
  }
});

window.api.onProgress((data) => {
  if (data.error) {
    progressArea.textContent = `Ошибка: ${data.error}`;
    return;
  }

  if (data.done) {
    progressArea.textContent = `Готово (код: ${data.code}).`; 
    return;
  }

  if (data.line) {
    // show last few lines
    const existing = progressArea.textContent.split('\n').filter(Boolean);
    existing.push(data.line);
    const lines = existing.slice(-6);
    progressArea.textContent = lines.join('\n');
  }
});

githubLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.api.openExternal('https://github.com/imwixes');
});

init();
