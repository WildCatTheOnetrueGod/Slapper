(function () {
// SVG 圖示常量
const EYE_OPEN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_CLOSED_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 20c-7 0-11-8-11-8a21.6 21.6 0 0 1 5-6M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a21.6 21.6 0 0 1-2.2 3.2"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;

// 預設 MD 範本內容
const DEFAULT_TEMPLATE = `# 歡迎使用 Markdown 編輯器

這是一個支援實時預覽與語法高亮顯示的編輯器。

## 功能特色
- **即時預覽** 與 *雙向滾動同步*
- 語法自動高亮顏色顯示
- 智慧 Tab 自動縮排與清單自動續行
- 工具列豐富按鈕支援
- **粗體** 與 _斜體_ 文字
- ~~刪除線~~ 與 \`行內程式碼\`
- 自動清單項目：
  - 項目 1
  - 項目 2

\`\`\`javascript
// 程式碼區塊範例
function sayHello() {
  console.log("Hello, Markdown World!");
}
\`\`\`

> 這是一段引用文字
> 可以在此撰寫備註
---
![替代文字](https://placehold.co/600x200/0f2b48/ffffff?text=Markdown+Editor)
---

可以在下方繼續編輯內容...
`;

// 歷史紀錄 Stack (最多 20 次)
const historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 20;

// 將 DOM 變數宣告在頂層（供其他 function 存取），但不立刻賦值
let textarea, highlightDiv, previewPane, codePane, autoSaveCheck, btnUndo, btnRedo,popoverFind,popoverReplace;
//插入
function insertTextAtCursor(el, textToInsert) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const val = el.value;

  // 切割並插入文字
  el.value = val.substring(0, start) + textToInsert + val.substring(end);

  // 將游標移至插入內容的後方
  el.selectionStart = el.selectionEnd = start + textToInsert.length;
}
// HTML 轉義
function escapeHtml(text) { 
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
 }
 // Markdown 語法符號高亮邏輯（僅高亮符號本身）
function applySyntaxHighlighting(text) { let escaped = escapeHtml(text);

  // 如果正在搜尋，先進行尋找字串高亮標記
  if (currentSearchState.active && currentSearchState.keyword) {
    const rawKeyword = currentSearchState.keyword;
    const matches = getSearchMatches(text, rawKeyword);
    currentSearchState.matches = matches;

    if (matches.length > 0) {
      if (currentSearchState.currentIndex >= matches.length) {
        currentSearchState.currentIndex = 0;
      } else if (currentSearchState.currentIndex < 0) {
        currentSearchState.currentIndex = matches.length - 1;
      }

      // 由後往前替換高亮標記，避免 index 偏移
      let result = text;
      for (let i = matches.length - 1; i >= 0; i--) {
        const m = matches[i];
        const isActive = (i === currentSearchState.currentIndex);
        const cls = isActive ? 'find-match active' : 'find-match';
        const targetText = text.substring(m.start, m.end);
        
        const before = result.substring(0, m.start);
        const after = result.substring(m.end);
        result = before + `___SEARCH_MATCH_${i}_${isActive ? 1 : 0}___` + targetText + `___SEARCH_END___` + after;
      }

      escaped = escapeHtml(result);

      // 將佔位符轉回 mark 標籤
      matches.forEach((m, i) => {
        const isActive = (i === currentSearchState.currentIndex);
        const cls = isActive ? 'find-match active' : 'find-match';
        const startTag = `___SEARCH_MATCH_${i}_${isActive ? 1 : 0}___`;
        const endTag = `___SEARCH_END___`;
        escaped = escaped.replace(startTag, `<mark class="${cls}">`).replace(endTag, `</mark>`);
      });
    }
  }

  // 行首語法 (標題, 清單, 引用, 分隔線, Tab)
  escaped = escaped.replace(/^(\t+)/gm, '<span class="sym">$1</span>');
  escaped = escaped.replace(/^((?:&lt;span class="sym"&gt;.*?&lt;\/span&gt;|\t)*)(#+\s)/gm, '$1<span class="sym">$2</span>');
  escaped = escaped.replace(/^((?:&lt;span class="sym"&gt;.*?&lt;\/span&gt;|\t)*)(-\s)/gm, '$1<span class="sym">$2</span>');
  escaped = escaped.replace(/^((?:&lt;span class="sym"&gt;.*?&lt;\/span&gt;|\t)*)(&gt;\s)/gm, '$1<span class="sym">$2</span>');
  escaped = escaped.replace(/^((?:&lt;span class="sym"&gt;.*?&lt;\/span&gt;|\t)*)(---)/gm, '$1<span class="sym">$2</span>');

  // 行內語法
  escaped = escaped.replace(/(&lt;br&gt;)/g, '<span class="sym">$1</span>');
  escaped = escaped.replace(/(\*\*)/g, '<span class="sym">$1</span>');
  escaped = escaped.replace(/(_)/g, '<span class="sym">$1</span>');
  escaped = escaped.replace(/(~~)/g, '<span class="sym">$1</span>');
  escaped = escaped.replace(/(`{1,3})/g, '<span class="sym">$1</span>');
  
  // 連結與圖片標籤符號
  escaped = escaped.replace(/(!?\[)(.*?)(\]\()(.*?)(\))/g, '<span class="sym">$1</span>$2<span class="sym">$3</span>$4<span class="sym">$5</span>');

  // 末尾換行處理
  if (text.endsWith('\n')) {
    escaped += '<br>&nbsp;';
  }

  return escaped;
 }
 // 更新高亮視圖
function updateHighlight() { 
  highlightDiv.innerHTML = applySyntaxHighlighting(textarea.value);
 }
 // 歷史紀錄管理 (Undo/Redo)
function saveHistory() { 
  const val = textarea.value;
  if (historyStack.length > 0 && historyStack[historyIndex] === val) return;

  if (historyIndex < historyStack.length - 1) {
    historyStack.splice(historyIndex + 1);
  }

  historyStack.push(val);
  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
  } else {
    historyIndex++;
  }
  updateHistoryButtons();
  handleAutoSave();
 }
function updateHistoryButtons() { 
  btnUndo.disabled = historyIndex <= 0;
  btnRedo.disabled = historyIndex >= historyStack.length - 1;
 }
function undo() { 
  if (historyIndex > 0) {
    historyIndex--;
    textarea.value = historyStack[historyIndex];
    updateHighlight();
    renderMarkdown();
    updateHistoryButtons();
    handleAutoSave();
    window.showToast('已撤銷');
  }
 }
function redo() { 
  if (historyIndex < historyStack.length - 1) {
    historyIndex++;
    textarea.value = historyStack[historyIndex];
    updateHighlight();
    renderMarkdown();
    updateHistoryButtons();
    handleAutoSave();
    window.showToast('已重作');
  }
 }
function renderMarkdown() { 
  const src = textarea.value;
  previewPane.innerHTML = marked.parse(src);
 }
 // 自動儲存至 LocalStorage
function handleAutoSave() { 
  if (autoSaveCheck.checked) {
    localStorage.setItem("Slapper_md", textarea.value);
  }
 }
function triggerInputEvent() {
  if (currentSearchState.active) {
    performSearch(currentSearchState.keyword, false);
  } else {
    updateHighlight();
  }
  renderMarkdown();
  saveHistory();
}
 // 工具列按鈕動作處理（修復焦點遺失問題）
function applyToolbarAction(actionFn) { 
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const hasSelection = start !== end;

  actionFn(start, end, text, hasSelection);
  updateHighlight();
  renderMarkdown();
  saveHistory();
  textarea.focus();
 }
function insertAtCursor(start, end, text, str) { 
  textarea.value = text.substring(0, start) + str + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + str.length;
 }
function toggleWrap(start, end, text, symbol, defaultText) { 
  if (start !== end) {
    modifyLines(start, end, text, line => {
      if (line.startsWith(symbol) && line.endsWith(symbol)) {
        return line.substring(symbol.length, line.length - symbol.length);
      }
      return symbol + line + symbol;
    });
  } else {
    insertAtCursor(start, end, text, defaultText);
  }
 }
function modifyLines(start, end, text, transformFn) { 
  const lineStart = text.lastIndexOf('\n', start - 1) + 1;
  let lineEnd = text.indexOf('\n', end);
  if (lineEnd === -1) lineEnd = text.length;

  const lines = text.substring(lineStart, lineEnd).split('\n');
  const modified = lines.map(transformFn).join('\n');

  textarea.value = text.substring(0, lineStart) + modified + text.substring(lineEnd);
  textarea.selectionStart = lineStart;
  textarea.selectionEnd = lineStart + modified.length;
 }
// ====== 尋找 & 取代 全局狀態與邏輯 ======
const currentSearchState = {
  active: false,
  keyword: '',
  matches: [],
  currentIndex: 0
};
// 解析 [tab] 與 [br] 特殊字元
function parseSearchQuery(query) {
  return query.replace(/\[tab\]/gi, '\t').replace(/\[br\]/gi, '\n');
}

// 取得所有匹配位置
function getSearchMatches(text, rawQuery) {
  if (!rawQuery) return [];
  const parsed = parseSearchQuery(rawQuery);
  if (!parsed) return [];

  const matches = [];
  let pos = text.indexOf(parsed);
  while (pos !== -1) {
    matches.push({ start: pos, end: pos + parsed.length });
    pos = text.indexOf(parsed, pos + 1);
  }
  return matches;
}

// 執行尋找並跳轉
function performSearch(rawQuery, jumpToNearest = true) {
  if (!rawQuery) {
    currentSearchState.active = false;
    currentSearchState.keyword = '';
    currentSearchState.matches = [];
    currentSearchState.currentIndex = 0;
    updateSearchUI(0, 0);
    updateHighlight();
    return;
  }

  currentSearchState.active = true;
  currentSearchState.keyword = rawQuery;

  const matches = getSearchMatches(textarea.value, rawQuery);
  currentSearchState.matches = matches;

  if (matches.length === 0) {
    currentSearchState.currentIndex = -1;
    updateSearchUI(0, 0);
    updateHighlight();
    return;
  }

  // 尋找距離目前游標最近的匹配項
  if (jumpToNearest) {
    const cursorPos = textarea.selectionStart;
    let nearestIdx = 0;
    let minDiff = Infinity;

    matches.forEach((m, idx) => {
      const diff = Math.abs(m.start - cursorPos);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIdx = idx;
      }
    });
    currentSearchState.currentIndex = nearestIdx;
  }

  updateSearchUI(currentSearchState.currentIndex + 1, matches.length);
  updateHighlight();
  jumpToMatch(currentSearchState.currentIndex);
}

// 跳轉文字游標與滾動視圖
function jumpToMatch(index) {
  const matches = currentSearchState.matches;
  if (index < 0 || index >= matches.length) return;

  const match = matches[index];
  textarea.focus();
  textarea.setSelectionRange(match.start, match.end);

  // 滾動讓游標可見
  const textBefore = textarea.value.substring(0, match.start);
  const lineCount = textBefore.split('\n').length;
  const totalLines = textarea.value.split('\n').length || 1;
  const scrollRatio = lineCount / totalLines;
  
  textarea.scrollTop = scrollRatio * (textarea.scrollHeight - textarea.clientHeight);
}

// 更新記數 Span
function updateSearchUI(current, total) {
  const text = total > 0 ? `${current}/${total}` : '0/0';
  document.getElementById('findCountSpan').textContent = text;
  document.getElementById('replaceCountSpan').textContent = text;
}

// 取消搜尋
function cancelSearch() {
  currentSearchState.active = false;
  currentSearchState.keyword = '';
  currentSearchState.matches = [];
  currentSearchState.currentIndex = 0;
  
  document.getElementById('popoverFind').classList.add('hidden');
  document.getElementById('popoverReplace').classList.add('hidden');
  
  updateHighlight();
  textarea.focus();
}
function navigateMatch(dir) {
  const matches = currentSearchState.matches;
  if (matches.length === 0) return;

  currentSearchState.currentIndex += dir;
  if (currentSearchState.currentIndex >= matches.length) {
    currentSearchState.currentIndex = 0;
  } else if (currentSearchState.currentIndex < 0) {
    currentSearchState.currentIndex = matches.length - 1;
  }

  updateSearchUI(currentSearchState.currentIndex + 1, matches.length);
  updateHighlight();
  jumpToMatch(currentSearchState.currentIndex);
}



// 初始化：當 HTML 載入完成後才執行此函數
function init() {
  // 1. 在這裡抓取 DOM 元素
  textarea = document.getElementById('editorTextarea');
  highlightDiv = document.getElementById('editorHighlight');
  previewPane = document.getElementById('previewPane');
  codePane = document.getElementById('codePane');
  autoSaveCheck = document.getElementById('autoSaveCheck');
  btnUndo = document.getElementById('btnUndo');
  btnRedo = document.getElementById('btnRedo');
  // 面板開關事件
  popoverFind = document.getElementById('popoverFind');
  popoverReplace = document.getElementById('popoverReplace');

  // 如果抓不到核心元素，說明面板 HTML 可能載入失敗，提前攔截
  if (!textarea || !autoSaveCheck) {
    console.error("Markdown 面板 DOM 元素未成功載入");
    return;
  }

  // 2. 在這裡綁定所有事件監聽器
  autoSaveCheck.addEventListener('change', () => {
    if (autoSaveCheck.checked) {
      localStorage.setItem("Slapper_md", textarea.value);
      window.showToast('開啟自動儲存');
    } else {
      localStorage.removeItem("Slapper_md");
      window.showToast('取消自動儲存');
    }
  });

  document.getElementById('btnDownload')?.addEventListener('click', () => { 
    if(window.currentMode === 'markdown'){
      const text = textarea.value;
      const match = text.match(/^#\s+(.+)$/m);
      let filename = "document.md";
      if (match && match[1].trim()) {
        filename = match[1].trim().replace(/[\\/:*?"<>|]/g, "_") + ".md";
      }

      const blob = new Blob([text], { type: 'text/markdown;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
      window.showToast('下載成功');
    }
     
   });
  document.getElementById('btnUpload')?.addEventListener('click', () => { document.getElementById('fileInput').click(); });
  document.getElementById('fileInput')?.addEventListener('change', (e) => { 
    const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        textarea.value = evt.target.result;
        
        // 更新高亮、預覽與歷史紀錄
        updateHighlight();
        renderMarkdown();
        saveHistory();
        
        window.showToast('檔案載入成功');
        // 清空 input 讓重複選擇同一個檔案時也能觸發 change 事件
        e.target.value = '';
      };
      
      reader.onerror = () => {
        window.showToast('檔案讀取失敗');
      };

      reader.readAsText(file, 'UTF-8');
   });

  window.addEventListener('keydown', (e) => { 
    if (e.ctrlKey || e.metaKey) {
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key.toLowerCase() === 'y') {
      e.preventDefault();
      redo();
    } else if (e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.getElementById('btnDownload').click();
    }
  }
   });

  // 捲動同步
  let isTextareaScrolling = false;
  let isPreviewScrolling = false;
  textarea.addEventListener('scroll', () => { 
     highlightDiv.scrollTop = textarea.scrollTop;
    highlightDiv.scrollLeft = textarea.scrollLeft;

    if (isPreviewScrolling) return;
    isTextareaScrolling = true;

    const percentage = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight);
    if (!isNaN(percentage)) {
      previewPane.scrollTop = percentage * (previewPane.scrollHeight - previewPane.clientHeight);
    }

    setTimeout(() => { isTextareaScrolling = false; }, 50);
   });
  previewPane.addEventListener('scroll', () => { 
    if (isTextareaScrolling) return;
    isPreviewScrolling = true;

    const percentage = previewPane.scrollTop / (previewPane.scrollHeight - previewPane.clientHeight);
    if (!isNaN(percentage)) {
      textarea.scrollTop = percentage * (textarea.scrollHeight - textarea.clientHeight);
      highlightDiv.scrollTop = textarea.scrollTop;
    }

    setTimeout(() => { isPreviewScrolling = false; }, 50);
   });

  // 自動換行與 Enter 延續
  textarea.addEventListener('keydown', (e) => { 
      if (e.key === 'Enter') {
      const start = textarea.selectionStart;
      const text = textarea.value;
      const lastNewLine = text.lastIndexOf('\n', start - 1);
      const currentLine = text.substring(lastNewLine + 1, start);

      const tabMatch = currentLine.match(/^(\t+)/);
      const indent = tabMatch ? tabMatch[1] : '';

      const listMatch = currentLine.match(/^((\t*)-\s)/);

      if (listMatch) {
        e.preventDefault();
        const listPrefix = listMatch[1];
        if (currentLine.trim() === '-') {
          const newText = text.substring(0, lastNewLine + 1) + text.substring(start);
          textarea.value = newText;
          textarea.selectionStart = textarea.selectionEnd = lastNewLine + 1;
        } else {
          const insertText = '\n' + listPrefix;
          insertTextAtCursor(textarea, insertText);
        }
        triggerInputEvent();
      } else if (indent) {
        e.preventDefault();
        const insertText = '\n' + indent;
        insertTextAtCursor(textarea, insertText);
        triggerInputEvent();
      }
    }
   });
  textarea.addEventListener('input', () => { triggerInputEvent(); });

  // 工具列按鈕
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.preventDefault());
  });

  document.getElementById('btnTab').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    modifyLines(start, end, text, line => line.startsWith('\t') ? line.substring(1) : '\t' + line);
  } else {
    insertAtCursor(start, end, text, '\t');
  }
});
  document.getElementById('btnHeader').onclick = () => applyToolbarAction(
    (start, end, text, hasSelection) => {
  if (hasSelection) {
    modifyLines(start, end, text, line => line.startsWith('# ') ? line.substring(2) : '# ' + line);
  } else {
    insertAtCursor(start, end, text, '# ');
  }
}
  );
  document.getElementById('btnBr').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    modifyLines(start, end, text, line => line.endsWith('<br>') ? line.slice(0, -4) : line + '<br>');
  } else {
    insertAtCursor(start, end, text, '<br>');
  }
});
  document.getElementById('btnList').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    modifyLines(start, end, text, line => line.startsWith('- ') ? line.substring(2) : '- ' + line);
  } else {
    insertAtCursor(start, end, text, '- ');
  }
});
  document.getElementById('btnBold').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  toggleWrap(start, end, text, '**', '**粗體**');
});
  document.getElementById('btnItalic').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  toggleWrap(start, end, text, '_', '_斜體_');
});
  document.getElementById('btnStrike').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  toggleWrap(start, end, text, '~~', '~~刪除線~~');
});
  document.getElementById('btnCode').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    const sel = text.substring(start, end);
    if (sel.includes('\n')) {
      if (sel.startsWith('```\n') && sel.endsWith('\n```')) {
        textarea.value = text.substring(0, start) + sel.substring(4, sel.length - 4) + text.substring(end);
      } else {
        textarea.value = text.substring(0, start) + '```\n' + sel + '\n```' + text.substring(end);
      }
    } else {
      toggleWrap(start, end, text, '`', '`行內程式碼`');
    }
  } else {
    insertAtCursor(start, end, text, '`行內程式碼`');
  }
});
  document.getElementById('btnLink').onclick = () => applyToolbarAction((start, end, text) => {
  insertAtCursor(start, end, text, '[顯示文字](網址)');
});
  document.getElementById('btnImg').onclick = () => applyToolbarAction((start, end, text) => {
  insertAtCursor(start, end, text, '![替代文字](圖片網址)');
});
  document.getElementById('btnQuote').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    modifyLines(start, end, text, line => line.startsWith('> ') ? line.substring(2) : '> ' + line);
  } else {
    insertAtCursor(start, end, text, '> ');
  }
});
  document.getElementById('btnHr').onclick = () => applyToolbarAction((start, end, text, hasSelection) => {
  if (hasSelection) {
    const lines = text.substring(start, end).split('\n');
    textarea.value = text.substring(0, start) + lines.join('\n---\n') + text.substring(end);
  } else {
    insertAtCursor(start, end, text, '---');
  }
});
  document.getElementById('btnFind').onclick = () => {
    popoverReplace.classList.add('hidden');
    popoverFind.classList.toggle('hidden');
    if (!popoverFind.classList.contains('hidden')) {
      const input = document.getElementById('findInput');
      input.focus();
      if (input.value) performSearch(input.value);
    } else {
      cancelSearch();
    }
  };

  document.getElementById('btnReplace').onclick = () => {
    popoverFind.classList.add('hidden');
    popoverReplace.classList.toggle('hidden');
    if (!popoverReplace.classList.contains('hidden')) {
      const input = document.getElementById('replaceFindInput');
      input.focus();
      if (input.value) performSearch(input.value);
    } else {
      cancelSearch();
    }
  };

  // 尋找面板操作
  document.getElementById('btnExecFind').onclick = () => {
    performSearch(document.getElementById('findInput').value);
  };
  document.getElementById('findInput').onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(document.getElementById('findInput').value);
    }
  };

  // 取代面板操作
  document.getElementById('btnExecReplaceSearch').onclick = () => {
    performSearch(document.getElementById('replaceFindInput').value);
  };
  document.getElementById('replaceFindInput').onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(document.getElementById('replaceFindInput').value);
    }
  };

  document.getElementById('btnFindPrev').onclick = () => navigateMatch(-1);
