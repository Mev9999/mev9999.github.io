/** Fixed, opt-in retention for newly created nursery/kindergarten/school galleries. */
const RETENTION_DAY = 86_400_000;
export const SCHOOL_RETENTION_POLICY = 'school-v1';
export function schoolRetentionJson(gallery) {
  if (gallery.retention_policy !== SCHOOL_RETENTION_POLICY) return null;
  const start = gallery.retention_started_at;
  return { enabled: true, policy: SCHOOL_RETENTION_POLICY, galleryDays: 90, unboughtGraceDays: 30, purchasedMonths: 6,
    startedAt: start == null ? null : new Date(start).toISOString(),
    closesAt: start == null ? null : new Date(start + 90 * RETENTION_DAY).toISOString(),
    unboughtDeleteAt: start == null ? null : new Date(start + 120 * RETENTION_DAY).toISOString() };
}
export function sixCalendarMonthsAfter(timestamp) {
  const date = new Date(timestamp), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + 6);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
}
function retentionStatement(env, sql, ...values) { return env.DB.prepare(sql).bind(...values); }
async function retentionRows(env, sql, ...values) { return (await retentionStatement(env, sql, ...values).all()).results || []; }
export async function schoolRetentionSchemaReady(env) {
  if (!env?.DB) return false;
  const [galleries, images, orders, manual, uploads] = await Promise.all([
    retentionRows(env, 'PRAGMA table_info(galleries)'), retentionRows(env, 'PRAGMA table_info(images)'),
    retentionRows(env, 'PRAGMA table_info(orders)'),
    retentionStatement(env, "SELECT name FROM sqlite_master WHERE type='table' AND name='manual_delivery_retention'").first(),
    retentionStatement(env, "SELECT name FROM sqlite_master WHERE type='table' AND name='school_retention_uploads'").first(),
  ]);
  return ['retention_policy','retention_started_at'].every(n => galleries.some(c => c.name === n))
    && ['retention_purge_started_at','retention_purged_at','retention_checked_at'].every(n => images.some(c => c.name === n))
    && ['delivery_ready_at','delivery_delete_at'].every(n => orders.some(c => c.name === n)) && Boolean(manual) && Boolean(uploads);
}
/** Always called inside the same batch as creation/publication; reopening never resets the clock. */
export function startSchoolRetentionStatement(env, galleryId, now) {
  return retentionStatement(env, `UPDATE galleries SET
    retention_started_at=CASE WHEN published=1 THEN COALESCE(retention_started_at,?) ELSE retention_started_at END,
    expires_at=CASE WHEN retention_started_at IS NOT NULL THEN retention_started_at+? WHEN published=1 THEN ? ELSE NULL END,
    published=CASE WHEN retention_started_at IS NOT NULL AND retention_started_at+?<=? THEN 0 ELSE published END
    WHERE id=? AND retention_policy=?`, now, 90 * RETENTION_DAY, now + 90 * RETENTION_DAY, 90 * RETENTION_DAY, now, galleryId, SCHOOL_RETENTION_POLICY);
}
/** Start once, when a paid/final set is ready. Email retries and later replacements cannot extend it. */
export async function recordSchoolDeliveryRetention(env, galleryId = null, now = Date.now()) {
  if (!await schoolRetentionSchemaReady(env)) return;
  const ends = sixCalendarMonthsAfter(now);
  const galleryFilter = galleryId ? ' AND g.id=?' : '';
  await env.DB.batch([
    retentionStatement(env, `UPDATE orders SET delivery_ready_at=?,delivery_delete_at=? WHERE delivery_ready_at IS NULL AND status='paid' AND receipt_sent_at IS NOT NULL AND deleted_at IS NULL
      AND EXISTS(SELECT 1 FROM galleries g WHERE g.id=orders.gallery_id AND g.retention_policy=? AND g.retention_started_at IS NOT NULL AND g.deleted_at IS NULL AND g.published=1 AND g.expires_at>?${galleryFilter}
        AND EXISTS(SELECT 1 FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=g.id AND m.user_id=orders.user_id AND u.disabled=0)
        AND NOT EXISTS(SELECT 1 FROM order_images oi JOIN images i ON i.id=oi.image_id WHERE oi.order_id=orders.id AND ((g.require_final_delivery=1 AND i.final_ready<>1) OR i.retention_purge_started_at IS NOT NULL OR EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.image_id=i.id AND b.user_id=orders.user_id))))
      AND EXISTS(SELECT 1 FROM order_images WHERE order_id=orders.id)`, now, ends, SCHOOL_RETENTION_POLICY, now, ...(galleryId ? [galleryId] : [])),
    retentionStatement(env, `INSERT OR IGNORE INTO manual_delivery_retention(user_id,image_id,ready_at,delete_at)
      SELECT r.user_id,r.image_id,?,? FROM manual_releases r JOIN images i ON i.id=r.image_id JOIN galleries g ON g.id=i.gallery_id
      WHERE g.retention_policy=? AND g.retention_started_at IS NOT NULL AND g.deleted_at IS NULL AND g.published=1 AND g.expires_at>?${galleryFilter}
        AND EXISTS(SELECT 1 FROM gallery_members m JOIN users u ON u.id=m.user_id WHERE m.gallery_id=g.id AND m.user_id=r.user_id AND u.disabled=0)
        AND NOT EXISTS(SELECT 1 FROM image_download_blocks b WHERE b.image_id=i.id AND b.user_id=r.user_id)
        AND (g.require_final_delivery=0 OR i.final_ready=1) AND i.retention_purge_started_at IS NULL`, now, ends, SCHOOL_RETENTION_POLICY, now, ...(galleryId ? [galleryId] : [])),
  ]);
}
function retentionDueCondition() {
  // Start as soon as the gallery closes, using the full 30-day cleanup window.
  // Any paid but unfinished order or manual grant remains protected until a real delivery date exists.
  // One image may be bought by several families: ALL relevant deadlines must have elapsed.
  return `EXISTS(SELECT 1 FROM galleries g WHERE g.id=images.gallery_id AND g.retention_policy='school-v1'
    AND g.retention_started_at IS NOT NULL AND g.retention_started_at+${90 * RETENTION_DAY}<=?)
    AND NOT EXISTS(SELECT 1 FROM order_images oi JOIN orders o ON o.id=oi.order_id WHERE oi.image_id=images.id
      AND ((o.status='paid' AND o.deleted_at IS NULL AND o.delivery_delete_at IS NULL) OR o.delivery_delete_at>? OR (o.status='pending' AND o.deleted_at IS NULL AND EXISTS(SELECT 1 FROM galleries pg WHERE pg.id=o.gallery_id AND pg.retention_started_at+${97 * RETENTION_DAY}>?))))
    AND NOT EXISTS(SELECT 1 FROM manual_delivery_retention r WHERE r.image_id=images.id AND r.delete_at>?)
    AND NOT EXISTS(SELECT 1 FROM manual_releases r WHERE r.image_id=images.id AND NOT EXISTS(SELECT 1 FROM manual_delivery_retention d WHERE d.user_id=r.user_id AND d.image_id=r.image_id))`;
}
async function purgeRetentionPrefix(env, prefix) {
  // Include old versions whose immediate deletion failed, not only the latest committed keys.
  // Each page is deleted before reading the first page again, avoiding deletion/cursor skips.
  for (let page = 0; page < 100; page++) {
    const listed = await env.PHOTOS.list({ prefix, limit: 1000 });
    const keys = (listed.objects || []).map(object => object.key);
    if (keys.some(key => !key.startsWith(prefix))) throw new Error('Retention storage prefix mismatch.');
    if (!keys.length) break;
    await env.PHOTOS.delete(keys);
    if (page === 99) throw new Error('Retention storage cleanup requires another pass.');
  }
}
async function purgeRetentionImage(env, image, now) {
  const prefix = `galleries/${image.gallery_id}/${image.id}/`;
  await purgeRetentionPrefix(env, prefix);
  const current = [...new Set([image.original_key,image.preview_key,image.protected_preview_key].filter(Boolean))];
  // Database-owned image keys only. Never delete invoice or order-confirmation objects.
  if (current.some(key => !key.startsWith(prefix))) throw new Error('Retention image key outside its photo prefix.');
  if (current.length) await env.PHOTOS.delete(current);
  await env.DB.batch([
    retentionStatement(env, 'UPDATE images SET retention_purged_at=COALESCE(retention_purged_at,?),retention_checked_at=? WHERE id=? AND retention_purge_started_at IS NOT NULL', now, now, image.id),
    retentionStatement(env, 'UPDATE galleries SET cover_image_id=NULL WHERE id=? AND cover_image_id=?', image.gallery_id, image.id),
    retentionStatement(env, 'DELETE FROM favorites WHERE image_id=?', image.id),
  ]);
}
/** Scheduled only. Revoke access before R2 work; failures remain visible and retry on the next run. */
export async function runSchoolRetention(env, now = Date.now(), limit = 100) {
  if (!await schoolRetentionSchemaReady(env)) return { available: false, purged: 0 };
  const active = await retentionStatement(env, 'SELECT 1 AS active FROM galleries WHERE retention_policy=? LIMIT 1', SCHOOL_RETENTION_POLICY).first();
  if (!active) return { available: true, purged: 0 };
  if (!env.PHOTOS?.delete || !env.PHOTOS?.list) throw new Error('School photo retention requires the PHOTOS R2 binding with list and delete access.');
  await recordSchoolDeliveryRetention(env, null, now);
  await env.DB.batch([
    retentionStatement(env, "INSERT INTO audit_events(id,action,target_id,created_at) SELECT 'retention-close-'||id,'gallery_retention_closed',id,? FROM galleries WHERE retention_policy=? AND retention_started_at IS NOT NULL AND expires_at<=? AND published=1 ON CONFLICT(id) DO NOTHING", now, SCHOOL_RETENTION_POLICY, now),
    retentionStatement(env, 'UPDATE galleries SET published=0,updated_at=? WHERE retention_policy=? AND retention_started_at IS NOT NULL AND expires_at<=? AND published=1', now, SCHOOL_RETENTION_POLICY, now),
  ]);
  // Separate retry/new budgets prevent a failing object from blocking all new work.
  const pending = await retentionRows(env, `SELECT * FROM images WHERE retention_purge_started_at IS NOT NULL AND retention_purged_at IS NULL ORDER BY COALESCE(retention_checked_at,0),id LIMIT ?`, limit);
  const candidates = await retentionRows(env, `SELECT id FROM images WHERE retention_purge_started_at IS NULL AND ${retentionDueCondition()} ORDER BY (SELECT retention_started_at FROM galleries g WHERE g.id=images.gallery_id),gallery_id,id LIMIT ?`, now, now, now, now, limit);
  for (const candidate of candidates) {
    const claimed = await retentionStatement(env, `UPDATE images SET retention_purge_started_at=? WHERE id=? AND retention_purge_started_at IS NULL AND ${retentionDueCondition()} RETURNING *`, now, candidate.id, now, now, now, now).first();
    if (claimed) pending.push(claimed);
  }
  // Revisit tombstoned prefixes as well: a pre-existing upload can finish its R2
  // write after the first purge but is forbidden from committing a live image key.
  const recheck = await retentionRows(env, 'SELECT * FROM images WHERE retention_purged_at IS NOT NULL ORDER BY retention_checked_at,id LIMIT 20');
  let purged = 0, failures = 0;
  for (const image of [...pending, ...recheck]) {
    try { await purgeRetentionImage(env, image, now); purged++; } catch {
      failures++;
      await retentionStatement(env, 'UPDATE images SET retention_checked_at=? WHERE id=?', now, image.id).run();
    }
  }
  // A first upload can lose its D1 commit and fail immediate R2 cleanup.
  // Durable attempted-upload IDs cover those prefixes even without an image row.
  const orphans = await retentionRows(env, `SELECT a.* FROM school_retention_uploads a JOIN galleries g ON g.id=a.gallery_id
    WHERE g.retention_policy=? AND g.retention_started_at IS NOT NULL AND g.expires_at<=?
      AND NOT EXISTS(SELECT 1 FROM images i WHERE i.id=a.image_id)
    ORDER BY COALESCE(a.checked_at,0),a.image_id LIMIT 20`, SCHOOL_RETENTION_POLICY, now);
  for (const upload of orphans) {
    try { await purgeRetentionPrefix(env, `galleries/${upload.gallery_id}/${upload.image_id}/`); } catch { failures++; }
    await retentionStatement(env, 'UPDATE school_retention_uploads SET checked_at=? WHERE image_id=?', now, upload.image_id).run();
  }
  if (failures) throw new Error(`School photo retention has ${failures} pending storage cleanup(s); the next scheduled run will retry.`);
  return { available: true, purged };
}
