export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const email = req.body;

    console.log("📩 Eingehende E-Mail:", email);

    return res.status(200).json({
      success: true,
      message: "E-Mail erfolgreich empfangen"
    });
  } catch (error) {
    console.error("Incoming Email Fehler:", error);

    return res.status(500).json({
      error: error.message || "Serverfehler"
    });
  }
}