document.getElementById('btnFindNext').onclick = () => navigateMatch(1);
document.getElementById('btnReplacePrev').onclick = () => navigateMatch(-1);
document.getElementById('btnReplaceNext').onclick = () => navigateMatch(1);

document.getElementById('btnCloseFind').onclick = cancelSearch;
document.getElementById('btnCloseReplace').onclick = cancelSearch;

// 全部取代
document.getElementById('btnReplaceAll').onclick = () => {
  const rawTarget = document.getElementById('replaceFindInput').value;
  const rawReplace = document.getElementById('replaceWithInput').value;

  if (!rawTarget) return;

  const target = parseSearchQuery(rawTarget);
  const replaceStr = parseSearchQuery(rawReplace);

  const currentText = textarea.value;
  if (!currentText.includes(target)) {
    window.showToast('未找到可取代內容');
    return;
  }

  const newText = currentText.split(target).join(replaceStr);
  textarea.value = newText;
  
  window.showToast('全部取代完成');
  performSearch(rawTarget, false);
  triggerInputEvent();
};

// ====== 快捷格式工具 (清除空行, 增加/縮減縮排) ======
document.getElementById('selectLineActions').onchange = (e) => {
  const action = e.target.value;
  if (!action) return;

  const text = textarea.value;
  const lines = text.split('\n');

  if (action === 'clearEmpty') {
    const newLines = lines.filter(line => line.trim() !== '');
    textarea.value = newLines.join('\n');
    window.showToast('已清除空行');
  } else if (action === 'indent') {
    const newLines = lines.map(line => '\t' + line);
    textarea.value = newLines.join('\n');
    window.showToast('已增加縮排');
  } else if (action === 'outdent') {
    const newLines = lines.map(line => line.startsWith('\t') ? line.substring(1) : line);
    textarea.value = newLines.join('\n');
    window.showToast('已減少縮排');
  }

  e.target.value = ''; // 重置選單
  triggerInputEvent();
  textarea.focus();
};

