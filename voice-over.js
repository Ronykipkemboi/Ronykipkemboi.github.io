(() => {
  const voiceToggle = document.getElementById("voice-toggle");
  const voiceStatus = document.getElementById("voice-status");

  if (!voiceToggle || !voiceStatus) {
    return;
  }

  const synth = window.speechSynthesis;
  const READABLE_ELEMENTS_SELECTOR =
    "h1, h2, h3, h4, h5, h6, p, li, label, blockquote, figcaption, td, th, dd, dt";
  const EXCLUDE_SELECTOR = "[data-voice-ignore]";
  let voiceActive = false;
  let activeAudio = null;
  let activeAudioUrl = null;
  let activeRequestController = null;

  const populateTypingContent = () => {
    const typingBlocks = document.querySelectorAll(".code-highlight");
    typingBlocks.forEach((typingBlock) => {
      const typingSource = typingBlock.querySelector(".typing-source");
      const typingText = typingBlock.querySelector(".typing-text");
      if (typingSource && typingText && !typingText.textContent.trim()) {
        const codeText = typingSource.textContent;
        typingText.textContent = codeText;
        const effectiveTypingSteps = typingText.dataset.typingSteps || codeText.length;
        typingText.style.setProperty("--typing-steps", effectiveTypingSteps);
      }
    });
  };

  populateTypingContent();

  const setVoiceState = (active, message) => {
    voiceActive = active;
    voiceToggle.textContent = active ? "Stop Voice Over" : "Start Voice Over";
    voiceToggle.setAttribute("aria-pressed", active ? "true" : "false");
    voiceStatus.textContent = message;
  };

  const clearActiveAudio = () => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    if (activeAudioUrl) {
      URL.revokeObjectURL(activeAudioUrl);
      activeAudioUrl = null;
    }
  };

  const stopVoice = (message = "Voice over is off") => {
    if (activeRequestController) {
      activeRequestController.abort();
      activeRequestController = null;
    }
    clearActiveAudio();
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
    }
    setVoiceState(false, message);
  };

  const startVoice = async () => {
    const mainContent = document.querySelector("main");
    if (!mainContent) {
      setVoiceState(false, "No main content found");
      return;
    }
    populateTypingContent();
    const readableElements = mainContent.querySelectorAll(
      READABLE_ELEMENTS_SELECTOR,
    );
    const text = Array.from(readableElements)
      .filter((element) => !element.closest(EXCLUDE_SELECTOR))
      .filter((element) => element.getAttribute("aria-hidden") !== "true")
      .map((element) => element.getAttribute("aria-label") || element.textContent)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      setVoiceState(false, "Nothing to read");
      return;
    }

    const voiceEndpoint = voiceToggle.dataset.voiceEndpoint?.trim();
    if (voiceEndpoint) {
      setVoiceState(true, "Generating voice over...");
      activeRequestController = new AbortController();
      try {
        const response = await fetch(voiceEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: activeRequestController.signal,
        });
        if (!response.ok) {
          setVoiceState(false, "Voice over unavailable");
          return;
        }
        const audioBuffer = await response.arrayBuffer();
        const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
        const audioUrl = URL.createObjectURL(audioBlob);
        clearActiveAudio();
        activeAudioUrl = audioUrl;
        activeAudio = new Audio(audioUrl);
        activeAudio.onended = () => {
          clearActiveAudio();
          setVoiceState(false, "Voice over is off");
        };
        await activeAudio.play();
        setVoiceState(true, "Voice over is on");
      } catch (error) {
        if (error.name !== "AbortError") {
          setVoiceState(false, "Voice over unavailable");
        }
      } finally {
        activeRequestController = null;
      }
      return;
    }

    if (!synth) {
      setVoiceState(false, "Voice over not supported");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setVoiceState(false, "Voice over is off");
    utterance.onerror = (event) => {
      const detail = event.error ? ` (${event.error})` : "";
      stopVoice(`Voice over stopped${detail}`);
    };
    synth.cancel();
    synth.speak(utterance);
    setVoiceState(true, "Voice over is on");
  };

  setVoiceState(false, "Voice over is off");

  voiceToggle.addEventListener("click", () => {
    if (voiceActive) {
      stopVoice();
    } else {
      startVoice();
    }
  });
})();
