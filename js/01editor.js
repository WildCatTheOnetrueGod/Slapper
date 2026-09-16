/**
 * Editor Working Space - Text Mode Only
 */

(function () {
  let lastMilestone = 0;

  // DOM 元素宣告
  let realNovelInput, backdrop, highlights;
  let actionMenu, findPanel, replacePanel, findInput, closeHighlightBtn;
  let wordCountInfo, downloadOutputBtn, toastContainer;

  document.addEventListener('keydown', (e) => {
    if (window.currentMode !== 'text') return;
      if ((e.ctrlKey && e.key.toLowerCase() === 's')){
        e.preventDefault(); exportTextOutput();
      }
  });
  // ====== 1. Toast 提示訊息 ======
  function showToast(message) {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `
      <svg class="line-icon" viewBox="0 0 24 24">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ====== 2. 字數計算 ======
  function updateWordCount() {
    if (!realNovelInput || !wordCountInfo) return;

    let text = realNovelInput.value;
    text = text.replace(/[\+\*]+$/g, '');   
    text = text.replace(/\s+/g, '');        
    const totalCount = text.length;

    wordCountInfo.textContent = `Cnt: ${totalCount}`;

    if (totalCount >= 1000) {
      const currentMilestone = Math.floor(totalCount / 1000) * 1000;
      if (currentMilestone > lastMilestone) {
        lastMilestone = currentMilestone;
        showToast(`恭喜已達到 ${currentMilestone} 字！`);
      }
    } else {
      lastMilestone = 0;
    }
  }

  // ====== 3. 匯出 Output ======
  function exportTextOutput() {
    if (window.currentMode && window.currentMode !== 'text') return;
    if (!realNovelInput) return;

    // 直接取得輸入框原始文字（完全保留 Tab、縮排與空行）
    const rawText = realNovelInput.value;

    const currentDate = new Date();
    const exportFileName = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}_info.txt`;

    // 直接使用 rawText 建立 Blob 檔
    const blob = new Blob([rawText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = exportFileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ====== 輔助工具函式 ======
  function parseSpecialTokens(str) {
    if (!str) return '';
    return str.replace(/\[tab\]/g, '\t').replace(/\[br\]/g, '\n');
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function resetMenu() {
    if (actionMenu) actionMenu.value = "";
  }

  // ====== 關鍵修正：即時尋找高亮（保護換行與結構） ======
  function applyFindHighlight() {
    if (!highlights || !realNovelInput) return;
    
    const text = realNovelInput.value;
    const rawKeyword = findInput ? findInput.value : '';

    if (!rawKeyword) {
      // 未尋找時，保留換行並寫入
      highlights.innerHTML = escapeHtml(text) + (text.endsWith('\n') ? '<br>&nbsp;' : '');
      return;
    }

    const keyword = parseSpecialTokens(rawKeyword);
    const escapedKeyword = escapeHtml(keyword);
    
    if (!escapedKeyword) {
      highlights.innerHTML = escapeHtml(text) + (text.endsWith('\n') ? '<br>&nbsp;' : '');
      return;
    }

    // 正確進行 HTML 轉義替換
    const html = escapeHtml(text).replace(
      new RegExp(escapeRegExp(escapedKeyword), 'g'), 
      '<mark class="highlight">$&</mark>'
    );

    // 末端補上換行預留點，防止 textarea 下拉時高亮層高度不一致
    highlights.innerHTML = html + (text.endsWith('\n') ? '<br>&nbsp;' : '');
  }

  // ====== 文字操作功能 ======
  function removeEmptyLines() {
    if (!realNovelInput) return;
    realNovelInput.value = realNovelInput.value
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');
    applyFindHighlight();
    updateWordCount();
    saveToLocalStorage();
  }

  function indentLines() {
    if (!realNovelInput) return;
    realNovelInput.value = realNovelInput.value
      .split('\n')
      .map(line => '\t' + line)
      .join('\n');
    applyFindHighlight();
    updateWordCount();
    saveToLocalStorage();
  }

  function outdentLines() {
    if (!realNovelInput) return;
    realNovelInput.value = realNovelInput.value
      .split('\n')
      .map(line => line.replace(/^[\t\s ]/, ''))
      .join('\n');
    applyFindHighlight();
    updateWordCount();
    saveToLocalStorage();
  }

  // ====== 暴露給 HTML 呼叫的函式 ======
  window.updateWordCount = updateWordCount;

  window.text_copyAll = async function() {
    if (!realNovelInput) return;
    try {
      await navigator.clipboard.writeText(realNovelInput.value);
      showToast(`已複製全部內容`);
    } catch (err) {
      realNovelInput.select();
      document.execCommand('copy');
      showToast(`已複製全部內容`);
    }
    saveToLocalStorage();
  };
  window.text_clearAll = async function() {
    if (!realNovelInput) return;
    try {
      realNovelInput.value="";
      showToast(`已清除內容`);
    } catch (err) {
      showToast(`清除失敗`);
    }
    saveToLocalStorage();
  };

  window.text_handleMenuChange = function(value) {
    if (!value) return;
    switch (value) {
      case 'removeEmpty':
        removeEmptyLines();
        resetMenu();
        break;
      case 'indent':
        indentLines();
        resetMenu();
        break;
      case 'outdent':
        outdentLines();
        resetMenu();
        break;
      case 'showFind':
        if (findPanel) findPanel.style.display = 'flex';
        if (replacePanel) replacePanel.style.display = 'none';
        if (closeHighlightBtn) closeHighlightBtn.style.display = 'inline-block';
        if (findInput) findInput.focus();
        break;
      case 'showReplace':
        if (replacePanel) replacePanel.style.display = 'flex';
        if (findPanel) findPanel.style.display = 'none';
        if (closeHighlightBtn) closeHighlightBtn.style.display = 'inline-block';
        break;
    }
  };

  window.text_executeReplace = function() {
    console.log("開始取代");
    const targetInput = document.getElementById('text-replaceTarget');
    const withInput = document.getElementById('text-replaceWith');
    if (!targetInput || !realNovelInput) return;
    console.log("text-replaceTarget="+targetInput);
    console.log("text-replaceWith="+withInput);
    const targetRaw = targetInput.value;
    const withRaw = withInput ? withInput.value : '';

    if (!targetRaw) {
      alert('請輸入要取代的原文字！');
      return;
    }

    const targetStr = parseSpecialTokens(targetRaw);
    const withStr = parseSpecialTokens(withRaw);

    const regex = new RegExp(escapeRegExp(targetStr), 'g');
    realNovelInput.value = realNovelInput.value.replace(regex, withStr);

    if (findInput) findInput.value = withRaw;
    applyFindHighlight();
    updateWordCount();
  };

  window.text_closeHighlightMode = function() {
    if (findInput) findInput.value = '';
    if (findPanel) findPanel.style.display = 'none';
    if (replacePanel) replacePanel.style.display = 'none';
    if (closeHighlightBtn) closeHighlightBtn.style.display = 'none';
    applyFindHighlight();
    resetMenu();
  };

  // ====== 初始化 ======
  function init() {
    realNovelInput = document.getElementById('realNovelInput');
    backdrop = document.getElementById('text-backdrop');
    highlights = document.getElementById('text-highlights');
    
    actionMenu = document.getElementById('text-actionMenu');
    findPanel = document.getElementById('text-findPanel');
    replacePanel = document.getElementById('text-replacePanel');
    findInput = document.getElementById('text-findInput');
    closeHighlightBtn = document.getElementById('text-closeHighlightBtn');

    wordCountInfo = document.getElementById('wordCountInfo');
    downloadOutputBtn = document.getElementById('downloadOutputBtn');
    toastContainer = document.getElementById('toastContainer');

    if (realNovelInput) {
      realNovelInput.addEventListener('input', () => {
        updateWordCount();
        applyFindHighlight();
      });

      if (backdrop) {
        realNovelInput.addEventListener('scroll', () => {
          backdrop.scrollTop = realNovelInput.scrollTop;
          backdrop.scrollLeft = realNovelInput.scrollLeft;
        });
      }
    }

    if (findInput) {
      findInput.addEventListener('input', applyFindHighlight);
    }

    if (downloadOutputBtn) {
      downloadOutputBtn.addEventListener('click', exportTextOutput);
    }

    updateWordCount();
    applyFindHighlight();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();