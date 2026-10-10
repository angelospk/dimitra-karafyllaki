// Content lives in the HTML; this file only adds behaviour.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- Opening hours in Athens time. Day index: 0 = Sunday. ----
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
  $$("[data-open-status]").forEach((el) => {
    if (el.textContent !== status.text) el.textContent = status.text;
    el.classList.toggle("is-open", status.open);
  });
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", Number(tr.dataset.day) === now.day));
}
renderStatus();
setInterval(renderStatus, 60_000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) renderStatus(); });

// ---- Header: shadow once scrolled, hides on the way down ----
const hdr = $("[data-hdr]");
let lastY = scrollY;
addEventListener("scroll", () => {
  const y = scrollY;
  hdr.classList.toggle("scrolled", y > 8);
  if (!document.body.classList.contains("menu-open")) {
    if (y > 400 && y > lastY + 6 && !hdr.matches(":focus-within")) hdr.classList.add("hide");
    else if (y < lastY - 6) hdr.classList.remove("hide");
  }
  lastY = y;
}, { passive: true });
// Never hide the header while keyboard focus is inside it.
hdr.addEventListener("focusin", () => hdr.classList.remove("hide"));

// ---- Active section in the nav ----
const navLinks = $$(".nav a");
const sectionObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  navLinks.forEach((a) => a.setAttribute("aria-current", String(a.getAttribute("href") === `#${e.target.id}`)));
}), { rootMargin: "-45% 0px -50% 0px" });
navLinks.forEach((a) => { const s = $(a.getAttribute("href")); if (s) sectionObserver.observe(s); });

// ---- Mobile menu ----
const burger = $("[data-burger]");
const mnav = $("[data-mnav]");
function setMenu(open) {
  burger.setAttribute("aria-expanded", String(open));
  mnav.hidden = !open;
  document.body.classList.toggle("menu-open", open);
  // Keep keyboard focus inside the overlay: everything behind it is inert.
  $$("main, footer, .skip").forEach((el) => (el.inert = open));
  if (open) hdr.classList.remove("hide");
}
burger.addEventListener("click", () => setMenu(mnav.hidden));
addEventListener("keydown", (e) => { if (e.key === "Escape" && !mnav.hidden) { setMenu(false); burger.focus(); } });
$$("a", mnav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
matchMedia("(min-width: 1000px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

// ---- Reveal on scroll ----
const revealObserver = new IntersectionObserver((entries) => entries.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in");
  revealObserver.unobserve(e.target);
}), { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
$$("[data-reveal]").forEach((el) => revealObserver.observe(el));

// ---- Hero shapes drift at different depths while scrolling ----
const art = $("[data-parallax]");
if (art && !reduced) {
  $$("[data-depth]", art).forEach((el) => el.style.setProperty("--d", el.dataset.depth));
  let ticking = false;
  addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      if (scrollY < innerHeight * 1.2) art.style.setProperty("--sy", scrollY.toFixed(1));
      ticking = false;
    });
  }, { passive: true });
}

// ---- Tabs helper (WAI-ARIA, arrow keys + Home/End) ----
function makeTabs(tabs, onSelect) {
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    onSelect?.(tab);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab, false));
    tab.addEventListener("keydown", (e) => {
      const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (move) { e.preventDefault(); select(tabs[(i + move + tabs.length) % tabs.length], true); }
      else if (e.key === "Home") { e.preventDefault(); select(tabs[0], true); }
      else if (e.key === "End") { e.preventDefault(); select(tabs[tabs.length - 1], true); }
    });
  });
}
makeTabs($$("[data-rev-tabs] [role=tab]"));

// ---- Services: disclosure rows ----
$$("[data-svc]").forEach((btn) => btn.addEventListener("click", () => {
  const open = btn.getAttribute("aria-expanded") !== "true";
  btn.setAttribute("aria-expanded", String(open));
  document.getElementById(btn.getAttribute("aria-controls")).hidden = !open;
}));

// ---- "Book for this" links preselect the topic in the booking form ----
const topicSelect = $("#b-topic");
function pickTopic(value) {
  if (topicSelect && [...topicSelect.options].some((o) => o.value === value)) topicSelect.value = value;
}
$$("[data-pick]").forEach((a) => a.addEventListener("click", () => pickTopic(a.dataset.pick)));

// ---- Fields wall ----
const fieldsDesc = $("[data-fields-desc]");
$$("[data-fields] .f").forEach((b, _, all) => b.addEventListener("click", () => {
  all.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
  fieldsDesc.textContent = b.dataset.desc;
}));

