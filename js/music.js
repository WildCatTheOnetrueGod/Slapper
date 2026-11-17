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
let currentToneMode = "全按當1"; // "電子音" | "全按當1" | "全按當5"
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
const blackNotes = [
  { note: "♭1", leftOffset: 5 },   // 1 左側
  { note: "♭2", leftOffset: 71 },  // 1 與 2 之間
  { note: "♭3", leftOffset: 137 }, // 2 與 3 之間
  { note: "♭4", leftOffset: 203 }, // 3 與 4 之間
  { note: "♭5", leftOffset: 269 }, // 4 與 5 之間
  { note: "♭6", leftOffset: 335 }, // 5 與 6 之間
  { note: "♭7", leftOffset: 401 }, // 6 與 7 之間
  { note: "♭1", leftOffset: 467 }  // 7 右側高八度半音（對應圖片最右側黑鍵）
];

function buildKeyboard() {
  // 生成白鍵
  whiteNotes.forEach((note) => {
    const key = document.createElement("div");
    key.className = "white-key";
    key.dataset.note = note;
    key.textContent = note;
    bindKeyEvents(key);
    playerEl.appendChild(key);
  });

  // 生成黑鍵（略高一節，不顯示數字）
  blackNotes.forEach((item) => {
    const key = document.createElement("div");
    key.className = "black-key";
    key.dataset.note = item.note;
    key.style.left = `${item.leftOffset}px`;
    bindKeyEvents(key);
    playerEl.appendChild(key);
  });
}

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
      activeVoices.set(e.pointerId, { voice, startY, baseVolume, keyEl });
    } else {
      const voice = await startNote(note, baseVolume, false);
      activeVoices.set(e.pointerId, { voice, startY, baseVolume, keyEl });
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
// 4. 高低階與連音控制按鈕事件
// ==========================================
document.querySelectorAll(".mod-btn").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    btn.classList.add("active");
    activeOctave = btn.dataset.octave;
  });

  const releaseOctave = (e) => {
    btn.classList.remove("active");
    if (activeOctave === btn.dataset.octave) {
      activeOctave = null;
    }
  };

  btn.addEventListener("pointerup", releaseOctave);
  btn.addEventListener("pointercancel", releaseOctave);
});

const legatoBtn = document.getElementById("btn-legato");
legatoBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  legatoBtn.setPointerCapture(e.pointerId);
  legatoBtn.classList.add("active");
  isLegato = true;
});

const releaseLegato = () => {
  legatoBtn.classList.remove("active");
  isLegato = false;
  // 放開連音鍵時，若無手指按在琴鍵上，立即停止連音延音
  if (legatoVoice && activeVoices.size === 0) {
    stopVoice(legatoVoice, false);
    legatoVoice = null;
  }
};

legatoBtn.addEventListener("pointerup", releaseLegato);
legatoBtn.addEventListener("pointercancel", releaseLegato);

// 音色單選切換
document.querySelectorAll('input[name="tone-mode"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    currentToneMode = e.target.value;
  });
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