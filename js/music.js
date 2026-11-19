// ==========================================
// 1. 音檔路徑設定結構 (依需求定義)
// ==========================================
window.rating = [
  {
    title: "全按當1",
    tone: [{
      "♭1": "./tone/♭1.mp3", "1": "./tone/1.mp3",
      "♭2": "./tone/♭2.mp3", "2": "./tone/2.mp3",
      "♭3": "./tone/♭3.mp3", "3": "./tone/3.mp3",
      "♭4": "./tone/♭4.mp3", "4": "./tone/4.mp3",
      "♭5": "./tone/♭5.mp3", "5": "./tone/5.mp3",
      "♭6": "./tone/♭6.mp3", "6": "./tone/6.mp3",
      "♭7": "./tone/♭7.mp3", "7": "./tone/7.mp3"
    }],
    tone_up: [{
      "♭1": "./tone_up/♭1.mp3", "1": "./tone_up/1.mp3",
      "♭2": "./tone_up/♭2.mp3", "2": "./tone_up/2.mp3",
      "♭3": "./tone_up/♭3.mp3", "3": "./tone_up/3.mp3",
      "♭4": "./tone_up/♭4.mp3", "4": "./tone_up/4.mp3",
      "♭5": "./tone_up/♭5.mp3", "5": "./tone_up/5.mp3",
      "♭6": "./tone_up/♭6.mp3", "6": "./tone_up/6.mp3",
      "♭7": "./tone_up/♭7.mp3", "7": "./tone_up/7.mp3"
    }],
    tone_upup: [{
      "♭1": "./tone_upup/♭1.mp3", "1": "./tone_upup/1.mp3",
      "♭2": "./tone_upup/♭2.mp3", "2": "./tone_upup/2.mp3",
      "♭3": "./tone_upup/♭3.mp3", "3": "./tone_upup/3.mp3",
      "♭4": "./tone_upup/♭4.mp3", "4": "./tone_upup/4.mp3",
      "♭5": "./tone_upup/♭5.mp3", "5": "./tone_upup/5.mp3",
      "♭6": "./tone_upup/♭6.mp3", "6": "./tone_upup/6.mp3",
      "♭7": "./tone_upup/♭7.mp3", "7": "./tone_upup/7.mp3"
    }],
    tone_down: [{
      "♭1": "./tone_down/♭1.mp3", "1": "./tone_down/1.mp3",
      "♭2": "./tone_down/♭2.mp3", "2": "./tone_down/2.mp3",
      "♭3": "./tone_down/♭3.mp3", "3": "./tone_down/3.mp3",
      "♭4": "./tone_down/♭4.mp3", "4": "./tone_down/4.mp3",
      "♭5": "./tone_down/♭5.mp3", "5": "./tone_down/5.mp3",
      "♭6": "./tone_down/♭6.mp3", "6": "./tone_down/6.mp3",
      "♭7": "./tone_down/♭7.mp3", "7": "./tone_down/7.mp3"
    }],
    tone_downdown: [{
      "♭1": "./tone_downdown/♭1.mp3", "1": "./tone_downdown/1.mp3",
      "♭2": "./tone_downdown/♭2.mp3", "2": "./tone_downdown/2.mp3",
      "♭3": "./tone_downdown/♭3.mp3", "3": "./tone_downdown/3.mp3",
      "♭4": "./tone_downdown/♭4.mp3", "4": "./tone_downdown/4.mp3",
      "♭5": "./tone_downdown/♭5.mp3", "5": "./tone_downdown/5.mp3",
      "♭6": "./tone_downdown/♭6.mp3", "6": "./tone_downdown/6.mp3",
      "♭7": "./tone_downdown/♭7.mp3", "7": "./tone_downdown/7.mp3"
    }]
  },
  {
    title: "全按當5",
    tone: [{
      "♭1": "./tone5/♭1.mp3", "1": "./tone5/1.mp3",
      "♭2": "./tone5/♭2.mp3", "2": "./tone5/2.mp3",
      "♭3": "./tone5/♭3.mp3", "3": "./tone5/3.mp3",
      "♭4": "./tone5/♭4.mp3", "4": "./tone5/4.mp3",
      "♭5": "./tone5/♭5.mp3", "5": "./tone5/5.mp3",
      "♭6": "./tone5/♭6.mp3", "6": "./tone5/6.mp3",
      "♭7": "./tone5/♭7.mp3", "7": "./tone5/7.mp3"
    }],
    tone_up: [{}],
    tone_upup: [{}],
    tone_down: [{}],
    tone_downdown: [{}]
  }
];

