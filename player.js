let audio = null;
let currentId = null;

let nowTitleEl, timeEl, rangeEl, recordEl;

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
  // optional elements (only on Disc pages)
  nowTitleEl = document.getElementById("nowTitle");
  timeEl = document.getElementById("timeReadout");
  rangeEl = document.getElementById("progressRange");
  recordEl = document.getElementById("record");

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
        } else {
          audio.pause();
          setSpinning(false);
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

      audio.addEventListener("loadedmetadata", syncUI);
      audio.addEventListener("timeupdate", syncUI);
      audio.addEventListener("pause", () => setSpinning(false));
      audio.addEventListener("play", () => setSpinning(true));
      audio.addEventListener("ended", () => {
        setSpinning(false);
        syncUI();
      });

      try {
        await audio.play();
        setSpinning(true);
      } catch (e) {
        // Some browsers require another click; UI still updates.
        setSpinning(false);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", setupPlayer);
