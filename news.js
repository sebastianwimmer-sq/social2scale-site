// Wochen-News: Antwort auf die Frage der Woche geht direkt an Sebi (CRM-Eingang, Typ feedback; 19.11.2026).
// Ohne JavaScript steht das Formular nicht zur Verfuegung (kein action-Ziel), die Seite bleibt lesbar.
(function () {
  var form = document.getElementById("nw-form");
  if (!form) return;
  var en = document.documentElement.lang.indexOf("en") === 0;
  var T = en
    ? { leer: "Write a few words first.", mail: "That email address doesn't look right.", senden: "Sending …",
        danke: "Thanks, Sebi has your answer.", dankeMail: "Thanks, Sebi has your answer and can reply to your email.",
        fehler: "That didn't go through. Please try again, or write to info@social2scale.com." }
    : { leer: "Schreib erst ein paar Worte.", mail: "Die E-Mail-Adresse sieht nicht richtig aus.", senden: "Wird geschickt …",
        danke: "Danke, deine Antwort ist bei Sebi.", dankeMail: "Danke, deine Antwort ist bei Sebi. Über deine E-Mail kann er dir antworten.",
        fehler: "Das hat nicht geklappt. Bitte nochmal, oder schreib an info@social2scale.com." };
  var status = document.getElementById("nw-status");
  var knopf = form.querySelector("button[type=submit]");
  var box = form.closest(".nw-du");

  function melde(text, rot) { status.textContent = text; status.classList.toggle("rot", !!rot); }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var text = form.antwort.value.trim();
    var mail = form.email.value.trim();
    if (!text) { melde(T.leer, true); form.antwort.focus(); return; }
    if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { melde(T.mail, true); form.email.focus(); return; }
    knopf.disabled = true;
    melde(T.senden);
    var payload = "# Leserantwort News " + form.getAttribute("data-ausgabe") + (en ? " (englisch)" : "") + "\n\n"
      + "**Frage der Woche:** " + form.getAttribute("data-frage") + "\n\n**Antwort:**\n" + text + "\n\n"
      + "Seite: " + location.pathname;
    fetch("https://closing.social2scale.com/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "feedback", name: "", email: mail, payload: payload, website: form.website.value ? "botcheck" : "" })
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return r.ok && j && j.success; }); })
      .then(function (ok) {
        if (!ok) throw new Error("nicht angekommen");
        box.classList.add("fertig");
        melde(mail ? T.dankeMail : T.danke);
        status.setAttribute("tabindex", "-1");
        try { status.focus({ preventScroll: true }); } catch (e) { /* alt */ }
      })
      .catch(function () { knopf.disabled = false; melde(T.fehler, true); });
  });
})();