// 電子音基礎頻率對照表 (C5 大調為基準)
const BASE_FREQUENCIES = {
  "♭1": 493.88, "1": 523.25,
  "♭2": 554.37, "2": 587.33,
  "♭3": 622.25, "3": 659.25,
  "♭4": 659.25, "4": 698.46,
  "♭5": 739.99, "5": 783.99,
  "♭6": 830.61, "6": 880.00,
  "♭7": 932.33, "7": 987.77
};

// ==========================================
// 2. Web Audio API 核心與狀態管理
// ==========================================
let audioCtx = null;
let masterGain = null;
let recordDest = null;

// 音檔快取池 (避免重複網路請求)
const audioBufferCache = new Map();

// 互動狀態
let currentToneMode = "電子音"; // "電子音" | "全按當1" | "全按當5"
let activeOctave = null; // null | "up" | "upup" | "down" | "downdown"
let isLegato = false;

// 追蹤正在發聲的音符
const activeVoices = new Map(); // pointerId -> voiceObj
let legatoVoice = null; // 連音模式下當前持續發聲的 voiceObj

function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.8;

    recordDest = audioCtx.createMediaStreamDestination();
    masterGain.connect(audioCtx.destination);
    masterGain.connect(recordDest);
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

// 取得音檔 URL（含高高->高->原音、低低->低->原音降級邏輯）
function getAudioUrlCandidates(toneTitle, note, octave) {
  const toneData = window.rating.find((item) => item.title === toneTitle);
  if (!toneData) return [];

  const getUrl = (key) => (toneData[key] && toneData[key][0] ? toneData[key][0][note] : "");
  const candidates = [];

  if (octave === "upup") {
    if (getUrl("tone_upup")) candidates.push(getUrl("tone_upup"));
    if (getUrl("tone_up")) candidates.push(getUrl("tone_up"));
  } else if (octave === "up") {
    if (getUrl("tone_up")) candidates.push(getUrl("tone_up"));
  } else if (octave === "downdown") {
    if (getUrl("tone_downdown")) candidates.push(getUrl("tone_downdown"));
    if (getUrl("tone_down")) candidates.push(getUrl("tone_down"));
  } else if (octave === "down") {
    if (getUrl("tone_down")) candidates.push(getUrl("tone_down"));
  }

  // 最終保底：原音
  if (getUrl("tone")) candidates.push(getUrl("tone"));
  return candidates;
}

// 載入並解碼音檔
async function loadBufferWithFallback(urls) {
  for (const url of urls) {
    if (!url) continue;
    if (audioBufferCache.has(url)) {
      const cached = audioBufferCache.get(url);
      if (cached !== "ERROR") return cached;
      continue;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Not found");
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      audioBufferCache.set(url, audioBuffer);
      return audioBuffer;
    } catch (e) {
      audioBufferCache.set(url, "ERROR");
    }
  }
  return null;
}

// 建立發聲節點 (支援真實音檔與 Web Audio API 電子音)
async function startNote(note, initialVolume = 0.75, isCrossfade = false) {
  initAudio();
  const now = audioCtx.currentTime;
  const gainNode = audioCtx.createGain();
  gainNode.connect(masterGain);

  // 連音切換時做極短交叉淡入，消除爆音與斷裂感
  if (isCrossfade) {
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(initialVolume, now + 0.04);
  } else {
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(initialVolume, now + 0.02);
  }

  let sourceNode = null;

  // 若選擇音檔模式，嘗試載入對應錄音
  if (currentToneMode !== "電子音") {
    const urls = getAudioUrlCandidates(currentToneMode, note, activeOctave);
    const buffer = await loadBufferWithFallback(urls);
    if (buffer) {
      sourceNode = audioCtx.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.loop = true; // 長按持續發聲
      // 若錄音檔前後有空白，可在此微調 loopStart / loopEnd
      sourceNode.connect(gainNode);
      sourceNode.start(now);
      return { sourceNode, gainNode, note, volume: initialVolume };
    }
  }

  // 電子音模式（或找不到音檔時的自動備援合成器）
  let freq = BASE_FREQUENCIES[note] || 523.25;
  if (activeOctave === "up") freq *= 2;
  if (activeOctave === "upup") freq *= 4;
  if (activeOctave === "down") freq *= 0.5;
  if (activeOctave === "downdown") freq *= 0.25;

  sourceNode = audioCtx.createOscillator();
  sourceNode.type = "triangle"; // 三角波較接近木管溫潤音色
  sourceNode.frequency.setValueAtTime(freq, now);
  sourceNode.connect(gainNode);
  sourceNode.start(now);

  return { sourceNode, gainNode, note, volume: initialVolume };
}

function stopVoice(voice, isCrossfade = false) {
  if (!voice || !voice.sourceNode) return;
  const now = audioCtx.currentTime;
  const fadeTime = isCrossfade ? 0.04 : 0.08;

  try {
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
    voice.sourceNode.stop(now + fadeTime + 0.01);
  } catch (e) {
    // 忽略已停止的節點錯誤
  }
}

