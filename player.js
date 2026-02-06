let currentAudio = null;
let currentId = null;

function setupTracks() {
  const tracks = document.querySelectorAll("[data-audio]");
  const now = document.getElementById("nowPlaying");

  tracks.forEach((el) => {
    el.addEventListener("click", async () => {
      const src = el.getAttribute("data-audio");
      const label = el.getAttribute("data-label");
      const id = el.getAttribute("data-id");

      // If same track, toggle play/pause
      if (currentAudio && currentId === id) {
        if (currentAudio.paused) {
          await currentAudio.play();
          if (now) now.innerHTML = `<span>Now playing: ${label}</span>`;
        } else {
          currentAudio.pause();
          if (now) now.innerHTML = `<span>Paused: ${label}</span>`;
        }
        return;
      }

      // Stop old track
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Start new
      currentAudio = new Audio(src);
      currentId = id;

      currentAudio.addEventListener("ended", () => {
        if (now) now.innerHTML = `<span>Finished: ${label}</span>`;
      });

      try {
        await currentAudio.play();
        if (now) now.innerHTML = `<span>Now playing: ${label}</span>`;
      } catch (e) {
        if (now) now.innerHTML = `<span>Couldn’t autoplay — click again.</span>`;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", setupTracks);
