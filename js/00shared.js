/**
 * 00shared.js
 * 01.html / 02.html 共用邏輯：
 *  1. readmeDict + currentMode
 *  2. workspacePanelReady：fetch 載入 partials/workspace-panel.html 並注入 #workspacePanelsRoot
 *  3. window.showToast
 *  4. readme / 指南 modal 開關
 *  5. func 下拉選單 + window.switchMode
 *  6. 透明度滑桿 (#slapper-hide)
 *  7. AutoSave 自動儲存 (localStorage)
 *
 * 載入順序要求：此檔案必須在 01app.js / 01editor.js / 01draw.js / 01embed.js / 02app.js 之前載入，
 * 因為那些檔案會用到 window.workspacePanelReady 與 window.switchMode。
 */

// ====== 1. readmeDict + currentMode ======
window.readmeDict = window.readmeDict || {
  text: {
    title: "readme.md (文字模式說明)",
    content: `<svg class="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg> 文字摸魚模式說明：
    <ol>
      <li>摸魚區塊為文本輸入區，可暗中打字。</li>
      <li>點擊「autoSave」可取消/確認是否自動儲存文檔。(意即，網頁關閉時會將文檔暫存至本機，下次開啟時載入)</li>
      <li>下方「Cnt」為摸魚區塊當下文字計數(不是程式的)。</li>
      <li>點擊「Output」按鈕會下載摸魚區塊文本的內容。</li>
      <li>支援快捷鍵ctrl+S(儲存)</li>
    </ol>`
  },
  draw: {
    title: "readme.md (畫圖模式說明)",
    content: `<svg class="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle>
                  <circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle>
                  <circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle>
                  <circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle>
                  <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.72 1.7-1.65 0-.43-.17-.83-.44-1.13-.27-.3-.43-.7-.43-1.14 0-.92.75-1.68 1.67-1.68H16c3.31 0 6-2.69 6-6 0-4.97-4.48-9-10-9z"></path>
                  </svg> 塗鴉摸魚模式說明：
    <ol>
      <li>摸魚區塊為Canvas畫布。</li>
      <li>尺寸上限為4000x4000(px)</li>
      <li>撤銷/重作上限為各10次</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>圖片匯入:默認以原圖尺寸匯入，若原圖尺寸高於畫布會等比縮放到適合尺寸</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><polyline points="4 7 4 4 20 4 20 7"></polyline><line x1="9" y1="20" x2="15" y2="20"></line><line x1="12" y1="4" x2="12" y2="20"></line></svg>文字輸入:可使用移動工具，但不可變形及縮放；雙擊文字圖層兩次可重新編輯；直接調整顏色即可作用於文字</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>移動及變形:可同時作用多圖層</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="1" stroke-dasharray="4 3"></rect></svg>選區:可同時作用多圖層，有點微妙但懶得改了，自己試試吧(?)</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"></path><circle cx="12" cy="10" r="2"></circle></svg>吸色:吸取當前顯示顏色，非單圖層絕對顏色</li>
      <li><svg class="line-icon" viewBox="0 0 24 24"><path d="M4 20l11-11"></path><path d="M13 8l2-2"></path><path d="M17 3v2M17 7v2M15 5h2M19 5h2"></path></svg>濾鏡:色相/明度/飽和度/對比度，可同時作用多圖層</li>
      <li>圖層:縮圖上方為隱藏圖層、阿爾法鎖定(文字圖層點T可轉換點陣圖層)，雙擊縮圖可調整圖片透明度，雙擊圖層名稱可編輯文字。越左邊越上面，可拖曳或用「<」、「>」排序</li>
      <li>可以滾軸縮放畫布；點擊畫布右下角「100%」可縮回原始尺寸</li>
      <li>支援ctrl+Z(撤銷)、ctrl+Y(重作)、ctrl+S(儲存)三個快捷鍵</li>
      <li>點擊綠色OUTPUT、ctrl+S都可儲存。默認透明png。多圖層會詢問要多圖層分開匯出(以圖層名稱為檔名)還是壓成單張圖(檔名為yyyy-MM-dd)</li>
    </ol>`
  },
  web: {
    title: "readme.md (網頁嵌入說明)",
    content: `<svg class="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg> 網頁瀏覽摸魚模式說明：
    <ol>
      <li>摸魚區塊可嵌入檔案/外部網頁。</li>
      <li>先選擇是上傳檔案/輸入網頁</li>
      <li>檔案目前只支援txt、pdf</li>
      <li>網頁需注意是否支援被嵌入/嵌入後與網頁互動(按按鈕等)是否會直接跳轉該網頁</li>
      <li>(已知嵌入偷偷說會只顯示噗首)</li>
    </ol>`
  },
  markdown: {
    title: "readme.md (標記文檔說明)",
    content: `<svg class="line-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg> 標記文檔摸魚模式說明：
    <ol>
      <li>摸魚區塊為markdown編輯器</li>
      <li>可選擇直接編輯/上傳檔案(支援.md/.txt)</li>
      <li>點擊「autoSave」可取消/確認是否自動儲存文檔。(意即，網頁關閉時會將文檔暫存至本機，下次開啟時載入)</li>
      <li>左右區塊可由上方按鈕各自隱藏</li>
      <li>下載時檔名預設為第一個H1標題.md</li>
      <li>支援ctrl+Z(撤銷)、ctrl+Y(重作)、ctrl+S(儲存)三個快捷鍵</li>
    </ol>`
  }
};

