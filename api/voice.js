const readJsonBody = async (req) => {
  if (req.body) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    return {};
  }
};

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    sendJson(res, 405, { message: "Method not allowed." });
    return;
  }

  const body = await readJsonBody(req);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const requestedVoiceId =
    typeof body.voiceId === "string" ? body.voiceId.trim() : "";
  const voiceId =
    process.env.ELEVENLABS_VOICE_ID?.trim() || requestedVoiceId;
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!text) {
    sendJson(res, 400, { message: "Text is required." });
    return;
  }
  if (!voiceId) {
    sendJson(res, 400, { message: "ElevenLabs voice ID is missing." });
    return;
  }
  if (!apiKey) {
    sendJson(res, 503, {
      message: "ElevenLabs API key is not configured on the server.",
    });
    return;
  }

  let response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.4,
            similarity_boost: 0.85,
          },
        }),
      },
    );
  } catch (error) {
    sendJson(res, 502, { message: "Unable to reach ElevenLabs." });
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs request failed.", errorText);
    sendJson(res, response.status, {
      message: "ElevenLabs request failed.",
    });
    return;
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  res.statusCode = 200;
  res.setHeader("Content-Type", "audio/mpeg");
  res.end(audioBuffer);
};