// ====== 複製全部、清空全部、頂部/底部導航 ======
document.getElementById('btnCopyAll').onclick = () => {
  if (!textarea.value) {
    window.showToast('內容為空');
    return;
  }
  navigator.clipboard.writeText(textarea.value).then(() => {
    window.showToast('已複製全部內容');
  }).catch(() => {
    window.showToast('複製失敗');
  });
};

document.getElementById('btnClearAll').onclick = () => {
  if (confirm('確定要清空全部內容嗎？')) {
    textarea.value = '';
    triggerInputEvent();
    window.showToast('已清空內容');
  }
};

document.getElementById('btnGoTop').onclick = () => {
  textarea.focus();
  textarea.setSelectionRange(0, 0);
  textarea.scrollTop = 0;
};

document.getElementById('btnGoBottom').onclick = () => {
  textarea.focus();
  const len = textarea.value.length;
  textarea.setSelectionRange(len, len);
  textarea.scrollTop = textarea.scrollHeight;
};
  document.getElementById('btnTemplate').onclick = () => { 
    textarea.value = DEFAULT_TEMPLATE;
  updateHighlight();
  renderMarkdown();
  saveHistory();
  textarea.focus();
  window.showToast('載入模板完成');
   };

  btnUndo.onclick = undo;
  btnRedo.onclick = redo;

  // 頂列切換視圖
  const btnViewPreview = document.getElementById('btnViewPreview');
  const btnViewCode = document.getElementById('btnViewCode');
  if (btnViewPreview) {
    btnViewPreview.onclick = () => {
      const isHidden = previewPane.classList.toggle('hidden');
      const iconSpan = btnViewPreview.querySelector('.btn-icon');
      if (iconSpan) iconSpan.innerHTML = isHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    };
  }
  if (btnViewCode) {
    btnViewCode.onclick = () => {
      const isHidden = codePane.classList.toggle('hidden');
      const iconSpan = btnViewCode.querySelector('.btn-icon');
      if (iconSpan) iconSpan.innerHTML = isHidden ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
    };
  }

  // 3. 載入內容與呈現
  const saved = localStorage.getItem("Slapper_md");
  if (saved) {
    if (confirm("檢測到儲存的 Slapper_md 內容，是否載入？")) {
      textarea.value = saved;
      autoSaveCheck.checked = true;
    } else {
      localStorage.removeItem("Slapper_md");
      textarea.value = DEFAULT_TEMPLATE;
    }
  } else {
    textarea.value = DEFAULT_TEMPLATE;
  }

  updateHighlight();
  renderMarkdown();
  saveHistory();
}

// 等待面板內容載入完成後再執行 init()
window.workspacePanelReady.then(init);
})();