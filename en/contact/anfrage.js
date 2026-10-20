/* Englisches Anfrageformular (/en/contact/, 20.10.2026, Ticket #353).
   Schickt an denselben Endpunkt wie Weg B im Funnel, mit sprache='en'. Der Worker
   prueft Turnstile, legt die Anfrage im CRM an (Sprache: Englisch), mailt Phil ([EN])
   und schickt die englische Bestaetigung. „Thanks“ erst nach Server-OK. */
(function () {
  'use strict';
  var form = document.getElementById('en-anfrage');
  if (!form) return;
  var ENDPUNKT = form.getAttribute('data-endpunkt');
  var BUCHUNG = 'https://calendly.com/philipplibowicz/neues-meeting';
  var meldung = document.getElementById('en-meldung');
  var knopf = document.getElementById('en-senden');

  var FEHLER = {
    name: 'Please enter your name.',
    email: 'Please check your email address.',
    email_domain: 'That email address doesn’t seem to exist — please check it.',
    phone: 'Please enter a phone number so Phil can call you back.',
    captcha: 'The security check didn’t pass — wait a moment and try again.',
    rate_limited: 'Please wait a moment and try again.',
  };

  function zeige(text) { meldung.textContent = text; meldung.hidden = false; meldung.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  function wert(id) { return (document.getElementById(id).value || '').trim(); }
  function wahl(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  function token() { try { return (window.turnstile && window.turnstile.getResponse()) || ''; } catch (e) { return ''; } }
  function zuruecksetzen() { try { if (window.turnstile) window.turnstile.reset(); } catch (e) { /* noop */ } }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    meldung.hidden = true;
    var name = wert('f-name'), email = wert('f-email'), phone = wert('f-phone');
    if (!name) return zeige(FEHLER.name);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) return zeige(FEHLER.email);
    if (phone.replace(/[^0-9]/g, '').length < 6) return zeige(FEHLER.phone);
    if (!document.getElementById('f-consent').checked) return zeige('Please confirm the privacy policy.');
    var tok = token();
    if (!tok) return zeige('The security check is still running. Please try again in a few seconds.');

    var payload = {
      name: name, email: email, phone: phone,
      business: wert('f-business'), goal: wert('f-goal'),
      budget: wahl('budget'), start: wahl('start'),
      website: wert('f-website'),
      sprache: 'en', turnstile: tok,
    };
    var vorher = knopf.textContent;
    knopf.disabled = true;
    knopf.textContent = 'Sending …';
    try {
      var res = await fetch(ENDPUNKT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      var data = null;
      try { data = await res.json(); } catch (err) { console.error('Antwort nicht lesbar:', err); }
      if (res.ok && data && data.ok) {
        document.getElementById('en-vorname').textContent = name.split(/\s+/)[0] || 'there';
        document.getElementById('en-termin').href = BUCHUNG + '?name=' + encodeURIComponent(name) + '&email=' + encodeURIComponent(email)
          + '&utm_source=social2scale&utm_medium=website&utm_campaign=en-contact';
        form.hidden = true;
        var danke = document.getElementById('en-danke');
        danke.hidden = false;
        danke.focus();
        danke.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
      zeige(FEHLER[data && data.error] || 'That didn’t go through — please wait a moment and send it again, or email info@social2scale.com.');
      zuruecksetzen();
    } catch (err) {
      console.error('Anfrage fehlgeschlagen:', err);
      zeige('No connection — please wait a moment and send it again, or email info@social2scale.com.');
      zuruecksetzen();
    } finally {
      knopf.disabled = false;
      knopf.textContent = vorher;
    }
  });
})();
