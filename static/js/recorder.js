// Update duration display
document.getElementById("duration").addEventListener("input", function (e) {
  document.getElementById("durationValue").textContent = e.target.value;
});

async function startRecording() {
  const bucket = document.getElementById("bucket").value;
  if (!bucket) {
    alert("Please enter a bucket name");
    return;
  }

  const duration = document.getElementById("duration").value;
  const recordButton = document.getElementById("recordButton");
  const status = document.getElementById("recordingStatus");

  recordButton.disabled = true;
  status.textContent = "Recording in progress...";

  try {
    const response = await fetch("/start_recording", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, duration }),
    });

    const data = await response.json();
    if (data.success) {
      status.textContent = "Recording completed and uploaded!";
      refreshFiles();
    } else {
      status.textContent = "Recording failed: " + data.error;
    }
  } catch (error) {
    status.textContent = "Error recording audio";
    console.error(error);
  } finally {
    recordButton.disabled = false;
  }
}
