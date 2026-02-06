let audio = null;
let currentId = null;

let nowTitleEl, timeEl, rangeEl, recordEl, recordLabelEl;

function fmtTime(sec) {
  if (!isFinite(sec)) return "0:00";
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function setSpinning(on) {
  if (!recordEl) return;
  recordEl.classList.toggle("spinning", !!on);
}

function baseLabelText() {
  // fallback to the page title if present, else keep existing label text
  const t = document.title || "";
  if (t.toLowerCase().includes("disc a")) return "disc a";
  if (t.toLowerCase().includes("disc b")) return "disc b";
  return recordLabelEl ? recordLabelEl.dataset.base || recordLabelEl.textContent : "";
}

function setRecordLabel(text) {
  if (!recordLabelEl) return;
  recordLabelEl.textContent = text;
}

function stopAudio() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  setSpinning(false);
}

function syncUI() {
  if (!audio) return;

  if (timeEl) {
    timeEl.textContent = `${fmtTime(audio.currentTime)} / ${fmtTime(audio.duration)}`;
  }
  if (rangeEl && isFinite(audio.duration) && audio.duration > 0) {
    rangeEl.value = String((audio.currentTime / audio.duration) * 100);
  }
}

function setupPlayer() {
  nowTitleEl = document.getElementById("nowTitle");
  timeEl = document.getElementById("timeReadout");
  rangeEl = document.getElementById("progressRange");
  recordEl = document.getElementById("record");
  recordLabelEl = document.getElementById("recordLabel");

  // store base label for resets
  if (recordLabelEl && !recordLabelEl.dataset.base) {
    recordLabelEl.dataset.base = recordLabelEl.textContent.trim();
  }

  const tracks = document.querySelectorAll("[data-audio]");

  // scrub
  if (rangeEl) {
    rangeEl.addEventListener("input", () => {
      if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;
      const pct = Number(rangeEl.value) / 100;
      audio.currentTime = pct * audio.duration;
      syncUI();
    });
  }

  tracks.forEach((el) => {
    el.addEventListener("click", async () => {
      const src = el.getAttribute("data-audio");
      const label = el.getAttribute("data-label");
      const id = el.getAttribute("data-id");

      // Toggle if same track
      if (audio && currentId === id) {
        if (audio.paused) {
          await audio.play();
          setSpinning(true);
          if (nowTitleEl) nowTitleEl.textContent = `Now playing: ${label}`;
          setRecordLabel(label);
        } else {
          audio.pause();
          setSpinning(false);
          if (nowTitleEl) nowTitleEl.textContent = `Paused: ${label}`;
          // keep label on pause (feels like a real player)
        }
        return;
      }

      // New track
      stopAudio();
      audio = new Audio(src);
      currentId = id;

      if (nowTitleEl) nowTitleEl.textContent = `Now playing: ${label}`;
      if (rangeEl) rangeEl.value = "0";
      if (timeEl) timeEl.textContent = `0:00 / 0:00`;
      setRecordLabel(label);

      audio.addEventListener("loadedmetadata", syncUI);
      audio.addEventListener("timeupdate", syncUI);

      audio.addEventListener("pause", () => {
        setSpinning(false);
      });

      audio.addEventListener("play", () => {
        setSpinning(true);
      });

      audio.addEventListener("ended", () => {
        setSpinning(false);
        syncUI();
        if (nowTitleEl) nowTitleEl.textContent = `Finished: ${label}`;
        // reset label to disc name after it ends
        setTimeout(() => setRecordLabel(baseLabelText()), 800);
      });

      try {
        await audio.play();
        setSpinning(true);
      } catch (e) {
        setSpinning(false);
      }
    });
  });

  // If they leave the page mid-play, stop cleanly
  window.addEventListener("beforeunload", () => stopAudio());
}

document.addEventListener("DOMContentLoaded", setupPlayer);
