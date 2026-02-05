const DEFAULT_MESSAGE =
  "Thanks for reaching out! I'm happy to chat about frontend systems, full-stack builds, and projects.";

const FALLBACK_CONTEXT = 
  "You are Ronald Kipkemboi. Answer briefly about your skills in React, Java, and full-stack development.";

const AI_MAX_TOKENS = 250;
const AI_TEMPERATURE = 0.8;

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
  const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const contextPrompt = typeof body.system === "string" ? body.system.trim() : "";
  
  if (!userPrompt) {
    sendJson(res, 400, { message: "Prompt text is required." });
    return;
  }

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiKey) {
    const fallbackResponse = `${DEFAULT_MESSAGE} You asked: "${userPrompt}".`;
    sendJson(res, 200, { message: fallbackResponse });
    return;
  }

  const conversationContext = contextPrompt || FALLBACK_CONTEXT;

  let aiResponse;
  try {
    const openaiRequest = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: conversationContext },
          { role: "user", content: userPrompt }
        ],
        max_tokens: AI_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
      }),
    });

    if (!openaiRequest.ok) {
      console.error("OpenAI API error:", openaiRequest.status);
      const fallbackResponse = `${DEFAULT_MESSAGE} You asked: "${userPrompt}".`;
      sendJson(res, 200, { message: fallbackResponse });
      return;
    }

    const aiData = await openaiRequest.json();
    aiResponse = aiData.choices?.[0]?.message?.content?.trim() || DEFAULT_MESSAGE;
  } catch (err) {
    console.error("Failed to contact OpenAI:", err);
    aiResponse = `${DEFAULT_MESSAGE} You asked: "${userPrompt}".`;
  }

  sendJson(res, 200, { message: aiResponse });
};