// ---- Quiz ----
const QUIZ = {
  goal: {
    varos: ["Διαχείριση βάρους", "Ο στόχος δεν είναι να χάσεις κιλά γρήγορα, αλλά να βρεις έναν τρόπο να τρως που κρατάει. Χωρίς στερήσεις, με γεύματα που σε χορταίνουν."],
    fytiki: ["Φυτοφαγική διατροφή", "Μια vegan ή χορτοφαγική διατροφή καλύπτει όλες σου τις ανάγκες, αν είναι σωστά σχεδιασμένη. Τα σημεία που θέλουν προσοχή είναι λίγα και συγκεκριμένα."],
    plano: ["Εξατομικευμένο διατροφικό πλάνο", "Η σταθερή ενέργεια έρχεται συχνά από τα απλά: τακτικά γεύματα, αρκετή πρωτεΐνη και φυτικές ίνες. Το πλάνο τα προσαρμόζει στη δική σου μέρα."],
    kliniki: ["Κλινική διατροφή", "Η διατροφή μπορεί να βοηθήσει σε πολλά θέματα υγείας, μαζί με τη θεραπεία του γιατρού σου. Φέρε τις εξετάσεις σου στην πρώτη συνάντηση."],
  },
  day: {
    rush: "Κράτα πάντα κάτι έτοιμο με πρωτεΐνη, π.χ. γιαούρτι ή ξηρούς καρπούς, για να μη φτάνεις στο βράδυ με πολλή πείνα.",
    home: "Μαγείρεψε διπλή μερίδα όσπρια ή λαχανικά και κράτα τη μισή για την επόμενη μέρα.",
    out: "Όταν παραγγέλνεις, πρόσθεσε μια σαλάτα ή λαχανικά στο πιάτο. Μικρή αλλαγή, μεγάλη διαφορά.",
  },
  hard: {
    snack: "Τα τσιμπολογήματα συχνά σημαίνουν ότι τα κύρια γεύματα δεν σε χορταίνουν. Αυτό λύνεται με το πλάνο, όχι με θέληση.",
    organize: "Ένα απλό πλάνο για την εβδομάδα και μια λίστα για τα ψώνια λύνουν τα περισσότερα.",
    motivation: "Οι μικροί, μετρήσιμοι στόχοι κρατάνε περισσότερο από τους μεγάλους.",
    start: "Είναι το πιο συνηθισμένο σημείο εκκίνησης. Η πρώτη συνάντηση είναι ακριβώς γι' αυτό.",
  },
};
const quiz = $("[data-quiz]");
if (quiz) {
  const form = $("[data-quiz-form]", quiz);
  const steps = $$("[data-q]", quiz);
  const bar = $("[data-quiz-bar]", quiz);
  const back = $("[data-quiz-back]", quiz);
  const next = $("[data-quiz-next]", quiz);
  const result = $("[data-quiz-result]", quiz);
  let step = 0;
  const show = (i, focus = true) => {
    step = i;
    steps.forEach((s, j) => (s.hidden = j !== i));
    back.hidden = i === 0;
    next.disabled = !$("input:checked", steps[i]);
    next.textContent = i === steps.length - 1 ? "Δες το αποτέλεσμα" : "Επόμενο";
    bar.style.width = `${(i / steps.length) * 100}%`;
    if (focus) $("input", steps[i])?.focus({ preventScroll: true });
  };
  const finish = () => {
    const data = new FormData(form);
    const [title, text] = QUIZ.goal[data.get("goal")];
    $("[data-r-title]", result).textContent = title;
    $("[data-r-text]", result).textContent = text;
    $("[data-r-day]", result).textContent = QUIZ.day[data.get("day")];
    $("[data-r-hard]", result).textContent = QUIZ.hard[data.get("hard")];
    $("[data-r-book]", result).dataset.pick = data.get("goal");
    bar.style.width = "100%";
    form.hidden = true;
    result.hidden = false;
    result.focus();
  };
  // Advance only from the current step, once. A pointer pick advances after a
  // short pause; keyboard users move with "Επόμενο" or Enter, so arrow keys
  // can browse the options without jumping ahead.
  let timer = 0;
  let pointerPick = false;
  const answered = (i) => Boolean($("input:checked", steps[i]));
  const advance = (from) => {
    clearTimeout(timer);
    if (from !== step || !answered(from)) return;
    from < steps.length - 1 ? show(from + 1) : finish();
  };
  const syncNext = () => (next.disabled = !answered(step));
  form.addEventListener("pointerdown", () => (pointerPick = true));
  form.addEventListener("change", (e) => {
    if (e.target.type !== "radio") return;
    syncNext();
    if (!pointerPick) return;
    pointerPick = false;
    const from = step;
    clearTimeout(timer);
    timer = setTimeout(() => advance(from), reduced ? 0 : 280);
  });
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.type === "radio") { e.preventDefault(); advance(step); }
  });
  next.addEventListener("click", () => advance(step));
  back.addEventListener("click", () => { clearTimeout(timer); show(Math.max(0, step - 1)); });
  $("[data-r-book]", result).addEventListener("click", (e) => pickTopic(e.currentTarget.dataset.pick));
  $("[data-quiz-restart]", result).addEventListener("click", () => {
    clearTimeout(timer);
    form.reset();
    result.hidden = true;
    form.hidden = false;
    show(0);
  });
  show(0, false);
}

