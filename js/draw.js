/**
 * 摸摸圖 (Draw Mode) - 圖層繪圖工具
 * ⚠ 唯一修改處：整個 IIFE 內容包在 window.workspacePanelReady.then(...) 裡執行
 *    (因為本檔案大量在頂層直接 document.getElementById(...)，不像 01editor.js/01embed.js
 *     有包一層 init()，所以用「整段包住」的方式做最小改動，內部邏輯完全不變)。
 */
(function () {
  window.workspacePanelReady.then(function () {
  // ====== 0. DOM refs ======
  const sizePicker = document.getElementById('drawSizePicker');
  const drawMain = document.getElementById('drawMain');
  const canvasWidthInput = document.getElementById('canvasWidthInput');
  const canvasHeightInput = document.getElementById('canvasHeightInput');
  const btnCreateCanvas = document.getElementById('btnCreateCanvas');

  const drawCanvasArea = document.getElementById('drawCanvasArea');
  const drawCanvasViewport = document.getElementById('drawCanvasViewport');
  const drawCanvasStack = document.getElementById('drawCanvasStack');
  const mainCanvas = document.getElementById('drawMainCanvas');
  const overlayCanvas = document.getElementById('drawOverlayCanvas');
  const mainCtx = mainCanvas.getContext('2d');
  const overlayCtx = overlayCanvas.getContext('2d');
  const btnZoomReset = document.getElementById('btnZoomReset');

  const colorPicker = document.getElementById('colorPicker');
  const brushSizeSlider = document.getElementById('brushSizeSlider');
  const eraserSizeSlider = document.getElementById('eraserSizeSlider');
  const btnClearLayer = document.getElementById('btnClearLayer');
  const btnUndo = document.getElementById('btnUndo');
  const btnRedo = document.getElementById('btnRedo');
  const toolBtns = {
    import: document.getElementById('toolImport'),
    brush: document.getElementById('toolBrush'),
    eraser: document.getElementById('toolEraser'),
    text: document.getElementById('toolText'),
    move: document.getElementById('toolMove'),
    select: document.getElementById('toolSelect'),
    eyedrop: document.getElementById('toolEyedrop'),
    filter: document.getElementById('toolFilter'),
  };
  const drawImportInput = document.getElementById('drawImportInput');

  const selectFloatMenu = document.getElementById('selectFloatMenu');
  const btnInvertSelect = document.getElementById('btnInvertSelect');

  const filterPanel = document.getElementById('filterPanel');
  const filterPanelHeader = document.getElementById('filterPanelHeader');
  const filterHue = document.getElementById('filterHue');
  const filterBrightness = document.getElementById('filterBrightness');
  const filterSaturation = document.getElementById('filterSaturation');
  const filterContrast = document.getElementById('filterContrast');
  const btnFilterConfirm = document.getElementById('btnFilterConfirm');
  const btnFilterCancel = document.getElementById('btnFilterCancel');

  const drawLayersList = document.getElementById('drawLayersList');
  const btnAddLayer = document.getElementById('btnAddLayer');
  const btnDeleteLayer = document.getElementById('btnDeleteLayer');
  const btnLayerUp = document.getElementById('btnLayerUp');
  const btnLayerDown = document.getElementById('btnLayerDown');

  const toastContainer = document.getElementById('toastContainer');
  const downloadOutputBtn = document.getElementById('downloadOutputBtn');

  const OVERLAY_PAD = 60; // 讓控制框/旋轉點可以畫到畫布外

  // ====== 1. State ======
  let canvasW = 800, canvasH = 600;
  let zoom = 1;
  let layers = []; // index 0 = topmost (leftmost thumbnail)
  let selectedLayerIds = new Set();
  let activeLayerId = null;
  let currentTool = 'brush';
  let brushColor = '#000000';
  let brushSize = 10, eraserSize = 10;
  let selectionRect = null; // {x,y,w,h}
  let selectionInverted = false;
  let history = [], redoStack = [];
  let isDrawing = false, lastPoint = null;
  let isMarqueeDragging = false, marqueeStart = null;
  let transformSession = null;
  let committedTransform = { dx: 0, dy: 0, scaleX: 1, scaleY: 1, rotation: 0 };
  let filterBackup = null;
  let editingText = null; // {layer, textarea, menu}
  let layerIdCounter = 0;
  let drawInitialized = false;

  function genId() { return 'layer_' + (++layerIdCounter); }
  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function resetCommittedTransform() { committedTransform = { dx: 0, dy: 0, scaleX: 1, scaleY: 1, rotation: 0 }; }
  function composeForDisplay(committed, delta) {
    return {
      dx: committed.dx + delta.dx,
      dy: committed.dy + delta.dy,
      scaleX: committed.scaleX * delta.scaleX,
      scaleY: committed.scaleY * delta.scaleY,
      rotation: committed.rotation + delta.rotation,
    };
  }

  function showToast(message) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      toast.addEventListener('transitionend', () => toast.remove());
    }, 2000);
  }

  // ====== 2. Layer helpers ======
  function createLayer(name, opts) {
    opts = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = canvasW; canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    if (opts.fill) { ctx.fillStyle = opts.fill; ctx.fillRect(0, 0, canvasW, canvasH); }
    return {
      id: genId(), name: name, canvas, ctx,
      visible: true, opacity: 1, alphaLocked: false,
      type: opts.type || 'normal',
      text: opts.text || null,
    };
  }

  function getActiveLayer() { return layers.find(l => l.id === activeLayerId) || null; }

  function selectOnly(id) {
    selectedLayerIds = new Set([id]);
    activeLayerId = id;
    resetCommittedTransform();
  }

  function renderComposite() {
    mainCtx.clearRect(0, 0, canvasW, canvasH);
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible) continue;
      mainCtx.globalAlpha = l.opacity;
      mainCtx.drawImage(l.canvas, 0, 0);
    }
    mainCtx.globalAlpha = 1;
  }

  function updateThumb(layer) {
    const el = drawLayersList.querySelector(`[data-id="${layer.id}"] .draw-layer-thumb`);
    if (el) el.src = layer.canvas.toDataURL();
  }

  // ====== 3. History ======
  function serializeLayers() {
    return {
      order: layers.map(l => l.id),
      layersData: layers.map(l => ({
        id: l.id, name: l.name, visible: l.visible, opacity: l.opacity,
        alphaLocked: l.alphaLocked, type: l.type,
        text: l.text ? { ...l.text } : null,
        dataURL: l.canvas.toDataURL(),
      })),
      selected: Array.from(selectedLayerIds), active: activeLayerId,
    };
  }

  function restoreSnapshot(snap) {
    return Promise.all(snap.layersData.map(ld => new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = canvasW; canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        res({
          id: ld.id, name: ld.name, canvas, ctx,
          visible: ld.visible, opacity: ld.opacity, alphaLocked: ld.alphaLocked,
          type: ld.type, text: ld.text ? { ...ld.text } : null,
        });
      };
      img.src = ld.dataURL;
    }))).then(builtLayers => {
      const map = {};
      builtLayers.forEach(l => map[l.id] = l);
      layers = snap.order.map(id => map[id]);
      selectedLayerIds = new Set(snap.selected);
      activeLayerId = snap.active;
      resetCommittedTransform();
      renderComposite();
      renderLayerList();
      renderOverlay();
    });
  }

  function updateUndoRedoButtons() {
    if (btnUndo) btnUndo.disabled = history.length === 0;
    if (btnRedo) btnRedo.disabled = redoStack.length === 0;
  }

  function saveHistorySnapshot() {
    history.push(serializeLayers());
    if (history.length > 10) history.shift();
    redoStack = [];
    updateUndoRedoButtons();
  }

  btnUndo.addEventListener('click', () => {
    if (history.length === 0) return;
    if (editingText) finalizeText();
    redoStack.push(serializeLayers());
    if (redoStack.length > 10) redoStack.shift();
    const snap = history.pop();
    updateUndoRedoButtons();
    restoreSnapshot(snap).then(() => showToast('撤銷一次操作'));
  });

  btnRedo.addEventListener('click', () => {
    if (redoStack.length === 0) return;
    if (editingText) finalizeText();
    history.push(serializeLayers());
    if (history.length > 10) history.shift();
    const snap = redoStack.pop();
    updateUndoRedoButtons();
    restoreSnapshot(snap).then(() => showToast('重作一次操作'));
  });

  // ====== 4. Canvas creation (size picker) ======
  function validateSizeInput(input) {
    input.addEventListener('input', () => {
      const v = parseInt(input.value);
      if (!isNaN(v) && v > 4000) {
        alert('不得超出4000px!');
        input.value = '';
      }
    });
  }
  validateSizeInput(canvasWidthInput);
  validateSizeInput(canvasHeightInput);

  btnCreateCanvas.addEventListener('click', () => {
    canvasW = clamp(parseInt(canvasWidthInput.value) || 800, 1, 4000);
    canvasH = clamp(parseInt(canvasHeightInput.value) || 600, 1, 4000);

    mainCanvas.width = canvasW; mainCanvas.height = canvasH;
    overlayCanvas.width = canvasW + OVERLAY_PAD * 2;
    overlayCanvas.height = canvasH + OVERLAY_PAD * 2;

    const bg = createLayer('背景', { fill: '#ffffff' });
    layers = [bg];
    selectOnly(bg.id);
    history = []; redoStack = [];
    updateUndoRedoButtons();

    sizePicker.style.display = 'none';
    drawMain.style.display = 'flex';
    drawInitialized = true;

    zoom = 1;
    applyZoom();
    renderComposite();
    renderLayerList();
    setTool('brush');
  });

  // ====== 5. Zoom ======
  function applyZoom() {
    const dispW = canvasW * zoom, dispH = canvasH * zoom;
    drawCanvasStack.style.width = dispW + 'px';
    drawCanvasStack.style.height = dispH + 'px';
    mainCanvas.style.width = dispW + 'px'; mainCanvas.style.height = dispH + 'px';

    const padDisp = OVERLAY_PAD * zoom;
    overlayCanvas.style.width = (dispW + padDisp * 2) + 'px';
    overlayCanvas.style.height = (dispH + padDisp * 2) + 'px';
    overlayCanvas.style.left = (-padDisp) + 'px';
    overlayCanvas.style.top = (-padDisp) + 'px';

    if (editingText) updateTextEditorPosition();
    renderOverlay();
  }
  drawCanvasViewport.addEventListener('wheel', (e) => {
    if (!drawInitialized) return;
    e.preventDefault();
    zoom = clamp(zoom + (e.deltaY < 0 ? 0.1 : -0.1), 0.1, 5);
    applyZoom();
  }, { passive: false });

  btnZoomReset?.addEventListener('click', () => {
    if (!drawInitialized) return;
    zoom = 1;
    applyZoom();
  });

  function getCanvasCoords(e) {
    const rect = mainCanvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
  }
  function canvasToPageCoords(x, y) {
    const rect = mainCanvas.getBoundingClientRect();
    const areaRect = drawCanvasArea.getBoundingClientRect();
    return { left: rect.left - areaRect.left + x * zoom, top: rect.top - areaRect.top + y * zoom };
  }

  // ====== 6. Tools ======
  function setTool(tool) {
    if (currentTool === 'filter' && tool !== 'filter') closeFilterPanel(true);
    if (editingText && tool !== 'text') finalizeText();
    if (transformSession) endTransform();
    currentTool = tool;
    Object.entries(toolBtns).forEach(([k, btn]) => btn.classList.toggle('active', k === tool));
    overlayCanvas.className = '';
    if (tool === 'brush' || tool === 'eraser') overlayCanvas.classList.add('cursor-none');
    else if (tool === 'move') overlayCanvas.classList.add('cursor-move');
    else if (tool === 'select' || tool === 'eyedrop') overlayCanvas.classList.add('cursor-crosshair');
    else if (tool === 'text') overlayCanvas.classList.add('cursor-text');
    else overlayCanvas.classList.add('cursor-default');
    selectFloatMenu.style.display = (tool === 'select' && selectionRect) ? 'block' : 'none';
    renderOverlay();
  }

  toolBtns.brush.addEventListener('click', () => setTool('brush'));
  toolBtns.eraser.addEventListener('click', () => setTool('eraser'));
  toolBtns.move.addEventListener('click', () => setTool('move'));
  toolBtns.select.addEventListener('click', () => {
    if (currentTool === 'select' && selectionRect) { clearSelection(); return; }
    setTool('select');
  });
  toolBtns.eyedrop.addEventListener('click', () => setTool('eyedrop'));
  toolBtns.text.addEventListener('click', () => setTool('text'));
  toolBtns.filter.addEventListener('click', () => {
    if (selectedLayerIds.size === 0) { showToast('請先選擇圖層'); return; }
    setTool('filter');
    openFilterPanel();
  });
  toolBtns.import.addEventListener('click', () => drawImportInput.click());

  colorPicker.addEventListener('input', () => {
    brushColor = colorPicker.value;
    if (editingText) { editingText.layer.text.color = brushColor; renderTextLayer(editingText.layer); renderComposite(); updateThumb(editingText.layer); }
  });
  brushSizeSlider.addEventListener('input', () => {
    brushSize = parseInt(brushSizeSlider.value);
    if (currentTool !== 'brush') setTool('brush');
  });
  eraserSizeSlider.addEventListener('input', () => {
    eraserSize = parseInt(eraserSizeSlider.value);
    if (currentTool !== 'eraser') setTool('eraser');
  });

  // ====== 7. Import image ======
  drawImportInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let dw = img.naturalWidth, dh = img.naturalHeight;
        if (dw > canvasW || dh > canvasH) {
          const scale = Math.min(canvasW / dw, canvasH / dh);
          dw *= scale; dh *= scale;
        }
        const dx = (canvasW - dw) / 2, dy = (canvasH - dh) / 2;
        saveHistorySnapshot();
        const name = file.name.replace(/\.[^.]+$/, '');
        const newLayer = createLayer(name, { type: 'normal' });
        newLayer.ctx.drawImage(img, dx, dy, dw, dh);
        insertLayerAtSelected(newLayer);
        selectOnly(newLayer.id);
        renderComposite(); renderLayerList();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    drawImportInput.value = '';
  });

  function insertLayerAtSelected(newLayer) {
    let idx = 0;
    if (selectedLayerIds.size > 0) {
      const indices = layers.map((l, i) => selectedLayerIds.has(l.id) ? i : -1).filter(i => i >= 0);
      idx = indices.length ? Math.min(...indices) : 0;
    }
    layers.splice(idx, 0, newLayer);
  }

  // ====== 8. Paint (brush / eraser) ======
  function clipToSelection(ctx) {
    if (!selectionRect) return;
    ctx.beginPath();
    if (selectionInverted) {
      ctx.rect(0, 0, canvasW, canvasH);
      ctx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      ctx.clip('evenodd');
    } else {
      ctx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      ctx.clip();
    }
  }
  function withSelectionClip(ctx, fn) {
    if (selectionRect) { ctx.save(); clipToSelection(ctx); fn(); ctx.restore(); }
    else fn();
  }
  function paintDot(ctx, x, y, size, erase, alphaLocked, color) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    if (erase) { ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = '#000'; }
    else { ctx.globalCompositeOperation = alphaLocked ? 'source-atop' : 'source-over'; ctx.fillStyle = color; }
    ctx.fill();
    ctx.restore();
  }
  function strokeSegment(ctx, x0, y0, x1, y1, size, erase, alphaLocked, color) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / Math.max(2, size / 4)));
    withSelectionClip(ctx, () => {
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        paintDot(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size, erase, alphaLocked, color);
      }
    });
  }

  // ====== 9. Overlay rendering (selection / handles / cursor) ======
  function withOverlayTransform(fn) {
    overlayCtx.save();
    overlayCtx.translate(OVERLAY_PAD, OVERLAY_PAD);
    fn();
    overlayCtx.restore();
  }

  function drawSelectionDim() {
    if (!selectionRect) return;
    overlayCtx.save();
    overlayCtx.fillStyle = 'rgba(0,0,0,0.35)';
    overlayCtx.beginPath();
    if (!selectionInverted) {
      overlayCtx.rect(0, 0, canvasW, canvasH);
      overlayCtx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      overlayCtx.fill('evenodd');
    } else {
      overlayCtx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
      overlayCtx.fill();
    }
    overlayCtx.restore();
  }
  function drawSelectionMarquee() {
    if (!selectionRect) return;
    overlayCtx.save();
    overlayCtx.strokeStyle = '#000';
    overlayCtx.setLineDash([6 / zoom, 4 / zoom]);
    overlayCtx.lineWidth = 1 / zoom;
    overlayCtx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    overlayCtx.restore();
  }

  function renderOverlay() {
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    withOverlayTransform(() => {
      drawSelectionDim();
      drawSelectionMarquee();
      if (currentTool === 'move' && selectedLayerIds.size > 0 && !editingText) {
        drawTransformHandles();
      }
    });
  }

  function anySelectedIsText() { return layers.some(l => selectedLayerIds.has(l.id) && l.type === 'text'); }

  function getDisplayTransform() {
    return transformSession ? composeForDisplay(committedTransform, transformSession.current) : committedTransform;
  }

  function drawTransformHandles() {
    const t = getDisplayTransform();
    const cx = canvasW / 2 + t.dx, cy = canvasH / 2 + t.dy;
    const hw = (canvasW / 2) * t.scaleX, hh = (canvasH / 2) * t.scaleY;
    overlayCtx.save();
    overlayCtx.translate(cx, cy);
    overlayCtx.rotate(t.rotation);
    overlayCtx.strokeStyle = '#007acc';
    overlayCtx.lineWidth = 1.5 / zoom;
    overlayCtx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    const r = 6 / zoom;
    const showScaleHandles = !anySelectedIsText();
    overlayCtx.fillStyle = '#ffffff';
    if (showScaleHandles) {
      const pts = [[-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, -hh], [0, hh], [-hw, 0], [hw, 0]];
      pts.forEach(([px, py]) => { overlayCtx.beginPath(); overlayCtx.arc(px, py, r, 0, Math.PI * 2); overlayCtx.fill(); overlayCtx.stroke(); });
      overlayCtx.beginPath(); overlayCtx.moveTo(0, -hh); overlayCtx.lineTo(0, -hh - 24 / zoom); overlayCtx.stroke();
      overlayCtx.beginPath(); overlayCtx.arc(0, -hh - 24 / zoom, r, 0, Math.PI * 2); overlayCtx.fill(); overlayCtx.stroke();
    }
    overlayCtx.restore();
  }

  function hitTestHandle(pt) {
    const t = getDisplayTransform();
    const cx = canvasW / 2 + t.dx, cy = canvasH / 2 + t.dy;
    const hw = (canvasW / 2) * t.scaleX, hh = (canvasH / 2) * t.scaleY;
    const cos = Math.cos(-t.rotation), sin = Math.sin(-t.rotation);
    const lx = (pt.x - cx) * cos - (pt.y - cy) * sin;
    const ly = (pt.x - cx) * sin + (pt.y - cy) * cos;
    const r = 10 / zoom;
    const showScaleHandles = !anySelectedIsText();
    if (showScaleHandles) {
      const named = { tl: [-hw, -hh], tr: [hw, -hh], bl: [-hw, hh], br: [hw, hh], t: [0, -hh], b: [0, hh], l: [-hw, 0], right: [hw, 0], rotate: [0, -hh - 24 / zoom] };
      for (const key in named) {
        const [px, py] = named[key];
        if (Math.hypot(lx - px, ly - py) < r) return key;
      }
    }
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) return 'move';
    return null;
  }

  // ====== 10. Pointer interactions ======
  overlayCanvas.addEventListener('pointerdown', (e) => {
    if (!drawInitialized) return;
    const pt = getCanvasCoords(e);

    if (currentTool === 'brush' || currentTool === 'eraser') {
      const layer = getActiveLayer();
      if (!layer) return;
      if (layer.type === 'text') { showToast('無法在文字圖層上繪圖，請先點陣化'); return; }
      saveHistorySnapshot();
      isDrawing = true; lastPoint = pt;
      strokeSegment(layer.ctx, pt.x, pt.y, pt.x, pt.y, currentTool === 'brush' ? brushSize : eraserSize, currentTool === 'eraser', layer.alphaLocked, brushColor);
      renderComposite();
    } else if (currentTool === 'select') {
      const layer = getActiveLayer();
      if (layer && layer.type === 'text') { showToast('無法選取文字圖層!'); return; }
      isMarqueeDragging = true; marqueeStart = pt;
      selectionRect = { x: pt.x, y: pt.y, w: 0, h: 0 };
      selectFloatMenu.style.display = 'none';
    } else if (currentTool === 'move') {
      if (selectedLayerIds.size === 0) return;
      const handle = hitTestHandle(pt);
      if (!handle) return;
      saveHistorySnapshot();
      const hasSelection = !!selectionRect;
      const snapshots = layers.filter(l => selectedLayerIds.has(l.id)).map(l => {
        if (l.type === 'text') return { layer: l, origText: { ...l.text } };
        const full = document.createElement('canvas'); full.width = canvasW; full.height = canvasH;
        full.getContext('2d').drawImage(l.canvas, 0, 0);
        let moving = full, base = null;
        if (hasSelection) {
          moving = document.createElement('canvas'); moving.width = canvasW; moving.height = canvasH;
          const mctx = moving.getContext('2d');
          mctx.save(); clipToSelection(mctx); mctx.drawImage(full, 0, 0); mctx.restore();
          base = document.createElement('canvas'); base.width = canvasW; base.height = canvasH;
          const bctx = base.getContext('2d');
          bctx.drawImage(full, 0, 0);
          bctx.save(); clipToSelection(bctx); bctx.clearRect(0, 0, canvasW, canvasH); bctx.restore();
        }
        return { layer: l, bitmap: moving, base };
      });
      transformSession = { handle, start: pt, snapshots, current: { dx: 0, dy: 0, scaleX: 1, scaleY: 1, rotation: 0 } };
    } else if (currentTool === 'eyedrop') {
      pickColor(pt);
    } else if (currentTool === 'text') {
      if (editingText) finalizeText();
      saveHistorySnapshot();
      startTextLayer(pt);
    }
  });

  window.addEventListener('pointermove', (e) => {
    if (!drawInitialized) return;
    const pt = getCanvasCoords(e);

    if (isDrawing && (currentTool === 'brush' || currentTool === 'eraser')) {
      const layer = getActiveLayer();
      if (layer) {
        strokeSegment(layer.ctx, lastPoint.x, lastPoint.y, pt.x, pt.y, currentTool === 'brush' ? brushSize : eraserSize, currentTool === 'eraser', layer.alphaLocked, brushColor);
        lastPoint = pt;
        renderComposite();
      }
    } else if (isMarqueeDragging) {
      selectionRect = {
        x: Math.min(marqueeStart.x, pt.x), y: Math.min(marqueeStart.y, pt.y),
        w: Math.abs(pt.x - marqueeStart.x), h: Math.abs(pt.y - marqueeStart.y),
      };
    } else if (transformSession) {
      updateTransform(pt, e.shiftKey);
    }

    renderOverlay();
    if (drawInitialized) drawCursorPreview(pt);
  });

  window.addEventListener('pointerup', () => {
    if (isDrawing) {
      isDrawing = false; lastPoint = null;
      const layer = getActiveLayer();
      if (layer) updateThumb(layer);
    }
    if (isMarqueeDragging) {
      isMarqueeDragging = false;
      if (selectionRect.w < 2 || selectionRect.h < 2) { selectionRect = null; selectFloatMenu.style.display = 'none'; }
      else { selectionInverted = false; positionSelectMenu(); selectFloatMenu.style.display = 'block'; }
      resetCommittedTransform();
      renderOverlay();
    }
    if (transformSession) endTransform();
  });

  document.addEventListener('keydown', (e) => {
    if (!drawInitialized || window.currentMode !== 'draw') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (!(e.ctrlKey && (e.key === 'z' || e.key === 'y' || e.key === 's'))) return;
    }
    if (e.key === 'Escape') {
      if (editingText) finalizeText();
      clearSelection();
      if (filterPanel.style.display !== 'none') { closeFilterPanel(true); setTool('brush'); }
    } else if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); btnUndo.click(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); btnRedo.click(); }
    else if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); drawExportOutput(); }
  });

  function clearSelection() {
    selectionRect = null;
    selectFloatMenu.style.display = 'none';
    resetCommittedTransform();
    renderOverlay();
  }
  document.addEventListener('click', (e) => {
    if (currentTool === 'select' && selectionRect && !overlayCanvas.contains(e.target) && !selectFloatMenu.contains(e.target)) {
      clearSelection();
    }
  });
  function positionSelectMenu() {
    const rect = mainCanvas.getBoundingClientRect();
    const areaRect = drawCanvasArea.getBoundingClientRect();
    selectFloatMenu.style.left = (rect.left - areaRect.left + (selectionRect.x + selectionRect.w / 2) * zoom - 30) + 'px';
    selectFloatMenu.style.top = (rect.top - areaRect.top + selectionRect.y * zoom - 32) + 'px';
  }
  btnInvertSelect.addEventListener('click', () => { selectionInverted = !selectionInverted; resetCommittedTransform(); renderOverlay(); });

  // ====== 11. 全域：點擊文字輸入框/選單以外的地方 -> 結束文字編輯 ======
  document.addEventListener('pointerdown', (e) => {
    if (!editingText) return;
    if (editingText.textarea.contains(e.target) || editingText.menu.contains(e.target) || e.target === overlayCanvas) return;
    finalizeText();
  });

  // ====== 12. Cursor preview ======
  function drawCursorPreview(pt) {
    withOverlayTransform(() => {
      if (currentTool === 'brush' || currentTool === 'eraser') {
        const size = currentTool === 'brush' ? brushSize : eraserSize;
        overlayCtx.beginPath();
        overlayCtx.arc(pt.x, pt.y, size / 2, 0, Math.PI * 2);
        overlayCtx.strokeStyle = currentTool === 'eraser' ? '#000' : brushColor;
        overlayCtx.setLineDash(currentTool === 'eraser' ? [4 / zoom, 3 / zoom] : []);
        overlayCtx.lineWidth = 1.5 / zoom;
        overlayCtx.stroke();
      } else if (currentTool === 'eyedrop') {
        const cxp = clamp(Math.round(pt.x), 0, canvasW - 1), cyp = clamp(Math.round(pt.y), 0, canvasH - 1);
        const data = mainCtx.getImageData(cxp, cyp, 1, 1).data;
        overlayCtx.beginPath();
        overlayCtx.arc(pt.x, pt.y, 10 / zoom, 0, Math.PI * 2);
        overlayCtx.fillStyle = `rgba(${data[0]},${data[1]},${data[2]},${data[3] / 255})`;
        overlayCtx.fill();
        overlayCtx.strokeStyle = '#000'; overlayCtx.lineWidth = 1 / zoom; overlayCtx.stroke();
      }
    });
  }
  overlayCanvas.addEventListener('pointerleave', () => renderOverlay());

  function pickColor(pt) {
    const cxp = clamp(Math.round(pt.x), 0, canvasW - 1), cyp = clamp(Math.round(pt.y), 0, canvasH - 1);
    const data = mainCtx.getImageData(cxp, cyp, 1, 1).data;
    const hex = '#' + [data[0], data[1], data[2]].map(v => v.toString(16).padStart(2, '0')).join('');
    brushColor = hex; colorPicker.value = hex;
  }

  // ====== 13. Clear layer ======
  btnClearLayer.addEventListener('click', () => {
    if (selectedLayerIds.size === 0) return;
    saveHistorySnapshot();
    layers.forEach(l => {
      if (selectedLayerIds.has(l.id)) { l.ctx.clearRect(0, 0, canvasW, canvasH); updateThumb(l); }
    });
    renderComposite();
  });

  // ====== 14. Move / Transform ======
  function updateTransform(pt, shiftKey) {
    const s = transformSession;
    if (s.handle === 'move') {
      s.current.dx = pt.x - s.start.x;
      s.current.dy = pt.y - s.start.y;
    } else if (s.handle === 'rotate' || shiftKey) {
      const cx = canvasW / 2, cy = canvasH / 2;
      const a1 = Math.atan2(s.start.y - cy, s.start.x - cx);
      const a2 = Math.atan2(pt.y - cy, pt.x - cx);
      s.current.rotation = a2 - a1;
    } else {
      const dx = (pt.x - s.start.x) / (canvasW / 2);
      const dy = (pt.y - s.start.y) / (canvasH / 2);
      if (['tl', 'tr', 'bl', 'br'].includes(s.handle)) {
        const factor = 1 + (s.handle === 'tl' ? -(dx + dy) / 2 : s.handle === 'br' ? (dx + dy) / 2 : s.handle === 'tr' ? (dx - dy) / 2 : (-dx + dy) / 2);
        s.current.scaleX = clamp(factor, 0.05, 20);
        s.current.scaleY = clamp(factor, 0.05, 20);
      } else if (s.handle === 't' || s.handle === 'b') {
        s.current.scaleY = clamp(1 + (s.handle === 'b' ? dy : -dy), 0.05, 20);
      } else if (s.handle === 'l' || s.handle === 'right') {
        s.current.scaleX = clamp(1 + (s.handle === 'right' ? dx : -dx), 0.05, 20);
      }
    }
    applyTransformToLayers();
  }

  function applyTransformToLayers() {
    const s = transformSession;
    const cx = canvasW / 2, cy = canvasH / 2;
    s.snapshots.forEach(snap => {
      const l = snap.layer;
      if (l.type === 'text') {
        l.text.x = (snap.origText.x || 0) + s.current.dx;
        l.text.y = (snap.origText.y || 0) + s.current.dy;
        renderTextLayer(l);
        return;
      }
      l.ctx.clearRect(0, 0, canvasW, canvasH);
      if (snap.base) l.ctx.drawImage(snap.base, 0, 0);
      l.ctx.save();
      l.ctx.translate(cx + s.current.dx, cy + s.current.dy);
      l.ctx.rotate(s.current.rotation);
      l.ctx.scale(s.current.scaleX, s.current.scaleY);
      l.ctx.translate(-cx, -cy);
      l.ctx.drawImage(snap.bitmap, 0, 0);
      l.ctx.restore();
    });
    renderComposite();
  }

  function endTransform() {
    if (transformSession) {
      transformSession.snapshots.forEach(s => updateThumb(s.layer));
      committedTransform = composeForDisplay(committedTransform, transformSession.current);
    }
    transformSession = null;
    renderOverlay();
  }

  // ====== 15. Text tool ======
  function startTextLayer(pt) {
    const layer = createLayer('文字圖層', { type: 'text', text: { content: '', font: 'sans-serif', size: 32, x: pt.x, y: pt.y, color: brushColor } });
    insertLayerAtSelected(layer);
    selectOnly(layer.id);
    renderLayerList(); renderComposite();
    openTextEditor(layer);
  }

  function openTextEditor(layer) {
    const pos = canvasToPageCoords(layer.text.x, layer.text.y);
    const textarea = document.createElement('textarea');
    textarea.className = 'draw-text-input';
    textarea.value = layer.text.content || '';
    textarea.spellcheck = false;
    textarea.style.left = pos.left + 'px';
    textarea.style.top = pos.top + 'px';
    textarea.style.font = `${layer.text.size * zoom}px ${layer.text.font}`;
    textarea.style.color = layer.text.color;
    drawCanvasArea.appendChild(textarea);

    const menu = document.createElement('div');
    menu.className = 'draw-text-menu';
    menu.innerHTML = `
      <select class="tf-font">
        <option value="sans-serif">Sans</option>
        <option value="serif">Serif</option>
        <option value="monospace">Mono</option>
        <option value="cursive">Cursive</option>
      </select>
      <input type="number" class="tf-size" min="8" max="300" value="${layer.text.size}">`;
    drawCanvasArea.appendChild(menu);
    menu.querySelector('.tf-font').value = layer.text.font;

    editingText = { layer, textarea, menu };
    autoGrow(textarea);
    positionTextMenu(textarea, menu);

    textarea.addEventListener('input', () => {
      layer.text.content = textarea.value;
      autoGrow(textarea);
      positionTextMenu(textarea, menu);
      renderTextLayer(layer); renderComposite(); updateThumb(layer);
    });
    menu.querySelector('.tf-font').addEventListener('change', (e) => {
      layer.text.font = e.target.value;
      textarea.style.font = `${layer.text.size * zoom}px ${layer.text.font}`;
      autoGrow(textarea); positionTextMenu(textarea, menu);
      renderTextLayer(layer); renderComposite(); updateThumb(layer);
    });
    menu.querySelector('.tf-size').addEventListener('input', (e) => {
      layer.text.size = clamp(parseInt(e.target.value) || 32, 8, 300);
      textarea.style.font = `${layer.text.size * zoom}px ${layer.text.font}`;
      autoGrow(textarea); positionTextMenu(textarea, menu);
      renderTextLayer(layer); renderComposite(); updateThumb(layer);
    });
    setTimeout(() => { textarea.focus(); textarea.select(); }, 0);
  }

  function autoGrow(textarea) {
    textarea.style.width = '1px'; textarea.style.height = '1px';
    textarea.style.width = Math.max(40, textarea.scrollWidth) + 'px';
    textarea.style.height = Math.max(20, textarea.scrollHeight) + 'px';
  }
  function positionTextMenu(textarea, menu) {
    menu.style.left = textarea.offsetLeft + 'px';
    menu.style.top = (textarea.offsetTop + textarea.offsetHeight + 6) + 'px';
  }
  function updateTextEditorPosition() {
    if (!editingText) return;
    const { layer, textarea, menu } = editingText;
    const pos = canvasToPageCoords(layer.text.x, layer.text.y);
    textarea.style.left = pos.left + 'px';
    textarea.style.top = pos.top + 'px';
    textarea.style.font = `${layer.text.size * zoom}px ${layer.text.font}`;
    autoGrow(textarea);
    positionTextMenu(textarea, menu);
  }

  function finalizeText() {
    if (!editingText) return;
    const { layer, textarea, menu } = editingText;
    textarea.remove(); menu.remove();
    editingText = null;
    if (!layer.text.content.trim()) {
      layers = layers.filter(l => l.id !== layer.id);
      selectedLayerIds.delete(layer.id);
    }
    renderLayerList(); renderComposite();
  }

  function renderTextLayer(layer) {
    const ctx = layer.ctx;
    ctx.clearRect(0, 0, canvasW, canvasH);
    ctx.font = `${layer.text.size}px ${layer.text.font}`;
    ctx.fillStyle = layer.text.color;
    ctx.textBaseline = 'top';
    const lines = layer.text.content.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, layer.text.x, layer.text.y + i * layer.text.size * 1.2));
  }

  // ====== 16. Filter (可拖出 workspaceDraw：掛載於 document.body) ======
  function openFilterPanel() {
    filterBackup = layers.filter(l => selectedLayerIds.has(l.id)).map(l => {
      const c = document.createElement('canvas'); c.width = canvasW; c.height = canvasH;
      c.getContext('2d').drawImage(l.canvas, 0, 0);
      return { layer: l, bitmap: c };
    });
    [filterHue, filterBrightness, filterSaturation, filterContrast].forEach(s => s.value = 0);
    document.body.appendChild(filterPanel);
    filterPanel.style.display = 'flex';
    filterPanel.style.left = '120px'; filterPanel.style.top = '120px';
  }
  function applyFilterPreview() {
  const hue = parseInt(filterHue.value);
  const bri = parseInt(filterBrightness.value); // -100 到 100
  const sat = parseInt(filterSaturation.value);
  const con = parseInt(filterContrast.value);

  filterBackup.forEach(({ layer, bitmap }) => {
    layer.ctx.clearRect(0, 0, canvasW, canvasH);
    layer.ctx.save();
    
    withSelectionClip(layer.ctx, () => {
      // 1. 先畫出原始圖片
      layer.ctx.drawImage(bitmap, 0, 0);

      // 2. 獲取像素數據進行 Offset 加減算（讓純黑也能加亮）
      if (bri !== 0) {
        const imgData = layer.ctx.getImageData(0, 0, canvasW, canvasH);
        const data = imgData.data;
        const offset = Math.round((bri / 100) * 255); // 將 -100~100 轉為 -255~255

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; // 透明像素跳過
          data[i]     = Math.min(255, Math.max(0, data[i] + offset));     // Red
          data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset)); // Green
          data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset)); // Blue
        }
        layer.ctx.putImageData(imgData, 0, 0);
      }

      // 3. 其他顏色（Hue, Saturation, Contrast）繼續使用 CSS Filter 處理
      if (hue !== 0 || sat !== 0 || con !== 0) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasW; tempCanvas.height = canvasH;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(layer.canvas, 0, 0);

        layer.ctx.clearRect(0, 0, canvasW, canvasH);
        layer.ctx.filter = `hue-rotate(${hue}deg) saturate(${100 + sat}%) contrast(${100 + con}%)`;
        layer.ctx.drawImage(tempCanvas, 0, 0);
        layer.ctx.filter = 'none';
      }
    });

    layer.ctx.restore();

    // 選區反向/非選區處理...
    if (selectionRect) {
      layer.ctx.save();
      layer.ctx.beginPath();
      if (selectionInverted) { 
        layer.ctx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h); 
        layer.ctx.clip(); 
      } else {
        layer.ctx.rect(0, 0, canvasW, canvasH);
        layer.ctx.rect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        layer.ctx.clip('evenodd');
      }
      layer.clearRect(0, 0, canvasW, canvasH);
      layer.ctx.drawImage(bitmap, 0, 0);
      layer.ctx.restore();
    }
  });

  renderComposite();
}
  [filterHue, filterBrightness, filterSaturation, filterContrast].forEach(s => s.addEventListener('input', applyFilterPreview));

  function closeFilterPanel(cancel) {
    if (filterBackup) {
      if (cancel) {
        filterBackup.forEach(({ layer, bitmap }) => { layer.ctx.clearRect(0, 0, canvasW, canvasH); layer.ctx.drawImage(bitmap, 0, 0); });
        renderComposite();
      } else {
        const preSnap = {
          order: layers.map(l => l.id), selected: Array.from(selectedLayerIds), active: activeLayerId,
          layersData: layers.map(l => {
            const backup = filterBackup.find(f => f.layer.id === l.id);
            return { id: l.id, name: l.name, visible: l.visible, opacity: l.opacity, alphaLocked: l.alphaLocked, type: l.type,
              text: l.text ? { ...l.text } : null, dataURL: backup ? backup.bitmap.toDataURL() : l.canvas.toDataURL() };
          })
        };
        history.push(preSnap);
        if (history.length > 10) history.shift();
        redoStack = [];
        updateUndoRedoButtons();
      }
      filterBackup.forEach(({ layer }) => updateThumb(layer));
    }
    filterBackup = null;
    filterPanel.style.display = 'none';
    drawCanvasArea.appendChild(filterPanel);
  }
  btnFilterConfirm.addEventListener('click', () => { closeFilterPanel(false); setTool('brush'); });
  btnFilterCancel.addEventListener('click', () => { closeFilterPanel(true); setTool('brush'); });

  (function makeDraggable() {
    let dragging = false, offX = 0, offY = 0;
    filterPanelHeader.addEventListener('pointerdown', (e) => {
      dragging = true; e.preventDefault();
      const r = filterPanel.getBoundingClientRect();
      offX = e.clientX - r.left; offY = e.clientY - r.top;
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      filterPanel.style.left = (e.clientX - offX) + 'px';
      filterPanel.style.top = (e.clientY - offY) + 'px';
    });
    window.addEventListener('pointerup', () => dragging = false);
  })();

  // ====== 17. Layers panel rendering ======
  function renderLayerList() {
    drawLayersList.innerHTML = '';
    layers.forEach(layer => {
      const item = document.createElement('div');
      item.className = 'draw-layer-item' + (selectedLayerIds.has(layer.id) ? ' selected' : '') + (!layer.visible ? ' hidden-layer' : '');
      item.dataset.id = layer.id;
      item.draggable = true;

      const thumbWrap = document.createElement('div');
      thumbWrap.className = 'draw-layer-thumb-wrap';
      const thumb = document.createElement('img');
      thumb.className = 'draw-layer-thumb';
      thumb.src = layer.canvas.toDataURL();
      thumbWrap.appendChild(thumb);

      const eyeBtn = document.createElement('button');
      eyeBtn.className = 'draw-layer-mini-btn draw-layer-eye-btn';
      eyeBtn.innerHTML = layer.visible
        ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5-6M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.2 3.2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
      eyeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); saveHistorySnapshot();
        layer.visible = !layer.visible; renderComposite(); renderLayerList();
      });
      thumbWrap.appendChild(eyeBtn);

      if (layer.type === 'text') {
        const rasterBtn = document.createElement('button');
        rasterBtn.className = 'draw-layer-mini-btn draw-layer-raster-btn';
        rasterBtn.textContent = 'T';
        rasterBtn.style.fontSize = '9px'; rasterBtn.style.fontWeight = 'bold';
        rasterBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (editingText && editingText.layer.id === layer.id) finalizeText();
          if (!layers.includes(layer)) return;
          if (confirm('是否點陣化圖層?')) {
            saveHistorySnapshot();
            layer.type = 'normal'; layer.text = null;
            renderLayerList();
          }
        });
        thumbWrap.appendChild(rasterBtn);
      } else {
        const lockBtn = document.createElement('button');
        lockBtn.className = 'draw-layer-mini-btn draw-layer-lock-btn';
        lockBtn.innerHTML = layer.alphaLocked
          ? '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.5-2.3"/></svg>';
        lockBtn.addEventListener('click', (e) => {
          e.stopPropagation(); saveHistorySnapshot();
          layer.alphaLocked = !layer.alphaLocked; renderLayerList();
        });
        thumbWrap.appendChild(lockBtn);
      }

      thumbWrap.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (layer.type === 'text') {
          if (editingText && editingText.layer.id === layer.id) return;
          if (editingText) finalizeText();
          saveHistorySnapshot();
          selectedLayerIds = new Set([layer.id]);
          activeLayerId = layer.id;
          resetCommittedTransform();
          updateLayerSelectionUI();
          openTextEditor(layer);
          return;
        }
        openOpacityPopup(layer, thumbWrap);
      });

      const nameEl = document.createElement('div');
      nameEl.className = 'draw-layer-name';
      nameEl.textContent = layer.name;
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.value = layer.name;
        nameEl.textContent = ''; nameEl.appendChild(input);
        input.focus(); input.select();
        const commit = () => {
          const v = input.value.trim();
          if (v && v !== layer.name) { saveHistorySnapshot(); layer.name = v; }
          renderLayerList();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); });
      });

      item.addEventListener('click', () => {
        selectLayerFromClickEvent(layer, event);
      });

      item.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', layer.id));
      item.addEventListener('dragover', (e) => e.preventDefault());
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        if (!draggedId || draggedId === layer.id) return;
        saveHistorySnapshot();
        const from = layers.findIndex(l => l.id === draggedId);
        const to = layers.findIndex(l => l.id === layer.id);
        const [moved] = layers.splice(from, 1);
        layers.splice(to, 0, moved);
        renderLayerList(); renderComposite();
      });

      item.appendChild(thumbWrap);
      item.appendChild(nameEl);
      drawLayersList.appendChild(item);
    });
  }

  function selectLayerFromClickEvent(layer, e) {
    if (e.ctrlKey || e.metaKey) {
      if (selectedLayerIds.has(layer.id)) selectedLayerIds.delete(layer.id);
      else selectedLayerIds.add(layer.id);
    } else if (e.shiftKey && activeLayerId) {
      const i1 = layers.findIndex(l => l.id === activeLayerId);
      const i2 = layers.findIndex(l => l.id === layer.id);
      const [lo, hi] = [Math.min(i1, i2), Math.max(i1, i2)];
      for (let i = lo; i <= hi; i++) selectedLayerIds.add(layers[i].id);
    } else {
      selectedLayerIds = new Set([layer.id]);
    }
    activeLayerId = layer.id;
    resetCommittedTransform();
    updateLayerSelectionUI();
    renderOverlay();
  }

  // 只切換選中狀態的 class，避免重建整個列表 DOM（修正雙擊相關 bug）
  function updateLayerSelectionUI() {
    drawLayersList.querySelectorAll('.draw-layer-item').forEach(item => {
      item.classList.toggle('selected', selectedLayerIds.has(item.dataset.id));
    });
  }

  function openOpacityPopup(layer, anchor) {
    document.querySelectorAll('.draw-opacity-popup').forEach(p => p.remove());
    saveHistorySnapshot();
    const popup = document.createElement('div');
    popup.className = 'draw-opacity-popup';
    const rect = anchor.getBoundingClientRect();
    popup.style.left = rect.left + 'px';
    popup.style.top = (rect.bottom + 4) + 'px';
    popup.innerHTML = `<input type="range" min="0" max="100" value="${Math.round(layer.opacity * 100)}">`;
    document.body.appendChild(popup);
    const slider = popup.querySelector('input');
    slider.addEventListener('input', () => { layer.opacity = slider.value / 100; renderComposite(); });
    const remove = (e) => { if (!popup.contains(e.target) && e.target !== anchor) { popup.remove(); document.removeEventListener('pointerdown', remove); } };
    setTimeout(() => document.addEventListener('pointerdown', remove), 0);
  }

  btnAddLayer.addEventListener('click', () => {
    saveHistorySnapshot();
    const layer = createLayer('新增圖層');
    insertLayerAtSelected(layer);
    selectOnly(layer.id);
    renderLayerList(); renderComposite();
  });

  btnDeleteLayer.addEventListener('click', () => {
    if (selectedLayerIds.size === 0) return;
    if (editingText && selectedLayerIds.has(editingText.layer.id)) finalizeText();
    saveHistorySnapshot();
    layers = layers.filter(l => !selectedLayerIds.has(l.id));
    if (layers.length === 0) layers = [createLayer('背景', { fill: '#ffffff' })];
    selectOnly(layers[0].id);
    renderLayerList(); renderComposite();
  });

  btnLayerUp.addEventListener('click', () => {
    if (selectedLayerIds.size === 0) return;
    saveHistorySnapshot();
    for (let i = 1; i < layers.length; i++) {
      if (selectedLayerIds.has(layers[i].id) && !selectedLayerIds.has(layers[i - 1].id)) {
        [layers[i - 1], layers[i]] = [layers[i], layers[i - 1]];
      }
    }
    renderLayerList(); renderComposite();
  });
  btnLayerDown.addEventListener('click', () => {
    if (selectedLayerIds.size === 0) return;
    saveHistorySnapshot();
    for (let i = layers.length - 2; i >= 0; i--) {
      if (selectedLayerIds.has(layers[i].id) && !selectedLayerIds.has(layers[i + 1].id)) {
        [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]];
      }
    }
    renderLayerList(); renderComposite();
  });

  // ====== 18. Output / Export ======
  function dateFileName() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.png`;
  }
  function downloadCanvasAsPNG(canvas, filename) {
    canvas.toBlob(blob => {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
  function downloadLayerPNG(layer) {
    const c = document.createElement('canvas'); c.width = canvasW; c.height = canvasH;
    const ctx = c.getContext('2d');
    ctx.globalAlpha = layer.opacity;
    ctx.drawImage(layer.canvas, 0, 0);
    downloadCanvasAsPNG(c, `${layer.name || 'layer'}.png`);
  }
  window.drawExportOutput = function () {
    if (!drawInitialized) return;
    if (layers.length > 1) {
      const individually = confirm('是否個別儲存圖層？（確定=是，取消=否，合併輸出）');
      if (individually) layers.forEach(l => downloadLayerPNG(l));
      else downloadCanvasAsPNG(mainCanvas, dateFileName());
    } else {
      downloadCanvasAsPNG(mainCanvas, dateFileName());
    }
  };

  // 直接綁定，並確保切到「圖」模式時 Output 按鈕一定可見（不依賴其他檔案是否修改）
  downloadOutputBtn?.addEventListener('click', () => {
    if (window.currentMode === 'draw') window.drawExportOutput();
  });

  const originalSwitchMode = window.switchMode;
  if (typeof originalSwitchMode === 'function') {
    window.switchMode = function (mode) {
      originalSwitchMode(mode);
      if (mode === 'draw' && downloadOutputBtn) downloadOutputBtn.classList.add('visible');
    };
  }
  }); // end workspacePanelReady.then
})();
