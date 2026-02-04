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

  const storedTheme = localStorage.getItem("theme") || "dark";
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
        number: { value: 70, density: { enable: true, area: 900 } },
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
    const setFilter = (filter) => {
      filterButtons.forEach((button) => {
        button.classList.toggle("active", button.dataset.filter === filter);
      });
      projectCards.forEach((card) => {
        const categories = (card.dataset.category || "")
          .split(",")
          .map((value) => value.trim());
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

    const systemPrompt =
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

    const fetchAssistantReply = async (text) => {
      const apiKey =
        window.OPENAI_API_KEY || localStorage.getItem("OPENAI_API_KEY");
      if (!apiKey) {
        return `I can help with frontend systems, React, and full-stack builds. Add your OpenAI key to continue live responses.`;
      }
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
      });
      const data = await response.json();
      return (
        data.choices?.[0]?.message?.content?.trim() ||
        "Thanks for the message! I'm ready to help with frontend-focused full-stack work."
      );
    };

    const speakWithElevenLabs = async (text) => {
      const voiceId = localStorage.getItem("ELEVENLABS_VOICE_ID");
      const apiKey =
        window.ELEVENLABS_API_KEY || localStorage.getItem("ELEVENLABS_API_KEY");
      if (!voiceId || !apiKey || muted) {
        return;
      }
      setWaveformState(true);
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_monolingual_v1",
            voice_settings: { stability: 0.45, similarity_boost: 0.75 },
          }),
        },
      );
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      if (activeAudio) {
        activeAudio.pause();
      }
      activeAudio = new Audio(audioUrl);
      activeAudio.onended = () => setWaveformState(false);
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
