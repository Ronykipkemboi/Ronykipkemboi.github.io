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

const DEFAULT_VOICE_ID = "aCo0MjC9VdNNVf8S6sq3";
const MIN_API_KEY_LENGTH = 20;

const sendJson = (res, statusCode, payload) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
};

const resolveAllowedOrigin = (req) => {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!allowedOrigins.length) {
    return "";
  }
  const requestOrigin = req.headers.origin;
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  return allowedOrigins[0];
};

const setCorsHeaders = (req, res) => {
  const allowedOrigin = resolveAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
};

module.exports = async (req, res) => {
  setCorsHeaders(req, res);
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
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_VOICE_ID;
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();

  if (!text) {
    sendJson(res, 400, { message: "Text is required." });
    return;
  }
  if (requestedVoiceId && requestedVoiceId !== voiceId) {
    sendJson(res, 400, { message: "Invalid voice ID supplied." });
    return;
  }
  if (!voiceId) {
    sendJson(res, 400, { message: "ElevenLabs voice ID is missing." });
    return;
  }
  if (!apiKey) {
    console.error("ElevenLabs API key is not configured. Set ELEVENLABS_API_KEY environment variable.");
    sendJson(res, 503, {
      message: "ElevenLabs API key is not configured on the server.",
    });
    return;
  }

  // Basic API key validation - ElevenLabs API keys should be at least 20 characters
  if (apiKey.length < MIN_API_KEY_LENGTH) {
    console.error("ElevenLabs API key appears to be invalid (too short). Please verify ELEVENLABS_API_KEY.");
    sendJson(res, 503, {
      message: "Voice service is not properly configured. Please contact the site administrator.",
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
    let errorDetail = {};
    let errorText = "";
    try {
      errorText = await response.text();
      errorDetail = JSON.parse(errorText);
      console.error("ElevenLabs request failed.", JSON.stringify(errorDetail, null, 2));
    } catch (parseError) {
      console.error("ElevenLabs request failed with status:", response.status, "Raw response:", errorText);
    }

    // Handle specific error cases
    if (response.status === 401) {
      const errorStatus = errorDetail?.detail?.status;
      if (errorStatus === "invalid_api_key") {
        console.error("Invalid ElevenLabs API key. Please check the ELEVENLABS_API_KEY environment variable.");
        sendJson(res, 503, {
          message: "Voice service is temporarily unavailable. Please contact the site administrator.",
        });
        return;
      }
    }

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
