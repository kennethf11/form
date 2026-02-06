// player.js
// Gatefold player: updates a title ABOVE the record, shows Now Playing + time/progress,
// reveals track title/artist on click, and DOES NOT change the record label/cover.
// (Optional: record can still spin if you keep the existing spinning CSS + setSpinning calls.)

let audio = null;
let currentId = null;

let nowTitleEl, timeEl, rangeEl, recordEl, playingTitleEl;

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

function revealTrack(el) {
  el.classList.add("revealed");
}

function stopAudio() {
  if (!audio) return;
  audio.pause();
  audio.currentTime = 0;
  setSpinning(false);
  syncUI();
}

function defaultSideText() {
  const t = (document.title || "").toLowerCase();
  if (t.includes("disc b")) return "side b • (select a track)";
  return "side a • (select a track)";
}

function setupPlayer() {
  nowTitleEl = document.getElementById("nowTitle");
  timeEl = document.getElementById("timeReadout");
  rangeEl = document.getElementById("progressRange");
  recordEl = document.getElementById("record");
  playingTitleEl = document.getElementById("playingTitle");

  // set initial title above record
  if (playingTitleEl) playingTitleEl.textContent = defaultSideText();

  // scrub bar
  if (rangeEl) {
    rangeEl.addEventListener("input", () => {
      if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return;
      const pct = Number(rangeEl.value) / 100;
      audio.currentTime = pct * audio.duration;
      syncUI();
    });
  }

  // tracks
  const tracks = document.querySelectorAll("[data-audio]");
  tracks.forEach((el) => {
    el.addEventListener("click", async () => {
      const src = el.getAttribute("data-audio");
      const label = el.getAttribute("data-label") || "Unknown track";
      const id = el.getAttribute("data-id") || label;

      // reveal metadata (your hidden-until-clicked)
      revealTrack(el);

      // same track -> toggle play/pause
      if (audio && currentId === id) {
        if (audio.paused) {
          try {
            await audio.play();
            setSpinning(true);
            setNowTitle(`Now playing: ${label}`);
            if (playingTitleEl) playingTitleEl.textContent = label;
          } catch (e) {
            // ignore
          }
        } else {
          audio.pause();
          setSpinning(false);
          setNowTitle(`Paused: ${label}`);
          if (playingTitleEl) playingTitleEl.textContent = `paused • ${label}`;
        }
        return;
      }

      // new track
      if (audio) stopAudio();

      audio = new Audio(src);
      currentId = id;

      // UI reset
      if (rangeEl) rangeEl.value = "0";
      setTimeReadout(0, 0);

      setNowTitle(`Now playing: ${label}`);
      if (playingTitleEl) playingTitleEl.textContent = label;

      // events
      audio.addEventListener("loadedmetadata", syncUI);
      audio.addEventListener("timeupdate", syncUI);
      audio.addEventListener("play", () => setSpinning(true));
      audio.addEventListener("pause", () => setSpinning(false));
      audio.addEventListener("ended", () => {
        setSpinning(false);
        setNowTitle(`Finished: ${label}`);
        syncUI();
        if (playingTitleEl) playingTitleEl.textContent = defaultSideText();
      });

      // play
      try {
        await audio.play();
        setSpinning(true);
      } catch (e) {
        setSpinning(false);
        setNowTitle(`Tap again to play: ${label}`);
      }
    });
  });

  // stop audio if leaving page
  window.addEventListener("beforeunload", () => {
    try { stopAudio(); } catch(e) {}
  });
}

document.addEventListener("DOMContentLoaded", setupPlayer);
