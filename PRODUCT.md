# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
People in Thessaloniki looking for a dietitian: weight management, vegan or vegetarian
eating, or diet support for a health condition. Most arrive on a phone, often from Google
Maps or a search, and decide within one visit whether to call.

## Product Purpose
Single-page site for Dimitra Karafyllaki, Dietitian-Nutritionist MSc. Success is a phone
call to book a first appointment (231 030 9327). The booking form stays hidden until its
email delivery is configured; the phone is the primary path either way.

## Positioning
A local, personal practice: plans built from the person's own habits and schedule, based
on research rather than fads, with no forbidden foods and no guilt. Rated 5.0 on Google.

## Operating Context
Office at Ι. Πολέμη 13, near the Voulgari metro station. Opening hours Mon-Fri 08:00-14:00
and 17:00-21:00, Sat 09:00-13:00 (kept in `index.html` and `HOURS` in `main.js`).

## Capabilities and Constraints
- Plain HTML/CSS/JS, no build step; one Vercel function (`api/appointment.js`). Push to
  `main` deploys.
- Self-hosted fonts, no cookies, no analytics; the map loads only after a click.
- Content not yet confirmed by Dimitra: service texts, the "Πεδία" list, FAQ answers.
  Small wording fixes are allowed; no new claims, promises, or credentials.

## Evidence on Hand
- Five real Google reviews and the 5.0 rating from her Google Maps listing (October 2026).
- Logo and mark in `assets/`.
- Missing, do not fabricate: her photo (`.about-photo`) and CV (`#gnorimia`).

## Product Principles
1. The phone number is always one tap away.
2. Warm and personal before clinical.
3. Never claim what she has not confirmed.
4. Privacy by default: nothing loads that tracks the visitor.

## Accessibility & Inclusion
WCAG AA contrast and touch targets; visitors of all ages, mostly on mobile.