// ==========================================
// 3. 動態建立琴鍵與互動事件 (滑鼠 + 多點觸控)
// ==========================================
const playerEl = document.getElementById("piano-player");
const whiteNotes = ["1", "2", "3", "4", "5", "6", "7"];

// 改用比例（基於白鍵的相對位置百分比）來定位黑鍵，實現完美自適應
const blackNotePositions = [
  { note: "♭1", percent: 1 },   // 1 左側
  { note: "♭2", percent: 15.2 }, // 1 與 2 之間
  { note: "♭3", percent: 29 }, // 2 與 3 之間
  { note: "♭4", percent: 43 }, // 3 與 4 之間
  { note: "♭5", percent: 56.5 }, // 4 與 5 之間
  { note: "♭6", percent: 70.5 },   // 5 與 6 之間
  { note: "♭7", percent: 84.2 }  // 6 與 7 之間
];

function buildKeyboard() {
  // 清空舊琴鍵（防止重複呼叫時累積）
  playerEl.innerHTML = "";

  // 生成白鍵
  whiteNotes.forEach((note) => {
    const key = document.createElement("div");
    key.className = "white-key";
    key.dataset.note = note;
    key.textContent = note;
    bindKeyEvents(key);
    playerEl.appendChild(key);
  });

  // 延遲一小步或直接計算黑鍵寬度（黑鍵寬度約為白鍵的 55% 左右）
  requestAnimationFrame(() => {
    const firstWhiteKey = playerEl.querySelector(".white-key");
    if (!firstWhiteKey) return;
    const whiteKeyWidth = firstWhiteKey.offsetWidth;
    const blackKeyWidth = Math.round(whiteKeyWidth * 0.58); // 黑鍵寬度隨白鍵等比例縮放

    blackNotePositions.forEach((item) => {
      const key = document.createElement("div");
      key.className = "black-key";
      key.dataset.note = item.note;
      key.style.width = `${blackKeyWidth}px`;
      
      // 根據容器總寬度計算精準的百分比位置（扣除兩側 padding 影響）
      key.style.left = `calc(${item.percent}% - ${blackKeyWidth / 2}px)`;
      
      bindKeyEvents(key);
      playerEl.appendChild(key);
    });
  });
}

// 監聽視窗大小改變時，即時重新計算黑鍵寬度，確保畫面旋轉或縮放時依然精準
window.addEventListener("resize", () => {
  const firstWhiteKey = playerEl.querySelector(".white-key");
  const blackKeys = playerEl.querySelectorAll(".black-key");
  if (!firstWhiteKey || blackKeys.length === 0) return;

  const whiteKeyWidth = firstWhiteKey.offsetWidth;
  const blackKeyWidth = Math.round(whiteKeyWidth * 0.58);

  blackKeys.forEach((key, index) => {
    if (blackNotePositions[index]) {
      key.style.width = `${blackKeyWidth}px`;
      key.style.left = `calc(${blackNotePositions[index].percent}% - ${blackKeyWidth / 2}px)`;
    }
  });
});

function bindKeyEvents(keyEl) {
  keyEl.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    keyEl.setPointerCapture(e.pointerId);
    keyEl.classList.add("active");

    const note = keyEl.dataset.note;
    const startY = e.clientY;
    const baseVolume = 0.75;

    // 處理連音模式切換
    if (isLegato) {
      if (legatoVoice) {
        stopVoice(legatoVoice, true); // 交叉淡出前一個連音
      }
      const voice = await startNote(note, baseVolume, true);
      legatoVoice = voice;
      activeVoices.set(e.pointerId, { voice, startY, baseVolume, keyEl, note });
    } else {
      const voice = await startNote(note, baseVolume, false);
      activeVoices.set(e.pointerId, { voice, startY, baseVolume, keyEl, note });
    }
  });

  // 按住後上下滑動控制音量（上滑變小，下滑變大）
  keyEl.addEventListener("pointermove", (e) => {
    const record = activeVoices.get(e.pointerId);
    if (!record || !record.voice) return;

    const deltaY = e.clientY - record.startY; // 往下滑為正，往上滑為負
    // 每滑動 120px 改變 0.75 音量，範圍限制在 0.05 ~ 1.0
    let newVol = record.baseVolume + (deltaY / 120) * 0.75;
    newVol = Math.max(0.05, Math.min(1.0, newVol));

    record.voice.volume = newVol;
    if (audioCtx && record.voice.gainNode) {
      record.voice.gainNode.gain.setTargetAtTime(newVol, audioCtx.currentTime, 0.015);
    }
  });

  const handleRelease = (e) => {
    const record = activeVoices.get(e.pointerId);
    if (!record) return;

    record.keyEl.classList.remove("active");
    activeVoices.delete(e.pointerId);

    // 若非連音模式，放開即停止聲音；若為連音模式，保留 legatoVoice 直到連音鍵放開
    if (!isLegato) {
      stopVoice(record.voice, false);
    }
  };

  keyEl.addEventListener("pointerup", handleRelease);
  keyEl.addEventListener("pointercancel", handleRelease);
}

