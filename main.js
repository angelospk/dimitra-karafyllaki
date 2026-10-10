// Opening hours in Athens time. Day index: 0 = Sunday.
const HOURS = {
  0: [],
  1: [[8, 14], [17, 21]],
  2: [[8, 14], [17, 21]],
  3: [[8, 14], [17, 21]],
  4: [[8, 14], [17, 21]],
  5: [[8, 14], [17, 21]],
  6: [[9, 13]],
};
const DAY_NAMES = ["την Κυριακή", "τη Δευτέρα", "την Τρίτη", "την Τετάρτη", "την Πέμπτη", "την Παρασκευή", "το Σάββατο"];
const pad = (h) => String(h).padStart(2, "0") + ":00";

function athensNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

function openStatus({ day, hour }) {
  const open = HOURS[day].find(([from, to]) => hour >= from && hour < to);
  if (open) return { open: true, text: `Ανοιχτά τώρα, ως τις ${pad(open[1])}` };

  const later = HOURS[day].find(([from]) => hour < from);
  if (later) return { open: false, text: `Κλειστά τώρα. Ανοίγει σήμερα στις ${pad(later[0])}` };

  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (HOURS[d].length) {
      const when = i === 1 ? "αύριο" : DAY_NAMES[d];
      return { open: false, text: `Κλειστά τώρα. Ανοίγει ${when} στις ${pad(HOURS[d][0][0])}` };
    }
  }
}

function renderStatus() {
  const now = athensNow();
  const status = openStatus(now);
  document.querySelectorAll("[data-open-status]").forEach((el) => {
    el.textContent = status.text;
    el.classList.toggle("is-open", status.open);
  });
  document.querySelectorAll(".hours tr").forEach((tr) => {
    tr.classList.toggle("is-today", Number(tr.dataset.day) === now.day);
  });
}
renderStatus();
setInterval(renderStatus, 60_000);

// Goal chooser: WAI-ARIA tabs with arrow-key navigation.
const tabs = [...document.querySelectorAll('.chooser [role="tab"]')];
function selectTab(tab, focus) {
  tabs.forEach((t) => {
    const selected = t === tab;
    t.setAttribute("aria-selected", String(selected));
    t.tabIndex = selected ? 0 : -1;
    document.getElementById(t.getAttribute("aria-controls")).hidden = !selected;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener("click", () => selectTab(tab, false));
  tab.addEventListener("keydown", (e) => {
    const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (move) {
      e.preventDefault();
      selectTab(tabs[(i + move + tabs.length) % tabs.length], true);
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      selectTab(e.key === "Home" ? tabs[0] : tabs[tabs.length - 1], true);
    }
  });
});

// Reviews carousel.
const reviews = [...document.querySelectorAll("[data-review]")];
const count = document.querySelector("[data-count]");
let current = 0;
function showReview(next) {
  current = (next + reviews.length) % reviews.length;
  reviews.forEach((r, i) => (r.hidden = i !== current));
  count.textContent = `${current + 1} από ${reviews.length}`;
}
document.querySelector("[data-prev]").addEventListener("click", () => showReview(current - 1));
document.querySelector("[data-next]").addEventListener("click", () => showReview(current + 1));

document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
