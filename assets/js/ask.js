document.addEventListener('DOMContentLoaded', async () => {
    console.log('ruin')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    const cam = stream.getVideoTracks()[0]?.getSettings();
    const mic = stream.getAudioTracks()[0]?.getSettings();

    console.log("Devices:", { cam, mic });

    chrome.runtime.sendMessage({
      action: "MEDIA_DEVICES_LIST",
      stream: { cam, mic },
    });

    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.error("Media error:", err);
  }
});