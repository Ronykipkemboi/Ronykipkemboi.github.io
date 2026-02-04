(() => {
  const root = document.documentElement;
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeIcon = themeToggle ? themeToggle.querySelector("span") : null;
  const accessibilityButtons = document.querySelectorAll("[data-accessibility]");

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    if (themeIcon) {
      themeIcon.textContent = theme === "light" ? "☀️" : "🌙";
    }
  };

  const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
  const storedTheme =
    localStorage.getItem("theme") || (prefersLight ? "light" : "dark");
  applyTheme(storedTheme);

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const nextTheme = root.dataset.theme === "light" ? "dark" : "light";
      applyTheme(nextTheme);
      localStorage.setItem("theme", nextTheme);
    });
  }

  const accessibilityState = (() => {
    try {
      return JSON.parse(localStorage.getItem("accessibility")) || {};
    } catch (error) {
      console.warn(
        "Unable to load accessibility preferences. Using defaults.",
        error,
      );
      return {};
    }
  })();

  const updateAccessibility = () => {
    ["high-contrast", "large-text", "reduce-motion"].forEach((key) => {
      root.classList.toggle(key, Boolean(accessibilityState[key]));
    });
    accessibilityButtons.forEach((button) => {
      const mode = button.dataset.accessibility;
      button.classList.toggle("active", Boolean(accessibilityState[mode]));
      button.setAttribute("aria-pressed", Boolean(accessibilityState[mode]));
    });
    localStorage.setItem("accessibility", JSON.stringify(accessibilityState));
  };

  if (accessibilityButtons.length) {
    accessibilityButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.accessibility;
        accessibilityState[mode] = !accessibilityState[mode];
        updateAccessibility();
      });
    });
    updateAccessibility();
  }

  const particleCount = 70; // Total number of particles to render.
  const particleDensityArea = 900; // Pixel area used for density calculations.

  if (window.tsParticles && document.getElementById("tsparticles")) {
    window.tsParticles.load("tsparticles", {
      background: { color: "transparent" },
      fpsLimit: 60,
      particles: {
        color: { value: "#4ea1ff" },
        links: {
          enable: true,
          color: "#4ea1ff",
          distance: 140,
          opacity: 0.25,
        },
        move: {
          enable: true,
          speed: 0.6,
        },
        number: {
          value: particleCount,
          density: { enable: true, area: particleDensityArea },
        },
        opacity: { value: 0.6 },
        size: { value: { min: 1, max: 3 } },
      },
      interactivity: {
        events: {
          onHover: { enable: true, mode: "grab" },
          resize: true,
        },
        modes: {
          grab: { distance: 160, links: { opacity: 0.4 } },
        },
      },
      detectRetina: true,
    });
  }

  const filterButtons = document.querySelectorAll("[data-filter]");
  const projectCards = document.querySelectorAll("[data-category]");
  if (filterButtons.length && projectCards.length) {
    const cardCategories = new Map();
    projectCards.forEach((card) => {
      const categories = (card.dataset.category || "")
        .split(",")
        .map((value) => value.trim());
      cardCategories.set(card, categories);
    });
    const setFilter = (filter) => {
      filterButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === filter);
      });
      projectCards.forEach((card) => {
        const categories = cardCategories.get(card) || [];
        const match = filter === "All" || categories.includes(filter);
        card.style.display = match ? "flex" : "none";
      });
    };
    filterButtons.forEach((button) => {
      button.addEventListener("click", () => setFilter(button.dataset.filter));
    });
    setFilter(filterButtons[0].dataset.filter);
  }

  const assistantWidget = document.querySelector(".assistant-widget");
  if (assistantWidget) {
    const messages = assistantWidget.querySelector("[data-assistant-messages]");
    const input = assistantWidget.querySelector("[data-assistant-input]");
    const sendButton = assistantWidget.querySelector("[data-assistant-send]");
    const muteButton = assistantWidget.querySelector("[data-voice-toggle]");
    const waveform = assistantWidget.querySelector(".waveform");

    let muted = false;
    let activeAudio = null;
    let activeAudioUrl = null;

    const systemPrompt =
      assistantWidget.dataset.systemPrompt ||
      "You are Ronald Kipkemboi, a CS Student-Athlete at Shaw University skilled in React, Java, and AV Tech.";

    const setWaveformState = (speaking) => {
      if (!waveform) return;
      waveform.classList.toggle("muted", muted || !speaking);
    };

    const appendMessage = (text, type) => {
      if (!messages) return;
      const bubble = document.createElement("div");
      bubble.className = `assistant-bubble ${type}`;
      bubble.textContent = text;
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    };

    const defaultAssistantMessage =
      "I can help with frontend systems, React, and full-stack builds. Please reach out to connect live AI responses.";

    const fetchAssistantReply = async (text) => {
      const endpoint = assistantWidget.dataset.chatEndpoint;
      if (!endpoint) {
        return defaultAssistantMessage;
      }
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text, system: systemPrompt }),
        });
      } catch (error) {
        return "Unable to reach the assistant service. Please check your connection and try again.";
      }
      if (!response.ok) {
        console.warn("Assistant service unavailable.", response.status);
        return "Assistant service unavailable. Please try again shortly.";
      }
      const data = await response.json();
      return (
        data.message?.trim() ||
        "Thanks for the message! I'm ready to help with frontend-focused full-stack work."
      );
    };

    const speakWithElevenLabs = async (text) => {
      const voiceId = assistantWidget.dataset.voiceId?.trim();
      const endpoint = assistantWidget.dataset.voiceEndpoint;
      if (!voiceId || !endpoint || muted) {
        return;
      }
      setWaveformState(true);
      let response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
        });
      } catch (error) {
        setWaveformState(false);
        return;
      }
      if (!response.ok) {
        setWaveformState(false);
        return;
      }
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (activeAudio) {
        activeAudio.pause();
        if (activeAudioUrl) {
          URL.revokeObjectURL(activeAudioUrl);
        }
      }
      activeAudioUrl = audioUrl;
      activeAudio = new Audio(audioUrl);
      activeAudio.onended = () => {
        setWaveformState(false);
        if (activeAudioUrl) {
          URL.revokeObjectURL(activeAudioUrl);
          activeAudioUrl = null;
        }
      };
      activeAudio.play();
    };

    const handleSend = async () => {
      const text = input?.value.trim();
      if (!text) return;
      appendMessage(text, "user");
      input.value = "";
      const reply = await fetchAssistantReply(text);
      appendMessage(reply, "assistant");
      speakWithElevenLabs(reply);
    };

    sendButton?.addEventListener("click", handleSend);
    input?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleSend();
      }
    });

    if (muteButton) {
      muteButton.setAttribute("aria-pressed", String(muted));
      muteButton.textContent = muted ? "Unmute" : "Mute";
      setWaveformState(false);
      muteButton.addEventListener("click", () => {
        muted = !muted;
        muteButton.setAttribute("aria-pressed", String(muted));
        muteButton.textContent = muted ? "Unmute" : "Mute";
        setWaveformState(false);
        if (activeAudio && muted) {
          activeAudio.pause();
        }
      });
    }
  }
})();
