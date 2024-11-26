async function refreshFiles() {
  const bucket = document.getElementById("bucket").value;
  if (!bucket) {
    alert("Please enter a bucket name");
    return;
  }

  try {
    const response = await fetch("/list_files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket }),
    });

    const data = await response.json();

    // Update audio files
    document.getElementById("audioFiles").innerHTML = data.audio_files
      .map(
        (file) => `
                <div class="file-item">
                    <span>${file}</span>
                    <button onclick="playAudio('${file}')">Play</button>
                </div>
            `
      )
      .join("");

    // Update transcripts
    document.getElementById("transcripts").innerHTML = data.transcripts
      .map(
        (file) => `
                <div class="file-item">
                    <span>${file}</span>
                    <button onclick="viewContent('transcript', '${file}')">View</button>
                </div>
            `
      )
      .join("");

    // Update summaries
    document.getElementById("summaries").innerHTML = data.summaries
      .map(
        (file) => `
                <div class="file-item">
                    <span>${file}</span>
                    <button onclick="viewContent('summary', '${file}')">View</button>
                </div>
            `
      )
      .join("");
  } catch (error) {
    alert("Error refreshing files");
    console.error(error);
  }
}

async function viewContent(type, filename) {
  const bucket = document.getElementById("bucket").value;

  try {
    const response = await fetch("/get_content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, type, filename }),
    });

    const data = await response.json();
    if (data.content) {
      const contentView = document.getElementById("contentView");
      contentView.style.display = "block";
      contentView.innerHTML = `<h3>${filename}</h3><p>${data.content}</p>`;
    }
  } catch (error) {
    alert("Error viewing content");
    console.error(error);
  }
}
