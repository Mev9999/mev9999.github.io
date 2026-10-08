import path from 'node:path';
import { promises as fs } from 'node:fs';
import { hashPassword } from '../backend/worker.mjs';

// This fixture is called only by the loopback development server and tests.
// These addresses use the reserved .test TLD. They must never be seeded into live D1.
export const fixtureIds = Object.freeze({
  customer: 'local-customer', secondCustomer: 'local-other-customer', admin: 'local-admin', newCustomer: 'local-new-customer',
  gallery: 'familienzeit-vorschau', otherGallery: 'fremde-testgalerie', expiredGallery: 'abgelaufene-testgalerie',
  singlePackage: 'local-ein-bild', threePackage: 'local-drei-bilder',
});

export async function seedLocalDemo({ DB, PHOTOS, pepper, repo }) {
  const existing = await DB.prepare('SELECT id FROM users WHERE id=?').bind(fixtureIds.customer).first();
  if (existing) return fixtureIds;
  const now = Date.now();
  const customerHash = await hashPassword('Testgalerie2026!', pepper);
  const adminHash = await hashPassword('Testverwaltung2026!', pepper);
  await DB.batch([
    DB.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').bind(fixtureIds.customer, 'customer@example.test', 'Beispielkunde', customerHash, 'customer', now),
    DB.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').bind(fixtureIds.secondCustomer, 'other@example.test', 'Zweiter Beispielkunde', customerHash, 'customer', now),
    DB.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').bind(fixtureIds.admin, 'emina@example.test', 'Lokale Testverwaltung', adminHash, 'admin', now),
    DB.prepare('INSERT INTO users (id,email,name,password_hash,role,created_at) VALUES (?,?,?,?,?,?)').bind(fixtureIds.newCustomer, 'new@example.test', 'Neuer Beispielkunde', null, 'customer', now),
    DB.prepare('INSERT INTO galleries (id,name,shooting_date,description,published,cover_image_id,created_at,updated_at,shooting_type,pricing_mode) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(fixtureIds.gallery, 'Eure Familienzeit · Vorschau', '2026-10-07', 'Eine lokale Vorschau mit bereits öffentlich gezeigten Portfoliofotos. Keine echten Kundendaten. Testmodus für Einzelbildbestellungen.', 1, 'local-image-1', now, now, 'school', 'images'),
    DB.prepare('INSERT INTO galleries (id,name,shooting_date,description,published,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').bind(fixtureIds.otherGallery, 'Geschützte Testgalerie', '2026-10-07', 'Nur dem zweiten Testkonto zugeordnet.', 1, now, now),
    DB.prepare('INSERT INTO galleries (id,name,shooting_date,description,published,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(fixtureIds.expiredGallery, 'Abgelaufene Testgalerie', '2026-01-01', 'Prüft den serverseitigen Ablauf.', 1, now - 86400000, now, now),
    DB.prepare('INSERT INTO gallery_members (gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.gallery, fixtureIds.customer),
    DB.prepare('INSERT INTO gallery_members (gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.gallery, fixtureIds.newCustomer),
    DB.prepare('INSERT INTO gallery_members (gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.otherGallery, fixtureIds.secondCustomer),
    DB.prepare('INSERT INTO gallery_members (gallery_id,user_id) VALUES (?,?)').bind(fixtureIds.expiredGallery, fixtureIds.customer),
    DB.prepare('INSERT INTO packages (id,gallery_id,name,image_count,price_cents,currency) VALUES (?,?,?,?,?,?)').bind(fixtureIds.singlePackage, fixtureIds.gallery, 'Ein Lieblingsbild', 1, 1000, 'EUR'),
    DB.prepare('INSERT INTO packages (id,gallery_id,name,image_count,price_cents,currency) VALUES (?,?,?,?,?,?)').bind(fixtureIds.threePackage, fixtureIds.gallery, 'Drei Lieblingsbilder', 3, 2500, 'EUR'),
  ]);
  const samples = [
    ['galerie-familie-dsc02431.webp', 1600, 1067],
    ['galerie-familie-dsc01213.webp', 1067, 1600],
    ['galerie-familie-dsc02350.webp', 1600, 1067],
    ['galerie-familie-dsc02456.webp', 1067, 1600],
    ['galerie-familie-dsc02524.webp', 1600, 1067],
    ['galerie-familie-dsc02634.webp', 1067, 1600],
    ['galerie-familie-dsc02683.webp', 1600, 1067],
    ['galerie-familie-dsc03243.webp', 1067, 1600],
  ];
  for (let index = 0; index < samples.length; index++) {
    const [filename, width, height] = samples[index];
    let bytes;
    try { bytes = await fs.readFile(path.join(repo, filename)); }
    catch (error) { if (error.code !== 'ENOENT') throw error; bytes = Buffer.from(`local-image-fixture-${index + 1}`); }
    const imageId = `local-image-${index + 1}`;
    const previewKey = `${fixtureIds.gallery}/preview/${imageId}.webp`;
    const originalKey = `${fixtureIds.gallery}/original/${imageId}.webp`;
    await PHOTOS.put(previewKey, bytes, { httpMetadata: { contentType: 'image/webp' } });
    await PHOTOS.put(originalKey, bytes, { httpMetadata: { contentType: 'image/webp' } });
    await DB.prepare('INSERT INTO images (id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(imageId, fixtureIds.gallery, `Familienmoment ${String(index + 1).padStart(2, '0')}`, previewKey, originalKey, 'image/webp', 'image/webp', width, height, index, now).run();
  }
  for (const [imageId, galleryId] of [['local-foreign-image', fixtureIds.otherGallery], ['local-expired-image', fixtureIds.expiredGallery]]) {
    const previewKey = `${galleryId}/preview/${imageId}.webp`;
    const originalKey = `${galleryId}/original/${imageId}.webp`;
    await PHOTOS.put(previewKey, Buffer.from('protected-local-test'), { httpMetadata: { contentType: 'image/webp' } });
    await PHOTOS.put(originalKey, Buffer.from('protected-local-test'), { httpMetadata: { contentType: 'image/webp' } });
    await DB.prepare('INSERT INTO images (id,gallery_id,title,preview_key,original_key,preview_type,original_type,width,height,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(imageId, galleryId, 'Geschütztes Testbild', previewKey, originalKey, 'image/webp', 'image/webp', 100, 100, 0, now).run();
  }
  await DB.batch(['local-image-1', 'local-image-2'].map(imageId => DB.prepare('INSERT INTO manual_releases (user_id,image_id,released_at,released_by) VALUES (?,?,?,?)').bind(fixtureIds.customer, imageId, now, fixtureIds.admin)));
  return fixtureIds;
}