buildKeyboard();

// ==========================================
// 4. 高低階與連音控制按鈕事件 (更新版)
// ==========================================

// 因為左右兩側都有相同的八度按鈕，我們用 class 抓取全部並同步狀態
document.querySelectorAll(".mod-btn").forEach((btn) => {
  const octaveType = btn.dataset.octave;

  btn.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);

    // 同步左右兩側相同八度按鈕的 active 視覺狀態
    document.querySelectorAll(`.mod-btn[data-octave="${octaveType}"]`).forEach(b => b.classList.add("active"));
    
    const prevOctave = activeOctave;
    activeOctave = octaveType;

    // 需求：若「先按黑白鍵才按高低階按鈕」，要變成一個原音~高/低8度音的連音
    if (activeVoices.size > 0 && prevOctave !== activeOctave) {
      for (let [pointerId, record] of activeVoices.entries()) {
        // 停止舊的當前音，無縫切換到新八度音
        stopVoice(record.voice, true);
        const newVoice = await startNote(record.note, record.volume, true);
        record.voice = newVoice;
      }
    }
  });

  const releaseOctave = (e) => {
    document.querySelectorAll(`.mod-btn[data-octave="${octaveType}"]`).forEach(b => b.classList.remove("active"));
    if (activeOctave === octaveType) {
      activeOctave = null;
    }
  };

  btn.addEventListener("pointerup", releaseOctave);
  btn.addEventListener("pointercancel", releaseOctave);
});

// 連音按鈕改為：點擊一下切換開關 (Toggle)
const legatoBtn = document.getElementById("btn-legato");
legatoBtn.addEventListener("click", () => {
  isLegato = !isLegato;
  if (isLegato) {
    legatoBtn.classList.add("active");
  } else {
    legatoBtn.classList.remove("active");
    // 關閉連音時，若當前有殘留的 legatoVoice 則停止
    if (legatoVoice && activeVoices.size === 0) {
      stopVoice(legatoVoice, false);
      legatoVoice = null;
    }
  }
});

// ==========================================
// 5. 錄音、計時、清除與下載功能
// ==========================================
const btnRecord = document.getElementById("btn-record");
const recTimer = document.getElementById("rec-timer");
const btnClear = document.getElementById("btn-clear");
const btnDownload = document.getElementById("btn-download");

let mediaRecorder = null;
let recordedChunks = [];
let recordedBlobUrl = null;
let isRecording = false;
let timerInterval = null;
let recordSeconds = 0;

function formatTime(sec) {
  const hrs = String(Math.floor(sec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const secs = String(sec % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

btnRecord.addEventListener("click", () => {
  initAudio();

  if (!isRecording) {
    // 開始錄製
    recordedChunks = [];
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
      recordedBlobUrl = null;
    }

    btnClear.classList.add("hidden");
    btnDownload.classList.add("hidden");

    mediaRecorder = new MediaRecorder(recordDest.stream);
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "audio/webm" });
      recordedBlobUrl = URL.createObjectURL(blob);
      btnClear.classList.remove("hidden");
      btnDownload.classList.remove("hidden");
    };

    mediaRecorder.start();
    isRecording = true;
    btnRecord.classList.add("recording");

    recordSeconds = 0;
    recTimer.textContent = formatTime(recordSeconds);
    timerInterval = setInterval(() => {
      recordSeconds++;
      recTimer.textContent = formatTime(recordSeconds);
    }, 1000);
  } else {
    // 停止錄製
    mediaRecorder.stop();
    isRecording = false;
    btnRecord.classList.remove("recording");
    clearInterval(timerInterval);
  }
});

// 清除錄製
btnClear.addEventListener("click", () => {
  if (recordedBlobUrl) {
    URL.revokeObjectURL(recordedBlobUrl);
    recordedBlobUrl = null;
  }
  recordedChunks = [];
  recTimer.textContent = "";
  btnClear.classList.add("hidden");
  btnDownload.classList.add("hidden");
});

// 下載音檔
btnDownload.addEventListener("click", () => {
  if (!recordedBlobUrl) return;
  const a = document.createElement("a");
  a.href = recordedBlobUrl;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.download = `recorder-play-${timestamp}.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
