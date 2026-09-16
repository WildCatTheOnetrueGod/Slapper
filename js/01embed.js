/**
 * Web Workspace Module - Handles URL/File loading, iframe embedding & security checks.
 */

(function () {
  let sourceTypeSelect, urlInput, fileInput, confirmBtn, contentArea;

  // 1. 下拉選單切換輸入模式
  function handleSourceTypeChange() {
    if (sourceTypeSelect.value === 'url') {
      urlInput.style.display = 'inline-block';
      fileInput.style.display = 'none';
    } else {
      urlInput.style.display = 'none';
      fileInput.style.display = 'inline-block';
    }
  }

  // 2. 確定按鈕點擊處理
  async function handleConfirm() {
    const mode = sourceTypeSelect.value;

    if (mode === 'url') {
      const url = urlInput.value.trim();
      if (!url) {
        alert('請輸入有效的網址！');
        return;
      }
      loadUrlContent(url);
    } else {
      const file = fileInput.files[0];
      if (!file) {
        alert('請選擇要上傳的檔案！');
        return;
      }
      loadFileContent(file);
    }
  }

  // 3. 處理網址載入 (透過 iframe 與同源標頭檢測)
  async function loadUrlContent(url) {
    // 自動補完 http/https 協定
    let validUrl = url;
    if (!/^https?:\/\//i.test(validUrl)) {
      validUrl = 'https://' + validUrl;
    }

    try {
      // 發送 HEAD 請求預先檢查 HTTP Header (如 X-Frame-Options)
      const response = await fetch(validUrl, { method: 'HEAD', mode: 'cors' }).catch(() => null);

      if (response) {
        const xFrame = response.headers.get('X-Frame-Options');
        const csp = response.headers.get('Content-Security-Policy');

        if (
          (xFrame && ['DENY', 'SAMEORIGIN'].includes(xFrame.toUpperCase())) ||
          (csp && csp.includes("frame-ancestors 'none'"))
        ) {
          alert('不支援此來源（網站禁止嵌入）');
          return;
        }
      }

      // 建立 iframe
      contentArea.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'web-iframe';
      iframe.src = validUrl;

      // 當嵌入的頁面觸發跳頁/導向時阻斷或提示
      let hasLoaded = false;
      iframe.onload = () => {
        if (hasLoaded) {
          // 若不是初次載入，代表內部頁面發生了跳轉/導向
          alert('不支援此來源（頁面自動跳轉）');
          contentArea.innerHTML = '<div class="web-placeholder">已取消載入</div>';
        }
        hasLoaded = true;
      };

      contentArea.appendChild(iframe);

    } catch (err) {
      alert('不支援此來源');
    }
  }

  // 4. 處理檔案載入 (TXT 文字 或 PDF iframe)
  function loadFileContent(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        contentArea.innerHTML = '';
        const pre = document.createElement('pre');
        pre.className = 'web-text-display';
        pre.textContent = e.target.result;
        contentArea.appendChild(pre);
      };
      reader.readAsText(file);
    } else if (fileName.endsWith('.pdf')) {
      const fileUrl = URL.createObjectURL(file);
      contentArea.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'web-iframe';
      iframe.src = fileUrl;
      contentArea.appendChild(iframe);
    } else {
      alert('不支援此來源（僅支援 .txt 及 .pdf 格式）');
    }
  }

  // ====== 初始化與事件綁定 ======
  function init() {
    sourceTypeSelect = document.getElementById('text-webSourceType');
    urlInput = document.getElementById('text-webUrlInput');
    fileInput = document.getElementById('text-webFileInput');
    confirmBtn = document.getElementById('text-webConfirmBtn');
    contentArea = document.getElementById('text-webContent');

    if (sourceTypeSelect) {
      sourceTypeSelect.addEventListener('change', handleSourceTypeChange);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener('click', handleConfirm);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();