window.currentMode = window.currentMode || 'text';

// ====== 2. workspacePanelReady：fetch 載入摸魚面板內容 ======
window.workspacePanelReady = new Promise((resolve) => {
  function start() {
    const root = document.getElementById('workspacePanelsRoot');
    if (!root) { resolve(); return; }
    fetch('workspace-panel.txt')
      .then(res => res.text())
      .then(html => {
        root.innerHTML = html;
        resolve();
      })
      .catch(err => {
        console.error('摸魚面板(workspace-panel.txt)載入失敗，請確認是用網頁伺服器(如 Live Server)開啟，而非直接雙擊開啟檔案。', err);
        resolve();
      });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
});

(function () {
  // ====== 3. Toast ======
  window.showToast = function (message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    console.log("showToast");
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 2500);
  };

  // ====== 4. Readme / 指南 Modal 開關 (共用邏輯) ======
  function wireModal(triggerId, modalId, closeBtnId) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    const closeBtn = document.getElementById(closeBtnId);
    if (!trigger || !modal) return;

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      modal.classList.toggle('show');
    });
    closeBtn?.addEventListener('click', () => modal.classList.remove('show'));
    document.addEventListener('click', (e) => {
      if (!modal.contains(e.target) && !e.target.closest(`#${triggerId}`)) {
        modal.classList.remove('show');
      }
    });
  }

  function updateReadmeContent() {
    const readmeData = window.readmeDict[window.currentMode] || window.readmeDict.text;
    const readmeTitle = document.getElementById('readmeTitle');
    const readmeBody = document.getElementById('readmeBody');
    if (readmeTitle) readmeTitle.textContent = readmeData.title;
    if (readmeBody) readmeBody.innerHTML = readmeData.content;
  }
  window.updateReadmeContent = updateReadmeContent;

  // ====== 5. func 下拉選單 + switchMode ======
  window.switchMode = function (mode) {
    window.currentMode = mode;
    console.log("mode"+mode);
    document.querySelectorAll('.workspace-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`workspace${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activePanel) activePanel.classList.add('active');

    const downloadOutputBtn = document.getElementById('downloadOutputBtn');
    const btnAutoSave = document.getElementById('btnAutoSave');
    const wordCountInfo = document.getElementById('wordCountInfo');

    if (mode === 'text') {
      console.log("text");
      if (downloadOutputBtn) downloadOutputBtn.classList.add('visible');
      if (btnAutoSave) btnAutoSave.classList.add('visible');
      if (typeof window.updateWordCount === 'function') window.updateWordCount();
    } else {
      console.log("非text");
      if (downloadOutputBtn) downloadOutputBtn.classList.remove('visible');
      if (btnAutoSave) btnAutoSave.classList.remove('visible');
      if (wordCountInfo) wordCountInfo.textContent = 'Cnt: -';
    }

    updateReadmeContent();
  };
  

  function initFuncMenu() {
    const funcTrigger = document.getElementById('btnFuncTrigger');
    const funcDropdownMenu = document.getElementById('funcDropdownMenu');
    if (!funcTrigger || !funcDropdownMenu) return;

    funcTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      funcDropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!funcDropdownMenu.contains(e.target) && e.target !== funcTrigger) {
        funcDropdownMenu.classList.remove('show');
      }
    });

    funcDropdownMenu.querySelectorAll('.menu-option').forEach(option => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedMode = option.getAttribute('data-mode');
        window.switchMode(selectedMode);
        funcDropdownMenu.querySelectorAll('.menu-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        funcDropdownMenu.classList.remove('show');
      });
    });
  }

  // ====== 6. 透明度滑桿 ======
  function initOpacitySlider() {
    const opacitySlider = document.getElementById('slapper-hide');
    const editorWrapper = document.getElementById('overlayEditorSection');
    const opacityValueText = document.getElementById('opacity-value');
    if (!opacitySlider || !editorWrapper) return;

    function updateOpacity(value) {
      editorWrapper.style.opacity = value / 100;
      if (opacityValueText) opacityValueText.textContent = `${value}%`;
    }
    updateOpacity(opacitySlider.value);
    opacitySlider.addEventListener('input', (e) => updateOpacity(e.target.value));
  }

  // ====== 7. AutoSave 自動儲存 & LocalStorage 邏輯 ======
  function initAutoSave() {
    const STORAGE_KEY = window.AUTOSAVE_STORAGE_KEY || 'Slacker01';
    let isAutoSaveEnabled = true;

    const btnAutoSave = document.getElementById('btnAutoSave');
    const autoSaveText = document.getElementById('autoSaveText');
    const overlayTextarea = document.querySelector('#overlayEditorSection textarea');

    function saveToLocalStorage() {
      if (!isAutoSaveEnabled || !overlayTextarea) return;
      localStorage.setItem(STORAGE_KEY, overlayTextarea.value);
    }
    window['saveToLocalStorage'] = saveToLocalStorage;

    if (overlayTextarea) {
      overlayTextarea.addEventListener('input', saveToLocalStorage);
    }

    if (btnAutoSave && autoSaveText) {
      btnAutoSave.addEventListener('click', (e) => {
        console.log("btnAutoSave");
        e.stopPropagation();
        isAutoSaveEnabled = !isAutoSaveEnabled;
        if (isAutoSaveEnabled) {
          autoSaveText.textContent = 'autoSave.check';
          btnAutoSave.classList.remove('disabled');
          saveToLocalStorage();
          window.showToast('已開啟自動儲存 (autoSave.check)');
        } else {
          autoSaveText.textContent = 'autoSave.cancel';
          btnAutoSave.classList.add('disabled');
          localStorage.removeItem(STORAGE_KEY);
          window.showToast('已關閉自動儲存並清除紀錄 (autoSave.cancel)');
        }
      });
    }

    function checkLocalStorageOnLoad() {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData && savedData.trim() !== '') {
        const confirmLoad = confirm('檢測到上次儲存的輸入內容，是否載入？');
        if (confirmLoad) {
          if (overlayTextarea) {
            overlayTextarea.value = savedData;
            if (typeof window.updateWordCount === 'function') window.updateWordCount();
          }
          window.showToast('已成功載入歷史內容');
        } else {
          localStorage.removeItem(STORAGE_KEY);
          window.showToast('已清除歷史紀錄');
        }
      }
    }
    checkLocalStorageOnLoad();
  }
  
  // ====== 初始化 ======
  function init() {
    wireModal('btnReadme', 'readmeModal', 'btnCloseReadme');
    wireModal('btnNotes', 'NotesModal', 'btnCloseNotes');
    initFuncMenu();
    initOpacitySlider(); // #overlayEditorSection / #slapper-hide 皆非 fetch 進來的內容，可立即初始化
    window.workspacePanelReady.then(initAutoSave); // textarea 在 fetch 進來的內容裡，需等待
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
