// Appointment requests. Sends one plain-text email per request through Resend.
// Needs RESEND_API_KEY and APPOINTMENT_TO (and APPOINTMENT_FROM for a verified
// sender). Without them GET reports enabled:false and the page keeps the
// "call now" panel instead of the form. Nothing is stored.
const TOPICS = {
  plano: "Εξατομικευμένο διατροφικό πλάνο",
  varos: "Διαχείριση βάρους",
  fytiki: "Φυτοφαγική διατροφή",
  kliniki: "Κλινική διατροφή",
  allo: "Κάτι άλλο",
};
const WHEN = { proi: "Πρωί", apogevma: "Απόγευμα", opote: "Οποτεδήποτε" };

const enabled = () => Boolean(process.env.RESEND_API_KEY && process.env.APPOINTMENT_TO);
const clean = (v, max) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ enabled: enabled() });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!enabled()) return res.status(503).json({ error: "not_configured" });

  const b = req.body && typeof req.body === "object" ? req.body : {};
  // Honeypot: bots fill every field. Pretend success, send nothing.
  if (clean(b.website, 200)) return res.status(200).json({ ok: true });

  const name = clean(b.name, 80);
  const phone = clean(b.phone, 20);
  if (!name || !/^[+0-9 ()-]{10,20}$/.test(phone) || (phone.match(/\d/g) || []).length < 10) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (b.consent !== "on") return res.status(400).json({ error: "no_consent" });
  const topic = TOPICS[b.topic] || TOPICS.allo;
  const when = WHEN[b.when] || WHEN.opote;

  const text = [
    "Νέο αίτημα για ραντεβού από την ιστοσελίδα.",
    "",
    `Όνομα: ${name}`,
    `Τηλέφωνο: ${phone}`,
    `Θέμα: ${topic}`,
    `Καλύτερη ώρα για τηλέφωνο: ${when}`,
  ].join("\n");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.APPOINTMENT_FROM || "Ιστοσελίδα <onboarding@resend.dev>",
        to: [process.env.APPOINTMENT_TO],
        subject: `Αίτημα ραντεβού: ${name}`,
        text,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "send_failed" });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ error: "send_failed" });
  }
};
