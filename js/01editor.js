/**
 * Editor Working Space - Text Mode Only
 * 僅存放「文」相關的核心邏輯：字數統計、Toast 提示、文本格式化匯出 (Output)
 */

(function () {
  let lastMilestone = 0;

  const realNovelInput = document.getElementById('realNovelInput');
  const wordCountInfo = document.getElementById('wordCountInfo');
  const downloadOutputBtn = document.getElementById('downloadOutputBtn');
  const toastContainer = document.getElementById('toastContainer');

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

  // ====== 2. 字數計算與千字達標提醒 (掛載至 window 供全域調用) ======
  window.updateWordCount = function() {
    if (!realNovelInput || !wordCountInfo) return;

    let text = realNovelInput.value;
    text = text.replace(/[\+\*]+$/g, '');   // 忽略尾端格式化符號
    text = text.replace(/\s+/g, '');       // 忽略空白與換行
    const totalCount = text.length;

    wordCountInfo.textContent = `Cnt: ${totalCount}`;

    // 每達 1000 字觸發通知
    if (totalCount >= 1000) {
      const currentMilestone = Math.floor(totalCount / 1000) * 1000;
      if (currentMilestone > lastMilestone) {
        lastMilestone = currentMilestone;
        showToast(`恭喜已達到 ${currentMilestone} 字！`);
      }
    } else {
      lastMilestone = 0;
    }
  };

  // ====== 3. 匯出「文」區域文本 (Output) ======
  function exportTextOutput() {
    if (window.currentMode !== 'text') return; // 新增這行
    if (!realNovelInput) return;

    const rawText = realNovelInput.value;
    const rawUserLines = rawText.split(/\r?\n/);

    const mergedUserLines = [];
    let tempBuffer = "";

    rawUserLines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine && !tempBuffer) return;

      if (cleanLine.endsWith('+')) {
        tempBuffer += cleanLine.slice(0, -1);
      } else {
        tempBuffer += cleanLine;
        if (tempBuffer) {
          mergedUserLines.push(tempBuffer);
          tempBuffer = "";
        }
      }
    });

    if (tempBuffer) mergedUserLines.push(tempBuffer);

    const fullText = mergedUserLines.join('\n');

    if (!fullText.trim()) {
      alert("「文」輸入區尚無內容！");
      return;
    }

    const currentDate = new Date();
    const exportFileName = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}_info.txt`;

    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = exportFileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  // ====== 4. 初始化事件監聽 ======
  document.addEventListener('DOMContentLoaded', () => {
    if (realNovelInput) {
      realNovelInput.addEventListener('input', window.updateWordCount);
    }
    if (downloadOutputBtn) {
      downloadOutputBtn.addEventListener('click', exportTextOutput);
    }

    // 初始化字數計算
    window.updateWordCount();
  });
})();