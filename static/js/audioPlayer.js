let progressInterval;

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function updateProgress() {
  const audio = document.getElementById("audioElement");
  const progress = document.getElementById("progress");
  const currentTime = document.getElementById("currentTime");
  const duration = document.getElementById("duration");

  if (audio.duration) {
    const percentage = (audio.currentTime / audio.duration) * 100;
    progress.style.width = percentage + "%";
    currentTime.textContent = formatTime(audio.currentTime);
    duration.textContent = formatTime(audio.duration);
  }
}

function audioControl(action) {
  const audio = document.getElementById("audioElement");

  switch (action) {
    case "play":
      audio.play();
      break;
    case "pause":
      audio.pause();
      break;
    case "stop":
      audio.pause();
      audio.currentTime = 0;
      break;
  }
}

async function playAudio(filename) {
  const bucket = document.getElementById("bucket").value;
  const player = document.getElementById("audioPlayer");
  const playerTitle = document.getElementById("playerTitle");

  try {
    const response = await fetch("/get_content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, type: "audio", filename }),
    });

    const data = await response.json();
    if (data.url) {
      const audio = document.getElementById("audioElement");
      audio.src = data.url;

      player.className = "audio-player active";
      playerTitle.textContent = filename;

      clearInterval(progressInterval);
      progressInterval = setInterval(updateProgress, 100);

      document.getElementById("progressBar").onclick = function (e) {
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audio.currentTime = percentage * audio.duration;
      };

      audio.play();
    }
  } catch (error) {
    alert("Error playing audio");
    console.error(error);
  }
}
