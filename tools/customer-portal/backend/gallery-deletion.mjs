/** Remove a gallery and its photo objects while retaining order/receipt records. */
export const GalleryDeletionError = class extends Error {
  constructor(status, message, code) { super(message); this.name = 'GalleryDeletionError'; this.status = status; this.code = code; }
};

function galleryDeletionStatement(env, sql, ...values) { return env.DB.prepare(sql).bind(...values); }
async function galleryDeletionRows(env, sql, ...values) { return (await galleryDeletionStatement(env, sql, ...values).all()).results || []; }
function galleryDeletionReject(status, message, code) { throw new GalleryDeletionError(status, message, code); }

export async function deleteGallery(env, galleryId, actor, confirmation) {
  if (actor?.role !== 'admin' || !actor.id) galleryDeletionReject(403, 'Diese Funktion ist nur für die Verwaltung verfügbar.', 'admin_required');
  const administrator = await galleryDeletionStatement(env, "SELECT id FROM users WHERE id=? AND role='admin' AND disabled=0", actor.id).first();
  if (!administrator) galleryDeletionReject(403, 'Diese Funktion ist nur für die Verwaltung verfügbar.', 'admin_required');
  const columns = new Set((await galleryDeletionRows(env, 'PRAGMA table_info(galleries)')).map(row => row.name));
  if (!columns.has('deleted_at') || !columns.has('media_deleted_at')) galleryDeletionReject(503, 'Bitte spiele zuerst das Datenbank-Update für das Löschen von Galerien ein.', 'migration_required');
  const gallery = await galleryDeletionStatement(env, 'SELECT * FROM galleries WHERE id=?', galleryId).first();
  if (!gallery) galleryDeletionReject(404, 'Die Galerie wurde nicht gefunden.', 'not_found');
  if (confirmation?.confirmed !== true || typeof confirmation.confirmName !== 'string' || confirmation.confirmName !== gallery.name) {
    galleryDeletionReject(400, 'Bitte bestätige das Löschen und gib den vollständigen Namen der Galerie ein.', 'deletion_confirmation_required');
  }
  const tables = new Set((await galleryDeletionRows(env, "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('download_notifications','customer_activity','image_download_blocks')")).map(row => row.name));
  const tokenColumns = new Set((await galleryDeletionRows(env, 'PRAGMA table_info(auth_tokens)')).map(row => row.name));
  const now = Date.now();
  const guard = ' AND EXISTS(SELECT 1 FROM galleries WHERE id=? AND name=?)';
  const guarded = (sql, ...values) => galleryDeletionStatement(env, sql + guard, ...values, galleryId, confirmation.confirmName);
  // Revoke access before touching storage. Keep gallery/image/package rows because
  // immutable order snapshots and order_images still reference these records.
  const deleted = await env.DB.batch([
    galleryDeletionStatement(env, 'UPDATE galleries SET deleted_at=COALESCE(deleted_at,?),published=0,cover_image_id=NULL,updated_at=CASE WHEN deleted_at IS NULL THEN ? ELSE updated_at END WHERE id=? AND name=? RETURNING deleted_at', now, now, galleryId, confirmation.confirmName),
    guarded('UPDATE packages SET active=0 WHERE gallery_id=?', galleryId),
    guarded('DELETE FROM gallery_members WHERE gallery_id=?', galleryId),
    guarded('DELETE FROM favorites WHERE image_id IN (SELECT id FROM images WHERE gallery_id=?)', galleryId),
    guarded('DELETE FROM manual_releases WHERE image_id IN (SELECT id FROM images WHERE gallery_id=?)', galleryId),
    ...(tokenColumns.has('gallery_id') ? [guarded('DELETE FROM auth_tokens WHERE gallery_id=?', galleryId)] : []),
    ...(tables.has('download_notifications') ? [guarded('UPDATE download_notifications SET cancelled_at=COALESCE(cancelled_at,?),lease_at=NULL WHERE gallery_id=? AND sent_at IS NULL', now, galleryId)] : []),
    ...(tables.has('customer_activity') ? [guarded('DELETE FROM customer_activity WHERE gallery_id=?', galleryId)] : []),
    ...(tables.has('image_download_blocks') ? [guarded('DELETE FROM image_download_blocks WHERE image_id IN (SELECT id FROM images WHERE gallery_id=?)', galleryId)] : []),
    guarded("INSERT INTO audit_events(id,user_id,action,target_id,created_at) SELECT ?,?,'gallery_deleted',?,? WHERE NOT EXISTS(SELECT 1 FROM audit_events WHERE action='gallery_deleted' AND target_id=?)", crypto.randomUUID(), actor.id, galleryId, now, galleryId),
  ]);
  if (!deleted[0]?.results?.length) galleryDeletionReject(409, 'Der Galeriename wurde währenddessen geändert. Bitte bestätige das Löschen erneut.', 'gallery_changed');
  return { deleted: true, ...(await purgeDeletedGalleryMedia(env, galleryId)) };
}

/** Idempotent retry for a tombstoned gallery; never touches invoices or receipts. */
export async function purgeDeletedGalleryMedia(env, galleryId) {
  const gallery = await galleryDeletionStatement(env, 'SELECT * FROM galleries WHERE id=?', galleryId).first();
  if (!gallery?.deleted_at) galleryDeletionReject(409, 'Die Galerie wurde noch nicht gelöscht.', 'gallery_not_deleted');
  if (gallery.media_deleted_at) return { cleanupPending: false, remainingMedia: 0 };
  const images = await galleryDeletionRows(env, 'SELECT * FROM images WHERE gallery_id=?', galleryId);
  const keys = [...new Set(images.flatMap(image => [image.original_key, image.preview_key, image.protected_preview_key]).filter(key => typeof key === 'string' && key.length))];
  let remainingMedia = 0;
  // R2 permits at most 1,000 keys per delete call. A failed batch is retried in
  // full; deleting an already absent key succeeds and cannot expose the gallery.
  for (let offset = 0; offset < keys.length; offset += 1000) {
    const batch = keys.slice(offset, offset + 1000);
    try { await env.PHOTOS.delete(batch); } catch { remainingMedia += batch.length; }
  }
  if (!remainingMedia && Object.hasOwn(gallery, 'media_deleted_at')) {
    await galleryDeletionStatement(env, 'UPDATE galleries SET media_deleted_at=COALESCE(media_deleted_at,?) WHERE id=? AND deleted_at IS NOT NULL', Date.now(), galleryId).run();
  }
  return { cleanupPending: remainingMedia > 0, remainingMedia };
}
