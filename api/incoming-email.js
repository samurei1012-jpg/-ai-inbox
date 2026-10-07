export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed"
    });
  }

  try {
    const event = req.body;

    console.log("📩 Resend Webhook:", event);

    if (event?.type !== "email.received") {
      return res.status(200).json({
        success: true,
        message: "Event ignoriert"
      });
    }

    const emailId = event?.data?.email_id;
    const from = event?.data?.from || "";
    const subject = event?.data?.subject || "";

    if (!emailId) {
      return res.status(400).json({
        error: "Keine email_id erhalten"
      });
    }

    console.log("📨 E-Mail-ID:", emailId);
    console.log("👤 Absender:", from);
    console.log("📌 Betreff:", subject);

    // Vollständige E-Mail bei Resend abrufen
    const emailResponse = await fetch(
      `https://api.resend.com/emails/receiving/${emailId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`
        }
      }
    );

    const emailData = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend Abruf Fehler:", emailData);

      return res.status(emailResponse.status).json({
        error: "E-Mail konnte bei Resend nicht abgerufen werden",
        details: emailData
      });
    }

    console.log("📄 Vollständige E-Mail erhalten");

    const emailText =
      emailData.text ||
      emailData.html ||
      "";

    const customerMessage = `
Absender: ${from}
Betreff: ${subject}

Kundenanfrage:
${emailText}
`;

    console.log("🤖 Sende E-Mail an die KI...");

    // Bereits funktionierende KI verwenden
    const baseUrl = `https://${req.headers.host}`;

    const aiResponse = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: customerMessage
      })
    });

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("KI Fehler:", aiData);

      return res.status(aiResponse.status).json({
        error: "KI-Analyse fehlgeschlagen",
        details: aiData
      });
    }

    console.log("✅ KI-Analyse erfolgreich:", aiData);

    // Ticket in Supabase speichern
    console.log("💾 Speichere Ticket in Supabase...");

    const supabaseResponse = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/tickets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          message: emailText,
          category: aiData.category,
          priority: aiData.priority,
          orderNumber: aiData.orderNumber,
          reply: aiData.reply,
          user_id: process.env.AI_INBOX_USER_ID,
          name: from,
          email: from,
          subject: subject,
          status: "open"
        })
      }
    );

    const ticketData = await supabaseResponse.json();

    if (!supabaseResponse.ok) {
      console.error("Supabase Fehler:", ticketData);

      return res.status(supabaseResponse.status).json({
        error: "Ticket konnte nicht gespeichert werden",
        details: ticketData
      });
    }

    console.log("✅ Ticket erfolgreich in Supabase gespeichert:", ticketData);

    return res.status(200).json({
      success: true,
      message: "E-Mail verarbeitet und Ticket erstellt",
      email: {
        id: emailId,
        from,
        subject
      },
      analysis: aiData,
      ticket: ticketData
    });

  } catch (error) {
    console.error("Incoming Email Fehler:", error);

    return res.status(500).json({
      error: error.message || "Serverfehler"
    });
  }
}
