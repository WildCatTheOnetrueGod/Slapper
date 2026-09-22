/**
 * 01app.js — 01 頁面專屬邏輯 (已瘦身)
 * 負責：Log 偽裝編輯區、Minimap、三主題切換、側欄收合、
 *       第一/二區塊 Focus 切換 (CHANGE)、摸魚面板寬度拖曳
 *
 * 已搬到 00shared.js 的功能 (01/02 共用，不在此檔重複)：
 *   readmeDict、currentMode、workspacePanelReady、showToast、
 *   readme/指南 modal 開關、func 選單、switchMode、透明度滑桿、AutoSave
 * ⚠ 此檔案依賴 00shared.js，HTML 中請確保 00shared.js 先載入。
 */

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
  const minimapCanvas = document.getElementById('minimapCanvas');
  const fileInput = document.getElementById('fileInput');
  const searchBoxMock = document.getElementById('search-box-mock');
  const nextLogBtn = document.getElementById('nextLogBtn');

  // ====== 1. 三鍵獨立主題切換邏輯 ======
  const btnThemeLight = document.getElementById('btnThemeLight');
  const btnThemeDark = document.getElementById('btnThemeDark');
  const btnThemePurple = document.getElementById('btnThemePurple');

  const ctx = minimapCanvas ? minimapCanvas.getContext('2d') : null;

  function updateThemeButtons(activeBtn) {
    [btnThemeLight, btnThemeDark, btnThemePurple].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });
    if (activeBtn) activeBtn.classList.add('active');
  }

  btnThemeLight?.addEventListener('click', () => {
    document.body.classList.remove('theme-dark', 'theme-purple');
    updateThemeButtons(btnThemeLight);
    drawMinimap(globalParsedLines);
  });
  btnThemeDark?.addEventListener('click', () => {
    document.body.classList.remove('theme-purple');
    document.body.classList.add('theme-dark');
    updateThemeButtons(btnThemeDark);
    drawMinimap(globalParsedLines);
  });
  btnThemePurple?.addEventListener('click', () => {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-purple');
    updateThemeButtons(btnThemePurple);
    drawMinimap(globalParsedLines);
  });

  // ====== 2. Search Box 點擊觸發檔案選擇 ======
  if (searchBoxMock && fileInput) {
    searchBoxMock.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (event) {
        renderLogContent(event.target.result, file.name);
      };
      reader.readAsText(file);
    });
  }

  // ====== 3. Next Log 按鈕邏輯 ======
  nextLogBtn?.addEventListener('click', () => {
    if (globalParsedLines.length === 0) return;
    const lineText = globalParsedLines[nextLogIndex % globalParsedLines.length];
    const newRow = createRow(lineText, editorTable.children.length);
    editorTable.appendChild(newRow);
    newRow.scrollIntoView({ behavior: 'smooth', block: 'end' });
    nextLogIndex++;
    drawMinimap(globalParsedLines);
  });

  // ====== 4. Log 內容渲染與 Minimap 繪製 ======
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

  // ====== 5. Focus 切換 (CHANGE) ======
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

  // ====== 6. 摸魚面板寬度拖曳 ======
  let isResizing = false;
  overlayResizeHandle?.addEventListener('pointerdown', () => {
    isResizing = true;
    document.body.style.cursor = 'ew-resize';
  });
  document.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const containerRect = editorContainer.getBoundingClientRect();
    let newWidth = containerRect.right - e.clientX;
    if (newWidth < 150) newWidth = 150;
    if (newWidth > containerRect.width * 0.8) newWidth = containerRect.width * 0.8;
    overlayEditorSection.style.width = `${newWidth}px`;
  });
  document.addEventListener('pointerup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
    }
  });

  // ====== 7. 側邊欄開關 ======
  document.getElementById('actExplorerBtn')?.addEventListener('click', function () {
    document.getElementById('sidebar')?.classList.toggle('collapsed');
    this.classList.toggle('active');
  });

  // ====== 8. 初始化 ======
  // 摸魚面板內容 (workspaceText/Draw/Web) 是透過 00shared.js 的 fetch 非同步載入，
  // 所以初始 switchMode('text') 必須等 workspacePanelReady 完成後才能呼叫。
  window.workspacePanelReady.then(() => {
    renderLogContent(defaultErrCode);
    window.switchMode('text');
  });
})();
