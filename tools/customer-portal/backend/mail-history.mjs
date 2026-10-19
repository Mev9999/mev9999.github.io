// Optional delivery audit. Never make a successful send fail because logging failed.
export async function mailHistoryReady(env) {
  return Boolean(await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='mail_history'").first());
}
export function mailHistorySnapshot(message) {
  const redact = value => String(value || '').replace(/([?&#](?:amp;)?token=)[^\s"'<>;&]+/gi, '$1[geschützt]');
  return {subject:String(message.subject || ''), html:redact(message.html), text:redact(message.text), to:String(message.to || '')};
}
export async function recordMailHistory(env, message, providerId, status) {
  try {
    if (!await mailHistoryReady(env)) return;
    const snapshot = mailHistorySnapshot(message);
    const key = message.idempotencyKey || crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO mail_history(id,recipient,message_json,provider_id,status,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider_id=COALESCE(excluded.provider_id,mail_history.provider_id),status=CASE WHEN mail_history.status='sent' THEN 'sent' ELSE excluded.status END`).bind(key,snapshot.to.toLowerCase(),JSON.stringify(snapshot),providerId || null,status,Date.now()).run();
  } catch { /* Sending and its durable retry queue take precedence over the audit. */ }
}
export async function readMailHistory(env, recipient) {
  if (!await mailHistoryReady(env)) return {ready:false,messages:[]};
  const rows = await env.DB.prepare('SELECT * FROM mail_history WHERE recipient=? ORDER BY created_at DESC LIMIT 100').bind(recipient.toLowerCase()).all();
  return {ready:true,messages:(rows.results || []).map(row=>({id:row.id,...JSON.parse(row.message_json),status:row.status,createdAt:row.created_at,canCheck:Boolean(row.provider_id)}))};
}
export async function checkMailHistory(env, recipient, historyId) {
  if (!await mailHistoryReady(env)) return {status:'unavailable'};
  const row=await env.DB.prepare('SELECT provider_id FROM mail_history WHERE id=? AND recipient=?').bind(historyId,recipient.toLowerCase()).first();
  if (!row?.provider_id || !env.EMAIL_API_KEY) return {status:'unavailable'};
  try {
    const response=await fetch('https://api.resend.com/emails/'+encodeURIComponent(row.provider_id),{headers:{Authorization:'Bearer '+env.EMAIL_API_KEY},signal:AbortSignal.timeout(10000)});
    if (!response.ok) return {status:'unavailable'};
    const value=await response.json();
    return {status:['sent','delivered','delivery_delayed','bounced','complained','failed','opened','clicked'].includes(value.last_event)?value.last_event:'unavailable',checkedAt:Date.now()};
  } catch { return {status:'unavailable'}; }
}
