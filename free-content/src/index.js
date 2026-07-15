/**
 * s2s Free-Content-Funnel — Router.
 * Kennt keine Interna: delegiert an validate/protect/leads/mail.
 */

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return json({ ok: true });

    return json({ ok: false, error: 'not_found' }, 404);
  },
};
