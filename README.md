# dimitra-karafyllaki

Site for Dimitra Karafyllaki, Dietitian-Nutritionist MSc (Thessaloniki).
Plain HTML/CSS/JS, no build step, plus one Vercel function (`api/appointment.js`).
Push to `main` deploys to Vercel.

## Content status

- Contact data, hours and the five reviews come from her Google Maps listing (October 2026).
- Placeholders (marked `TODO` in `index.html`): her photo (`.about-photo`) and CV (`#gnorimia`).
- To confirm with her: the service texts, the "Πεδία" list and the FAQ answers. They are
  written from her reviews and general dietetics practice, not from her.
- Opening hours live in two places: the table in `index.html` and `HOURS` in `main.js`.

## Appointment form

The form stays hidden until the function can deliver email. Set in Vercel → Settings → Environment Variables:

- `RESEND_API_KEY`: API key from resend.com
- `APPOINTMENT_TO`: the office email that receives requests
- `APPOINTMENT_FROM`: a sender on a domain verified in Resend, e.g. `Ιστοσελίδα <rantevou@example.gr>`

Without them `GET /api/appointment` returns `{"enabled":false}` and the page shows the "call now" panel.
The function stores nothing; it sends name, phone, topic and preferred call time.

## Privacy

Fonts are self-hosted (`assets/fonts`). No cookies, no analytics. The Google map loads only after a click.

## Local preview

`python3 -m http.server 8765` (the form stays hidden: `/api` does not run locally; use `vercel dev` for it).
