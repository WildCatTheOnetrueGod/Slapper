document.addEventListener('DOMContentLoaded', () => {
  // --- 1. 定義顏色項目與預設值 ---
  const defaultColors = {
    '--body-bg':'#8c8e8f',
    '--bar-bg-color': '#121212',
    '--barBtn-bg-color': 'rgba(255, 255, 255, 0.1)',
    '--text-color': '#cccccc',
    '--readme-bg-color':'#a1a1a1',
    '--readme-text-color':'#444444',
    '--default-font':'rgb(141, 89, 89)',
    '--overlay-bg': 'rgba(30, 30, 30, 0.9)',
    '--overlay-border': '#444444',
    '--overlay-option':'#444444',
  };

  const colorLabels = {
    '--body-bg':'背景顏色',
    '--bar-bg-color': '底列背景',
    '--barBtn-bg-color': '底列按鈕',
    '--text-color': '底列文字',
    '--readme-bg-color':'說明框',
    '--readme-text-color':'說明文字',
    '--default-font':'摸魚區字體',
    '--overlay-bg': '摸魚區背景',
    '--overlay-border': '摸魚區邊框',
    '--overlay-option':'摸魚區選框',
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

// --- 6. Overlay 拖曳與縮放邏輯 (含四邊與角落邊界約束) ---
  const overlay = document.getElementById('overlayEditorSection');
  const header = document.getElementById('overlayHeader');
  const container = document.querySelector('.content-row');

  // ----------------- 拖曳 (Drag) 邏輯 -----------------
  let isDragging = false;
  let dragOffsetX = 0, dragOffsetY = 0;

  header.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragOffsetX = e.clientX - overlay.offsetLeft;
    dragOffsetY = e.clientY - overlay.offsetTop;
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', stopDrag);
  });

  function onDrag(e) {
    if (!isDragging) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const overlayWidth = overlay.offsetWidth;
    const overlayHeight = overlay.offsetHeight;

    let newLeft = e.clientX - dragOffsetX;
    let newTop = e.clientY - dragOffsetY;

    // 限制於容器可視範圍內
    if (newLeft < 0) newLeft = 0;
    if (newLeft + overlayWidth > containerWidth) newLeft = containerWidth - overlayWidth;
    if (newTop < 0) newTop = 0;
    if (newTop + overlayHeight > containerHeight) newTop = containerHeight - overlayHeight;

    overlay.style.left = `${newLeft}px`;
    overlay.style.top = `${newTop}px`;
  }

  function stopDrag() {
    isDragging = false;
    document.removeEventListener('pointermove', onDrag);
    document.removeEventListener('pointerup', stopDrag);
  }

  // ----------------- 縮放 (Resize) 邏輯 -----------------
  let isResizing = false;
  let currentDirection = '';
  let startX = 0, startY = 0;
  let startWidth = 0, startHeight = 0;
  let startLeft = 0, startTop = 0;

  const minWidth = 150;
  const minHeight = 100;

  // 綁定所有 .resizer 元素的 pointerdown 事件
  const resizers = overlay.querySelectorAll('.resizer');
  resizers.forEach(resizer => {
    resizer.addEventListener('pointerdown', (e) => {
      e.stopPropagation(); // 避免觸發拖曳或其他父級事件
      e.preventDefault();  // 防止拖拽文字選取現象

      isResizing = true;
      currentDirection = resizer.dataset.direction;

      startX = e.clientX;
      startY = e.clientY;
      startWidth = overlay.offsetWidth;
      startHeight = overlay.offsetHeight;
      startLeft = overlay.offsetLeft;
      startTop = overlay.offsetTop;

      document.addEventListener('pointermove', onResize);
      document.addEventListener('pointerup', stopResize);
    });
  });

  function onResize(e) {
    if (!isResizing) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    // 根據拉伸方向計算新的寬、高、Left、Top
    // 向東 (右) 縮放
    if (currentDirection.includes('r')) {
      newWidth = Math.min(startWidth + deltaX, containerWidth - startLeft);
      newWidth = Math.max(newWidth, minWidth);
    }

    // 向南 (下) 縮放
    if (currentDirection.includes('b')) {
      newHeight = Math.min(startHeight + deltaY, containerHeight - startTop);
      newHeight = Math.max(newHeight, minHeight);
    }

    // 向西 (左) 縮放
    if (currentDirection.includes('l')) {
      let possibleWidth = startWidth - deltaX;
      let maxLeftShift = startLeft; // 左拉最多到 0
      let actualDeltaX = deltaX;

      if (possibleWidth < minWidth) {
        actualDeltaX = startWidth - minWidth;
      } else if (startLeft + deltaX < 0) {
        actualDeltaX = -startLeft;
      }

      newLeft = startLeft + actualDeltaX;
      newWidth = startWidth - actualDeltaX;
    }

    // 向北 (上) 縮放
    if (currentDirection.includes('t')) {
      let possibleHeight = startHeight - deltaY;
      let actualDeltaY = deltaY;

      if (possibleHeight < minHeight) {
        actualDeltaY = startHeight - minHeight;
      } else if (startTop + deltaY < 0) {
        actualDeltaY = -startTop;
      }

      newTop = startTop + actualDeltaY;
      newHeight = startHeight - actualDeltaY;
    }

    // 更新 DOM 樣式
    overlay.style.width = `${newWidth}px`;
    overlay.style.height = `${newHeight}px`;
    overlay.style.left = `${newLeft}px`;
    overlay.style.top = `${newTop}px`;
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    currentDirection = '';
    document.removeEventListener('pointermove', onResize);
    document.removeEventListener('pointerup', stopResize);
  }

  // 視窗 resize 時的邊界校正
  window.addEventListener('resize', () => {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (overlay.offsetLeft + overlay.offsetWidth > containerWidth) {
      let newLeft = Math.max(0, containerWidth - overlay.offsetWidth);
      overlay.style.left = `${newLeft}px`;
    }
    if (overlay.offsetTop + overlay.offsetHeight > containerHeight) {
      let newTop = Math.max(0, containerHeight - overlay.offsetHeight);
      overlay.style.top = `${newTop}px`;
    }
  });
  // ====== 5. Focus 切換 (CHANGE) ======
  function switchActiveBlock(blockNum) {
    console.log("switchActiveBlock");
    if (blockNum === 1) {
      container.classList.remove('active-block-2');
      container.classList.add('active-block-1');
    } else {
      container.classList.remove('active-block-1');
      container.classList.add('active-block-2');
    }
  }

  document.getElementById('changeBlockBtn')?.addEventListener('click', () => {
    if (container.classList.contains('active-block-2')) {
      switchActiveBlock(1);
    } else {
      switchActiveBlock(2);
    }
  });
  overlayEditorSection?.addEventListener('click', () => switchActiveBlock(2));

  // ====== 8. 初始化 ======
  // 摸魚面板內容 (workspaceText/Draw/Web) 是透過 00shared.js 的 fetch 非同步載入，
  // 所以初始 switchMode('text') 必須等 workspacePanelReady 完成後才能呼叫。
  window.workspacePanelReady.then(() => {
    window.switchMode('text');
  });
});