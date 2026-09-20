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
        input: `Du bist eine professionelle KI für einen Kundenservice.

Analysiere diese Kundenanfrage.

Bestimme:
1. Kategorie:
- Preisfrage
- Produktfrage
- Defektes Gerät
- Bestellung
- Lieferung
- Reklamation
- Sonstiges

2. Priorität:
- NIEDRIG
- MITTEL
- HOCH

3. Bestellnummer, falls vorhanden.

4. Schreibe eine professionelle Antwort auf Deutsch.

Kundenanfrage:
${message}`,

        text: {
          format: {
            type: "json_schema",
            name: "customer_service_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                category: {
                  type: "string"
                },
                priority: {
                  type: "string"
                },
                orderNumber: {
                  type: "string"
                },
                reply: {
                  type: "string"
                }
              },
              required: [
                "category",
                "priority",
                "orderNumber",
                "reply"
              ],
              additionalProperties: false
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "OpenAI-Fehler"
      });
    }

    const text = data.output
      ?.flatMap(item => item.content || [])
      ?.filter(item => item.type === "output_text")
      ?.map(item => item.text)
      ?.join("") || "";

    if (!text) {
      return res.status(500).json({
        error: "Keine KI-Antwort erhalten"
      });
    }

    const result = JSON.parse(text);

    return res.status(200).json(result);

  } catch (error) {
    return res.status(500).json({
      error: error.message || "Serverfehler"
    });
  }
}
