export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Nur POST erlaubt"
    });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({
        error: "Keine Nachricht angegeben"
      });
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",

          input: `
Du bist eine professionelle KI für einen Kundenservice.

Analysiere die folgende Kundenanfrage.

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

Bewerte die Priorität nach diesen festen Kriterien:
- HOCH: akute Gefahr, Sicherheitsproblem, erheblicher Schaden oder ein dringender Ausfall mit großen Auswirkungen.
- MITTEL: konkreter Defekt, Reklamation, fehlende Lieferung oder ein Problem, das bearbeitet werden muss, aber nicht akut ist.
- NIEDRIG: allgemeine Fragen, Preisfragen und einfache Informationsanfragen ohne Dringlichkeit.
- Ein Defekt allein bedeutet nicht automatisch HOCH.
- Verwende ausschließlich die drei Werte NIEDRIG, MITTEL oder HOCH.
- Bewerte bei jeder Analyse dieselbe Kundenanfrage nach denselben Kriterien. Ändere die Priorität nur, wenn der Inhalt der Anfrage dies sachlich rechtfertigt.

3. Bestellnummer, falls vorhanden.

4. Schreibe eine professionelle und freundliche Antwort auf Deutsch.
Beachte bei jeder Antwort unbedingt diese Regeln:
- Erfinde niemals Handlungen, Aussagen oder Informationen, die nicht aus der Kundenanfrage hervorgehen.
- Behaupte niemals, dass unser Unternehmen ein Gerät ausgeschaltet, geprüft, repariert oder bearbeitet hat, wenn das nicht ausdrücklich bekannt ist.
- Verwende eine vorhandene Bestellnummer in der Antwort, wenn sie für den Fall relevant ist.
- Fordere den Kunden nicht erneut auf, eine bereits angegebene Bestellnummer mitzuteilen.
- Beschreibe bei Sicherheitsrisiken vorsichtige, sachliche nächste Schritte, ohne eine bereits erfolgte Bearbeitung zu behaupten.
- Schreibe klar, freundlich und konkret. Vermeide unnötige Wiederholungen und allgemeine Floskeln.
Kundenanfrage:
${message}
`,

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
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "OpenAI-Fehler"
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
