/** Standalone scheduled cleanup for a portal hosted on Cloudflare Pages.
 * Paste this complete module into a separate Worker; bind the portal D1 as DB.
 * Cron: 17 3 * * * (03:17 UTC daily). No imports or additional bindings needed.
 */
const DAY = 86_400_000;

export default {
  async fetch() {
    // HTTP requests, including paths called "cleanup" or "scheduled", do no work.
    return new Response('Not found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  },
  async scheduled(controller, env) {
    if (!env?.DB) throw new Error('Portal cleanup requires the DB D1 binding.');
    const now = Date.now();
    const statements = [
      env.DB.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(now),
      env.DB.prepare('DELETE FROM auth_tokens WHERE expires_at<=?').bind(now),
      env.DB.prepare('DELETE FROM rate_limits WHERE reset_at<?').bind(now - DAY),
    ];
    // Older installations do not have the activity table yet.
    const activityTable = await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='customer_activity'").first();
    if (activityTable) statements.push(env.DB.prepare('DELETE FROM customer_activity WHERE created_at<?').bind(now - 90 * DAY));
    await env.DB.batch(statements);
  },
};
