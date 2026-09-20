export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Keine Nachricht angegeben" });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        input: `Du bist der KI-Kundenservice eines Unternehmens.

Analysiere diese Kundenanfrage und gib eine professionelle Antwort auf Deutsch.

Kundenanfrage:
${message}`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI-Fehler"
      });
    }

    const reply = data.output
      ?.flatMap(item => item.content || [])
      ?.filter(item => item.type === "output_text")
      ?.map(item => item.text)
      ?.join("\n") || "Keine Antwort erhalten.";

    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({
      error: "Serverfehler"
    });
  }
}
