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

  const populateTypingContent = () => {
    const typingBlocks = document.querySelectorAll(".code-highlight");
    typingBlocks.forEach((typingBlock) => {
      const typingSource = typingBlock.querySelector(".typing-source");
      const typingText = typingBlock.querySelector(".typing-text");
      if (typingSource && typingText && !typingText.textContent.trim()) {
        const codeText = typingSource.textContent;
        typingText.textContent = codeText;
        const typingSteps = typingText.dataset.typingSteps || codeText.length;
        typingText.style.setProperty("--typing-steps", typingSteps);
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

  const stopVoice = (message = "Voice over is off") => {
    if (synth && (synth.speaking || synth.pending)) {
      synth.cancel();
    }
    setVoiceState(false, message);
  };


  const startVoice = () => {
    if (!synth) {
      setVoiceState(false, "Voice over not supported");
      return;
    }
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
