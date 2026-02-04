(() => {
  const voiceToggle = document.getElementById("voice-toggle");
  const voiceStatus = document.getElementById("voice-status");

  if (!voiceToggle || !voiceStatus) {
    return;
  }

  const synth = window.speechSynthesis;
  let voiceActive = false;

  const setVoiceState = (active, message) => {
    voiceActive = active;
    voiceToggle.textContent = active ? "stop voice over" : "start voice over";
    voiceToggle.setAttribute("aria-pressed", active ? "true" : "false");
    voiceStatus.textContent = message;
  };

  const stopVoice = (message = "voice over is off") => {
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
    }
    setVoiceState(false, message);
  };

  const startVoice = () => {
    if (!synth) {
      setVoiceState(false, "voice over not supported");
      return;
    }
    const mainContent = document.querySelector("main");
    const text = mainContent ? mainContent.innerText.replace(/\s+/g, " ").trim() : "";
    if (!text) {
      setVoiceState(false, "nothing to read");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => stopVoice();
    utterance.onerror = () => stopVoice("voice over stopped");
    synth.cancel();
    synth.speak(utterance);
    setVoiceState(true, "voice over is on");
  };

  setVoiceState(false, "voice over is off");

  voiceToggle.addEventListener("click", () => {
    if (voiceActive) {
      stopVoice();
    } else {
      startVoice();
    }
  });
})();