// ---- Balanced plate ----
const PLATE = {
  veg: ["Λαχανικά, το μισό πιάτο", "Ωμά ή μαγειρεμένα, όσο πιο πολλά χρώματα τόσο καλύτερα. Δίνουν φυτικές ίνες, βιταμίνες και όγκο που χορταίνει."],
  protein: ["Πρωτεΐνη, ένα τέταρτο", "Όσπρια, ψάρι, αυγά, κοτόπουλο, γιαούρτι ή τόφου. Η πρωτεΐνη σε κάθε γεύμα βοηθά να μην πεινάς ξανά γρήγορα."],
  grain: ["Δημητριακά ολικής άλεσης, ένα τέταρτο", "Ψωμί ολικής, ρύζι, πλιγούρι, ζυμαρικά ή πατάτα. Δίνουν ενέργεια. Δεν χρειάζεται να τα κόψεις, μόνο να βρεις την ποσότητα που σου ταιριάζει."],
  fat: ["Καλά λιπαρά, λίγα αλλά καθημερινά", "Ελαιόλαδο, ελιές, ξηροί καρποί, σπόροι. Μια κουταλιά ελαιόλαδο στη σαλάτα κάνει και τα λαχανικά πιο νόστιμα."],
};
const plateInfo = $("[data-plate-info]");
const segs = $$(".seg");
const pickSeg = (seg) => {
  segs.forEach((s) => s.setAttribute("aria-pressed", String(s === seg)));
  const [name, text] = PLATE[seg.dataset.seg];
  plateInfo.innerHTML = "";
  const h = document.createElement("p"); h.className = "pi-name"; h.textContent = name;
  const p = document.createElement("p"); p.textContent = text;
  plateInfo.append(h, p);
};
segs.forEach((s) => {
  s.addEventListener("click", () => pickSeg(s));
  s.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickSeg(s); } });
});

// ---- Myth or truth ----
const MYTHS = [
  ["Οι υδατάνθρακες το βράδυ παχαίνουν.", "myth", "Το βάρος εξαρτάται από το σύνολο της ημέρας, όχι από την ώρα. Ένα βραδινό πιάτο με ζυμαρικά χωράει κανονικά σε ένα ισορροπημένο πρόγραμμα."],
  ["Τα detox ροφήματα καθαρίζουν τον οργανισμό.", "myth", "Το συκώτι και τα νεφρά κάνουν αυτή τη δουλειά συνεχώς. Δεν υπάρχουν επιστημονικά δεδομένα ότι ένα ρόφημα τη βελτιώνει."],
  ["Σε μια vegan διατροφή χρειάζεται συμπλήρωμα B12.", "truth", "Η B12 δεν υπάρχει σε αξιόπιστη ποσότητα στις φυτικές τροφές. Χρειάζεται συμπλήρωμα ή εμπλουτισμένα τρόφιμα."],
  ["Τα φρούτα έχουν πολλή ζάχαρη, άρα πρέπει να τα κόψεις.", "myth", "Τα ολόκληρα φρούτα δίνουν φυτικές ίνες, βιταμίνες και νερό. Οι περισσότεροι άνθρωποι χρειάζεται να τρώνε περισσότερα, όχι λιγότερα."],
  ["Τα όσπρια είναι καλή πηγή πρωτεΐνης.", "truth", "Φακές, ρεβίθια και φασόλια δίνουν πρωτεΐνη και φυτικές ίνες, και είναι βασικό κομμάτι της μεσογειακής διατροφής."],
  ["Όσο λιγότερο τρως, τόσο καλύτερα χάνεις βάρος.", "myth", "Ο πολύ αυστηρός περιορισμός φέρνει συχνά κούραση, απώλεια μυϊκής μάζας και επαναφορά του βάρους. Ο ρυθμός που αντέχεται κρατάει."],
];
const myths = $("[data-myths]");
if (myths) {
  const claim = $("[data-myth-claim]", myths);
  const count = $("[data-myth-count]", myths);
  const actions = $("[data-myth-actions]", myths);
  const answer = $("[data-myth-answer]", myths);
  const verdict = $("[data-myth-verdict]", myths);
  const why = $("[data-myth-why]", myths);
  const next = $("[data-myth-next]", myths);
  const score = $("[data-myth-score]", myths);
  let i = 0, right = 0, done = 0;
  const render = () => {
    const [text] = MYTHS[i];
    claim.textContent = text;
    count.textContent = `${i + 1} / ${MYTHS.length}`;
    actions.hidden = false;
    answer.hidden = true;
  };
  $$("[data-guess]", myths).forEach((b) => b.addEventListener("click", () => {
    const [, truth, text] = MYTHS[i];
    const ok = b.dataset.guess === truth;
    done++; if (ok) right++;
    verdict.innerHTML = "";
    const tag = document.createElement("span"); tag.className = "tag"; tag.textContent = truth === "myth" ? "Μύθος" : "Αλήθεια";
    verdict.append(tag, ok ? "Σωστά." : "Όχι ακριβώς.");
    why.textContent = text;
    next.textContent = i === MYTHS.length - 1 ? "Ξανά από την αρχή" : "Επόμενη φράση";
    score.textContent = `Σωστές απαντήσεις: ${right} από ${done}`;
    actions.hidden = true;
    answer.hidden = false;
    answer.focus();
  }));
  next.addEventListener("click", () => {
    if (i === MYTHS.length - 1) { i = 0; right = 0; done = 0; score.textContent = ""; }
    else i++;
    render();
    claim.focus();
  });
  render();
}

