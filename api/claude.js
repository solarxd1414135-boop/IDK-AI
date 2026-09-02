// Vercel serverless function.
// Lives at /api/claude, called by the frontend instead of api.anthropic.com directly.
// The API key stays here, on the server, and is never sent to the browser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const { prompt, system } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: "Missing 'prompt' in request body" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: system || undefined,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || "Anthropic API error" });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
