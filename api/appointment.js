// Appointment requests. Sends one plain-text email per request through Resend.
// Needs RESEND_API_KEY, APPOINTMENT_TO and APPOINTMENT_FROM (a sender on a
// domain verified in Resend). Without them GET reports enabled:false and the
// page keeps the "call now" panel instead of the form. Nothing is stored.
const TOPICS = {
  plano: "Εξατομικευμένο διατροφικό πλάνο",
  varos: "Διαχείριση βάρους",
  fytiki: "Φυτοφαγική διατροφή",
  kliniki: "Κλινική διατροφή",
  allo: "Κάτι άλλο",
};
const WHEN = { proi: "Πρωί", apogevma: "Απόγευμα", opote: "Οποτεδήποτε" };

const enabled = () => Boolean(process.env.RESEND_API_KEY && process.env.APPOINTMENT_TO && process.env.APPOINTMENT_FROM);

// Best-effort throttle per warm instance: 3 requests per IP per 10 minutes.
// Serverless instances do not share memory, so this slows abuse, it does not stop it.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 3;
const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

// Strings only, within the limit, no control characters (no header or line injection).
const field = (v, max) => (typeof v === "string" && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v) ? v.trim() : null);
const pick = (map, key) => (typeof key === "string" && Object.hasOwn(map, key) ? map[key] : null);

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ enabled: enabled() });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!enabled()) return res.status(503).json({ error: "not_configured" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "too_many_requests" });

  const b = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  // Honeypot: bots fill every field. Pretend success, send nothing.
  if (b.website !== undefined && b.website !== "") return res.status(200).json({ ok: true });

  const name = field(b.name, 80);
  const phone = field(b.phone, 20);
  const topic = pick(TOPICS, b.topic);
  const when = pick(WHEN, b.when);
  if (!name || !phone || !topic || !when
    || !/^[+0-9 ()-]{10,20}$/.test(phone) || (phone.match(/\d/g) || []).length < 10) {
    return res.status(400).json({ error: "invalid_input" });
  }
  if (b.consent !== "on") return res.status(400).json({ error: "no_consent" });

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
        from: process.env.APPOINTMENT_FROM,
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