// ---- FAQ: one answer open at a time ----
const faqs = $$(".faq details");
faqs.forEach((d) => d.addEventListener("toggle", () => {
  if (d.open) faqs.forEach((o) => { if (o !== d) o.open = false; });
}));

// ---- Booking request ----
// The form shows only when the server can deliver it (see api/appointment.js);
// otherwise the "call now" panel stays, so no button leads nowhere.
const book = $("[data-book]");
const bookOff = $("[data-book-off]");
if (book) {
  fetch("/api/appointment", { headers: { Accept: "application/json" } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.enabled) return;
      book.hidden = false;
      bookOff.hidden = true;
      $$("[data-book-only]").forEach((el) => (el.hidden = false));
    })
    .catch(() => {});

  const msg = $("[data-book-msg]", book);
  const submit = $("button[type=submit]", book);
  book.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "book-msg";
    msg.textContent = "";
    let firstBad = null;
    // Same rule as the server: allowed characters, at least 10 digits.
    const okPhone = (v) => /^[+0-9 ()-]{10,20}$/.test(v) && (v.match(/\d/g) || []).length >= 10;
    ["name", "phone"].forEach((n) => {
      const el = book.elements[n];
      const v = el.value.trim();
      const bad = !v || (n === "phone" && !okPhone(v));
      el.setAttribute("aria-invalid", String(bad));
      if (bad && !firstBad) firstBad = el;
    });
    if (firstBad) {
      msg.classList.add("err");
      msg.textContent = "Συμπλήρωσε όνομα και ένα τηλέφωνο με τουλάχιστον 10 ψηφία.";
      firstBad.focus();
      return;
    }
    if (!book.elements.consent.checked) {
      msg.classList.add("err");
      msg.textContent = "Χρειάζεται η συγκατάθεσή σου για να σε καλέσουμε.";
      book.elements.consent.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = "Αποστολή…";
    try {
      const body = Object.fromEntries(new FormData(book));
      const res = await fetch("/api/appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(String(res.status));
      book.reset();
      msg.classList.add("ok");
      msg.textContent = "Το αίτημα στάλθηκε. Θα σε καλέσουμε σύντομα, μέσα στις ώρες λειτουργίας.";
    } catch {
      msg.classList.add("err");
      msg.textContent = "Το αίτημα δεν στάλθηκε. Δοκίμασε ξανά ή κάλεσε στο 231 030 9327.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Στείλε αίτημα";
    }
  });
}

// ---- Map loads from Google only on request ----
const mapLoad = $("[data-map-load]");
mapLoad?.addEventListener("click", () => {
  const map = $("[data-map]");
  const iframe = document.createElement("iframe");
  iframe.title = "Χάρτης: Ι. Πολέμη 13, Θεσσαλονίκη";
  iframe.referrerPolicy = "no-referrer-when-downgrade";
  iframe.src = "https://www.google.com/maps?q=" + encodeURIComponent("Καραφυλλάκη Δήμητρα Διαιτολόγος, Ι. Πολέμη 13, Θεσσαλονίκη") + "&z=16&hl=el&output=embed";
  map.replaceChildren(iframe);
  iframe.focus();
});

$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
