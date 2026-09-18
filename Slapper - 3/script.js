document.addEventListener('DOMContentLoaded', () => {
  // --- 1. 定義顏色項目與預設值 ---
  const defaultColors = {
    '--bg-color': '#1e1e1e',
    '--bar-bg-color': '#121212',
    '--text-color': '#cccccc',
    '--overlay-bg': '#252526',
    '--overlay-border': '#444444'
  };

  const colorLabels = {
    '--bg-color': '背景顏色',
    '--bar-bg-color': '底列顏色',
    '--text-color': '文字顏色',
    '--overlay-bg': '浮動區背景',
    '--overlay-border': '邊框顏色'
  };

  let currentColors = { ...defaultColors };

  // 載入 localStorage 顏色設定
  function loadSavedColors() {
    const saved = localStorage.getItem('color');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        currentColors = { ...defaultColors, ...parsed };
      } catch (e) {
        console.error('解析 localStorage color 失敗', e);
      }
    }
    applyColors(currentColors);
  }

  // 將色彩套用至 CSS 變數
  function applyColors(colorsObj) {
    Object.keys(colorsObj).forEach(key => {
      document.documentElement.style.setProperty(key, colorsObj[key]);
    });
  }

  // 初始化調色盤面板 HTML 列表
  const colorListSection = document.getElementById('colorListSection');
  function initColorPickerUI() {
    colorListSection.innerHTML = '';
    Object.keys(defaultColors).forEach(key => {
      const item = document.createElement('div');
      item.className = 'color-item';
      
      const label = document.createElement('span');
      label.textContent = colorLabels[key] || key;

      const input = document.createElement('input');
      input.type = 'color';
      input.value = currentColors[key];
      input.dataset.varName = key;

      // 實時預覽
      input.addEventListener('input', (e) => {
        document.documentElement.style.setProperty(e.target.dataset.varName, e.target.value);
      });

      item.appendChild(label);
      item.appendChild(input);
      colorListSection.appendChild(item);
    });
  }

  loadSavedColors();

  // --- 2. 🎨 調色盤邏輯 ---
  const btnThemeColor = document.getElementById('btnThemeColor');
  const colorPickerPanel = document.getElementById('colorPickerPanel');
  const btnCloseColorPicker = document.getElementById('btnCloseColorPicker');
  const btnResetColor = document.getElementById('btnResetColor');
  const btnSaveColor = document.getElementById('btnSaveColor');

  btnThemeColor.addEventListener('click', () => {
    initColorPickerUI();
    colorPickerPanel.classList.add('show');
  });

  function closeColorPanel() {
    colorPickerPanel.classList.remove('show');
    // 若未點擊「調整」儲存，關閉時還原為當前生效的 currentColors
    applyColors(currentColors);
  }

  btnCloseColorPicker.addEventListener('click', closeColorPanel);

  // 恢復預設按鈕
  btnResetColor.addEventListener('click', () => {
    localStorage.removeItem('color');
    currentColors = { ...defaultColors };
    applyColors(currentColors);
    initColorPickerUI();
  });

  // 調整（儲存）按鈕
  btnSaveColor.addEventListener('click', () => {
    const inputs = colorListSection.querySelectorAll('input[type="color"]');
    inputs.forEach(input => {
      currentColors[input.dataset.varName] = input.value;
    });
    localStorage.setItem('color', JSON.stringify(currentColors));
    applyColors(currentColors);
    colorPickerPanel.classList.remove('show');
  });

  // --- 3. 模組彈窗控制 (指南 & Readme) ---
  const btnNotesTrigger = document.getElementById('btnNotesTrigger');
  const NotesModal = document.getElementById('NotesModal');
  const btnCloseNotes = document.getElementById('btnCloseNotes');

  btnNotesTrigger.addEventListener('click', () => NotesModal.classList.add('show'));
  btnCloseNotes.addEventListener('click', () => NotesModal.classList.remove('show'));

  const btnReadmeTrigger = document.getElementById('btnReadmeTrigger');
  const readmeModal = document.getElementById('readmeModal');
  const btnCloseReadme = document.getElementById('btnCloseReadme');

  btnReadmeTrigger.addEventListener('click', () => readmeModal.classList.add('show'));
  btnCloseReadme.addEventListener('click', () => readmeModal.classList.remove('show'));

  // --- 4. func 下拉選單邏輯 ---
  const btnFuncTrigger = document.getElementById('btnFuncTrigger');
  const funcDropdownMenu = document.getElementById('funcDropdownMenu');

  btnFuncTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    funcDropdownMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    funcDropdownMenu.classList.remove('show');
  });

  funcDropdownMenu.querySelectorAll('.menu-option').forEach(option => {
    option.addEventListener('click', function() {
      funcDropdownMenu.querySelectorAll('.menu-option').forEach(opt => opt.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // --- 5. PDF 上傳與展示邏輯 ---
  const pdfUploader = document.getElementById('pdfUploader');
  const mainIframe = document.getElementById('mainIframe');

  pdfUploader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      const fileURL = URL.createObjectURL(file);
      mainIframe.src = fileURL;
    }
  });

  // --- 6. Overlay 拖曳與縮放邏輯 ---
  const overlay = document.getElementById('overlayEditorSection');
  const header = document.getElementById('overlayHeader');
  const resizer = document.getElementById('overlayResizer');

  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    offsetX = e.clientX - overlay.offsetLeft;
    offsetY = e.clientY - overlay.offsetTop;
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  });

  function onDrag(e) {
    if (!isDragging) return;
    overlay.style.left = `${e.clientX - offsetX}px`;
    overlay.style.top = `${e.clientY - offsetY}px`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
  }

  // 縮放邏輯
  let isResizing = false;
  let startW = 0, startH = 0, startX = 0, startY = 0;

  resizer.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = overlay.offsetWidth;
    startH = overlay.offsetHeight;
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', stopResize);
  });

  function onResize(e) {
    if (!isResizing) return;
    const newWidth = startW + (e.clientX - startX);
    const newHeight = startH + (e.clientY - startY);
    if (newWidth > 150) overlay.style.width = `${newWidth}px`;
    if (newHeight > 100) overlay.style.height = `${newHeight}px`;
  }

  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', stopResize);
  }
});