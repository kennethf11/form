// player.js
// Gatefold player: spins record while playing, shows Now Playing + time/progress,
// reveals track title/artist on click, and uses the sleeve cover art inside the record label.

let audio = null;
let currentId = null;

let nowTitleEl, timeEl, rangeEl, recordEl, recordLabelEl, recordCoverEl;

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

function setNowTitle(text) {
  if (nowTitleEl) nowTitleEl.textContent = text;
}

function setTimeReadout(cur, dur) {
  if (!timeEl) return;
  timeEl.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;
}

function setRangeFromAudio() {
  if (!rangeEl || !audio) return;
  if (!isFinite(audio.duration) || audio.duration <= 0) {
    rangeEl.value = "0";
    return;
  }
  rangeEl.value = String((audio.currentTime / audio.duration) * 100);
}

function syncUI() {
  if (!audio) return;
  setTimeReadout(audio.currentTime, audio.duration);
  setRangeFromAudio();
}

function stopAudio(resetLabel = true) {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  setSpinning(false);
  syncUI();
  if (resetLabel) resetRecordLabel();
}

function resetRecordLabel() {
  // If you kept <strong id="recordLabel">disc a</strong>, reset to that base text
  if (recordLabelEl) {
    const base = recordLabelEl.dataset.base || recordLabelEl.textContent || "";
    recordLabelEl.textContent = base;
  }

  // If you use image-based label <img id="recordCover" ...>, reset to sleeve cover
  if (recordCoverEl) {
    const sleeveImg = document.querySelector(".cover img");
    if (sleeveImg) recordCoverEl.src = sleeveImg.src;
  }
}

function setRecordLabelToTrack(labelText) {
  // Text label mode (optional)
  if (recordLabelEl) recordLabelEl.textContent = labelText;

  // Image label mode: show sleeve cover in center while playing (what you asked)
  if (recordCoverEl) {
    const sleeveImg = document.querySelector(".cover img");
    if (sleeveImg) recordCoverEl.src = sleeveImg.src;
  }
}

function revealTrack(el) {
  // For your "hidden until clicked" requirement
  // Works if your track divs have class="track reveal" and inner title/artist have class="hidden"
  el.classList.add("revealed");
}

function setupPlayer() {
  nowTitleEl = document.getElementById("nowTitle");
  timeEl = document.getElementById("timeReadout");
  rangeEl = document.getElementById("progressRange");
  recordEl = document.getElementById("record");
  recordLabelEl = document.getElementById("recordLabel");   // optional text mode
  recordCoverEl = document.getElementById("recordCover");   // image label mode

  // Store base label text so we can restore it later
  if (recordLabelEl && !recordLabelEl.dataset.base) {
    recordLabelEl.dataset.base = recordLabelEl.textContent.trim();
  }

  // Scrub bar
  if (rangeEl) {
    rangeEl.addEventListener("input", () => {
      if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;
      const pct = Number(rangeEl.value) / 100;
      audio.currentTime = pct * audio.duration;
      syncUI();
    });
  }

  // Tracks
  const tracks = document.querySelectorAll("[data-audio]");
  tracks.forEach((el) => {
    el.addEventListener("click", async () => {
      const src = el.getAttribute("data-audio");
      const label = el.getAttribute("data-label") || "Unknown track";
      const id = el.getAttribute("data-id") || label;

      // reveal metadata the first time they click
      revealTrack(el);

      // If same track, toggle play/pause
      if (audio && currentId === id) {
        if (audio.paused) {
          try {
            await audio.play();
            setSpinning(true);
            setNowTitle(`Now playing: ${label}`);
            setRecordLabelToTrack(label);
          } catch (e) {
            // ignore
          }
        } else {
          audio.pause();
          setSpinning(false);
          setNowTitle(`Paused: ${label}`);
        }
        return;
      }

      // New track: stop previous cleanly
      if (audio) stopAudio(false);

      audio = new Audio(src);
      currentId = id;

      // Immediately set UI
      setNowTitle(`Now playing: ${label}`);
      if (rangeEl) rangeEl.value = "0";
      setTimeReadout(0, 0);
      setRecordLabelToTrack(label);

      // Hook events
      audio.addEventListener("loadedmetadata", syncUI);
      audio.addEventListener("timeupdate", syncUI);
      audio.addEventListener("play", () => setSpinning(true));
      audio.addEventListener("pause", () => setSpinning(false));
      audio.addEventListener("ended", () => {
        setSpinning(false);
        setNowTitle(`Finished: ${label}`);
        syncUI();
        // reset label shortly after end (feels nicer)
        setTimeout(() => resetRecordLabel(), 700);
      });

      // Play
      try {
        await audio.play();
        setSpinning(true);
      } catch (e) {
        // Some browsers block autoplay; user can click again.
        setSpinning(false);
        setNowTitle(`Tap again to play: ${label}`);
      }
    });
  });

  // Set initial label image to sleeve cover (nice on load)
  resetRecordLabel();

  // Stop audio if they navigate away
  window.addEventListener("beforeunload", () => {
    try { stopAudio(false); } catch(e) {}
  });
}

document.addEventListener("DOMContentLoaded", setupPlayer);
