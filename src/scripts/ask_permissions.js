document.addEventListener('DOMContentLoaded', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const cam = stream.getVideoTracks()[0]?.getSettings();
        const mic = stream.getAudioTracks()[0]?.getSettings();

        console.log("Devices:", { cam, mic });

        stream.getTracks().forEach(track => track.stop());

        window.close()
    } catch (err) {
        console.error("Media error:", err);
        window.alert('Please Approve Device Permission for The Extension (go to settings or Reinstall) Try Change your Device e.g mic/cam')
        window.location.href = `chrome://settings/content#media-stream-mic`
    } finally {
        // window.close()
    }
});