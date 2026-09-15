/**
 * Application Core & VS Code Layout Logic
 * 負責：Log 偽裝編輯區、側邊欄選單、主題切換、Focus 切換、全域 ReadmeDict
 */

// 避免 readmeDict 重複宣告
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
      <li>點擊「readme.md」下方的「autoSave」可取消/確認是否自動儲存文檔。</li>
      <li>下方「Cnt」為摸魚區塊當下文字計數(不是程式的)。</li>
      <li>點擊「Output」按鈕會下載摸魚區塊文本的內容。</li>
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
      <li>右側工作區為Canvas畫布。</li>
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
      <li>右側工作區可嵌入外部網頁。</li>
      <li>輸入網址並點擊「載入」即可瀏覽。</li>
    </ol>`
  }
};

window.currentMode = 'text';

(function () {
  const defaultErrCode = 
`2026-09-05 00:01:12:402 : 21, LastWhiteID_EMV=6830037
2026-09-05 00:02:43:388 : 21, LastWhiteID_EMV=6830042
2026-09-05 00:02:53:489 : 21, LastDenyID_EMV=338769
2026-09-05 00:03:23:751 : 21, LastDenyID_EMV=338770
2026-09-05 00:03:33:846 : 21, LastWhiteID_EMV=6830044
2026-09-05 00:03:44:864 : 20, Paid: Allow exit, EMV is in white list(Visa), Amount: 65, CurrentFareMode: NORMAL
2026-09-05 00:03:45:051 : 22, Received AG Passage Reply For EMV
2026-09-05 00:03:54:058 : 21, LastWhiteID_EMV=6830048`;

  let globalParsedLines = [];
  let nextLogIndex = 0;

  const editorContainer = document.getElementById('editorContainer');
  const editorTable = document.getElementById('editorTable');
  const overlayEditorSection = document.getElementById('overlayEditorSection');
  const overlayResizeHandle = document.getElementById('overlayResizeHandle');
  const cursorPosInfo = document.getElementById('cursorPosInfo');
  const wordCountInfo = document.getElementById('wordCountInfo');
  const downloadOutputBtn = document.getElementById('downloadOutputBtn');
  const btnAutoSave = document.getElementById('btnAutoSave');
  const minimapCanvas = document.getElementById('minimapCanvas');
  const fileInput = document.getElementById('fileInput');
  const searchBoxMock = document.getElementById('search-box-mock');
  const nextLogBtn = document.getElementById('nextLogBtn');
  // ====== 1. 三鍵獨立主題切換邏輯 ======
  const btnThemeLight = document.getElementById('btnThemeLight');
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemePurple = document.getElementById('btnThemePurple');

  const ctx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

    // 更新按鈕 active 狀態的輔助函式
  function updateThemeButtons(activeBtn) {
    [btnThemeLight, btnThemeDark, btnThemePurple].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  // 1. 切換為淺色主題 (預設)
  if (btnThemeLight) {
    btnThemeLight.addEventListener('click', () => {
      document.body.classList.remove('theme-dark', 'theme-purple');
      updateThemeButtons(btnThemeLight);
      drawMinimap(globalParsedLines);
    });
  }

  // 2. 切換為深色主題
  if (btnThemeDark) {
    btnThemeDark.addEventListener('click', () => {
      document.body.classList.remove('theme-purple');
      document.body.classList.add('theme-dark');
      updateThemeButtons(btnThemeDark);
      drawMinimap(globalParsedLines);
    });
  }

  // 3. 切換為粉紫主題
  if (btnThemePurple) {
    btnThemePurple.addEventListener('click', () => {
      document.body.classList.remove('theme-dark');
      document.body.classList.add('theme-purple');
      updateThemeButtons(btnThemePurple);
      drawMinimap(globalParsedLines);
    });
  }

  // ====== 2. 工作區模式切換邏輯 ======
  window.switchMode = function(mode) {
    window.currentMode = mode;

    document.querySelectorAll('.workspace-panel').forEach(panel => panel.classList.remove('active'));
    const activePanel = document.getElementById(`workspace${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
    if (activePanel) activePanel.classList.add('active');

    if (mode === 'text') {
      if (downloadOutputBtn) downloadOutputBtn.classList.add('visible');
      if (btnAutoSave) btnAutoSave.classList.add('visible');

      if (typeof window.updateWordCount === 'function') window.updateWordCount();
    } else {
      if (downloadOutputBtn) downloadOutputBtn.classList.remove('visible');
      if (btnAutoSave) btnAutoSave.classList.remove('visible');
      if (wordCountInfo) wordCountInfo.textContent = 'Cnt: -';
    }

    updateReadmeContent();
  };

  function updateReadmeContent() {
    const readmeData = window.readmeDict[window.currentMode] || window.readmeDict.text;
    const readmeTitle = document.getElementById('readmeTitle');
    const readmeBody = document.getElementById('readmeBody');

    if (readmeTitle) readmeTitle.textContent = readmeData.title;
    if (readmeBody) readmeBody.innerHTML = readmeData.content;
  }

  // ====== 3. Search Box 點擊觸發檔案選擇 ======
  if (searchBoxMock && fileInput) {
    searchBoxMock.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        renderLogContent(event.target.result, file.name);
      };
      reader.readAsText(file);
    });
  }

  // ====== 4. Next Log 按鈕邏輯 ======
  if (nextLogBtn) {
    nextLogBtn.addEventListener('click', () => {
      if (globalParsedLines.length === 0) return;
      
      const lineText = globalParsedLines[nextLogIndex % globalParsedLines.length];
      const newRow = createRow(lineText, editorTable.children.length);
      editorTable.appendChild(newRow);
      newRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
      nextLogIndex++;
      drawMinimap(globalParsedLines);
    });
  }

  // ====== 5. Log 內容渲染與 Minimap 繪製 ======
  function clearRowHighlights() {
    document.querySelectorAll('.log-line-row').forEach(row => row.classList.remove('active-row'));
  }

  function drawMinimap(lines) {
    if (!minimapCanvas || !ctx) return;
    const rect = minimapCanvas.getBoundingClientRect();
    minimapCanvas.width = rect.width;
    minimapCanvas.height = rect.height;

    ctx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
    if (!lines || lines.length === 0) return;

    const totalLines = Math.max(lines.length, editorTable.children.length);
    const rowHeight = Math.max(1, minimapCanvas.height / totalLines);
    
    // 從 CSS Variable 動態讀取當前主題的 --log-color
    const computedStyle = getComputedStyle(document.body);
    ctx.fillStyle = computedStyle.getPropertyValue('--log-color').trim() || '#a31515';

    for (let i = 0; i < totalLines; i++) {
      const line = lines[i % lines.length] || '';
      const y = i * rowHeight;
      const lineLen = Math.min(line.length, 60);
      const lineWidth = (lineLen / 60) * (minimapCanvas.width - 10);
      ctx.fillRect(4, y, Math.max(2, lineWidth), Math.max(0.8, rowHeight * 0.8));
    }
  }

  function createRow(lineText, index) {
    const row = document.createElement('div');
    row.className = 'log-line-row';

    const numCell = document.createElement('div');
    numCell.className = 'line-number-cell';
    numCell.textContent = index + 1;

    const contentCell = document.createElement('div');
    contentCell.className = 'line-content-cell';

    const logSpan = document.createElement('span');
    logSpan.className = 'log-text';
    logSpan.contentEditable = "true";
    logSpan.textContent = lineText;

    const noteSpan = document.createElement('span');
    noteSpan.className = 'note-text';
    noteSpan.contentEditable = "true";

    const setActive = () => {
      clearRowHighlights();
      row.classList.add('active-row');
      const sel = window.getSelection();
      if (cursorPosInfo) cursorPosInfo.textContent = `Ln ${index + 1}, Col ${sel.focusOffset + 1}`;
    };

    row.addEventListener('click', () => {
      switchActiveBlock(1);
      setActive();
    });

    logSpan.addEventListener('focus', setActive);
    noteSpan.addEventListener('focus', setActive);

    row.appendChild(numCell);
    contentCell.appendChild(logSpan);
    contentCell.appendChild(noteSpan);
    row.appendChild(contentCell);

    return row;
  }

  function renderLogContent(rawText, currentFileName) {
    if (!editorTable) return;
    editorTable.innerHTML = '';
    globalParsedLines = rawText.split(/\r?\n/);
    nextLogIndex = globalParsedLines.length;

    if (currentFileName) {
      const fileNameSpan = searchBoxMock ? searchBoxMock.querySelector('span') : null;
      if (fileNameSpan) fileNameSpan.textContent = currentFileName;
      
      const activeTabName = document.getElementById('activeTabName');
      if (activeTabName) activeTabName.textContent = currentFileName;

      const crumbFileName = document.getElementById('crumbFileName');
      if (crumbFileName) crumbFileName.textContent = currentFileName;
    }

    globalParsedLines.forEach((lineText, index) => {
      editorTable.appendChild(createRow(lineText, index));
    });

    drawMinimap(globalParsedLines);
  }

  // ====== 6. 側邊欄與選單觸發 ======
  const funcTrigger = document.getElementById('btnFuncTrigger');
  const funcDropdownMenu = document.getElementById('funcDropdownMenu');

  if (funcTrigger && funcDropdownMenu) {
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

  // Focus 切換
  function switchActiveBlock(blockNum) {
    if (blockNum === 1) {
      editorContainer.classList.remove('active-block-2');
      editorContainer.classList.add('active-block-1');
    } else {
      editorContainer.classList.remove('active-block-1');
      editorContainer.classList.add('active-block-2');
    }
  }

  document.getElementById('changeBlockBtn')?.addEventListener('click', () => {
    if (editorContainer.classList.contains('active-block-2')) {
      switchActiveBlock(1);
    } else {
      switchActiveBlock(2);
    }
  });

  overlayEditorSection?.addEventListener('click', () => switchActiveBlock(2));

  // 拖曳調整寬度
  let isResizing = false;
  overlayResizeHandle?.addEventListener('mousedown', () => {
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const containerRect = editorContainer.getBoundingClientRect();
    let newWidth = containerRect.right - e.clientX;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > containerRect.width * 0.8) newWidth = containerRect.width * 0.8;
    overlayEditorSection.style.width = `${newWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  // Readme Modal
  const readmeModal = document.getElementById('readmeModal');
  document.getElementById('btnReadme')?.addEventListener('click', (e) => {
    e.stopPropagation();
    readmeModal?.classList.toggle('show');
  });

  document.getElementById('btnCloseReadme')?.addEventListener('click', () => {
    readmeModal?.classList.remove('show');
  });

  document.addEventListener('click', (e) => {
    if (readmeModal && !readmeModal.contains(e.target) && !e.target.closest('#btnReadme')) {
      readmeModal.classList.remove('show');
    }
  });
    // 指南 Modal
  const NotesModal = document.getElementById('NotesModal');
  document.getElementById('btnNotes')?.addEventListener('click', (e) => {
    e.stopPropagation();
    NotesModal?.classList.toggle('show');
  });

  document.getElementById('btnCloseNotes')?.addEventListener('click', () => {
    NotesModal?.classList.remove('show');
  });

  document.addEventListener('click', (e) => {
    if (NotesModal && !NotesModal.contains(e.target) && !e.target.closest('#btnNotes')) {
      NotesModal.classList.remove('show');
    }
  });

  // 側邊欄開關
  document.getElementById('actExplorerBtn')?.addEventListener('click', function() {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    this.classList.toggle('active');
  });

  // 初始化載入
  document.addEventListener('DOMContentLoaded', () => {
    renderLogContent(defaultErrCode);
    window.switchMode('text');
  });
})();

// ====== 7. AutoSave 自動儲存 & LocalStorage (Slacker01) 邏輯 ======
  const STORAGE_KEY = 'Slacker01';
  let isAutoSaveEnabled = true; // 預設開啟 AutoSave

  const btnAutoSave = document.getElementById('btnAutoSave');
  const autoSaveText = document.getElementById('autoSaveText');
  const overlayTextarea = document.querySelector('#overlayEditorSection textarea');

  // 自訂 Toast 提示函式
  function showToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    container.appendChild(toast);

    // 動態新增顯示效果
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // 2.5 秒後自動消失
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => {
        toast.remove();
      });
    }, 2500);
  }

  // 儲存文字至 LocalStorage
  function saveToLocalStorage() {
    if (!isAutoSaveEnabled || !overlayTextarea) return;
    localStorage.setItem(STORAGE_KEY, overlayTextarea.value);
  }

  // 即時監聽右側文字輸入區塊
  if (overlayTextarea) {
    overlayTextarea.addEventListener('input', () => {
      saveToLocalStorage();
    });
  }

  // 切換 AutoSave 狀態
  if (btnAutoSave && autoSaveText) {
    btnAutoSave.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止關閉選單

      isAutoSaveEnabled = !isAutoSaveEnabled;

      if (isAutoSaveEnabled) {
        autoSaveText.textContent = 'autoSave.check';
        btnAutoSave.classList.remove('disabled');
        saveToLocalStorage(); // 立即儲存目前內容
        showToast('已開啟自動儲存 (autoSave.check)');
      } else {
        autoSaveText.textContent = 'autoSave.cancel';
        btnAutoSave.classList.add('disabled');
        localStorage.removeItem(STORAGE_KEY); // 清除紀錄
        showToast('已關閉自動儲存並清除紀錄 (autoSave.cancel)');
      }
    });
  }

  // 網頁初始化：檢查是否有歷史輸入紀錄
  function checkLocalStorageOnLoad() {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData && savedData.trim() !== '') {
      const confirmLoad = confirm('檢測到上次儲存的輸入內容，是否載入？');
      if (confirmLoad) {
        if (overlayTextarea) {
          overlayTextarea.value = savedData;
          if (typeof window.updateWordCount === 'function') {
            window.updateWordCount(); // 更新字數統計
          }
        }
        showToast('已成功載入歷史內容');
      } else {
        localStorage.removeItem(STORAGE_KEY); // 選否則清除
        showToast('已清除歷史紀錄');
      }
    }
  }

  // 於 DOMContentLoaded 觸發歷史紀錄檢查
  document.addEventListener('DOMContentLoaded', () => {
    checkLocalStorageOnLoad();
  });



  