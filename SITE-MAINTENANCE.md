# Website: Quellen und Prüfungen

## Führende Quellen

- `index.html`: Startseitenstruktur und statische deutsche Inhalte. EN/BS werden daraus erzeugt.
- `scripts/homepage.js`: bisheriges Startseitenverhalten und Übersetzungswörterbuch, zentral für alle drei Sprachen.
- `scripts/homepage.css`: gemeinsame Startseiten-Grundgestaltung.
- Bestehende Leistungs-HTML-Dateien: jeweilige Inhalte und Arbeitsproben je Sprache.
- `scripts/improve-site.mjs`: lokalisierte klare Hauptüberschriften, frühe Bildreihenfolge, Themenlinks, Galerie-Aufklappbereiche, Sprunglink und Formularbeschriftungen. Läuft beim Build, nicht im Browser.
- `scripts/site-improvements.css`: Layout dieser Komponenten und reduzierte Bewegung.
- `scripts/generate-new-pages.mjs`: Paketdaten, Preise und generierte Preisseiten. Paketanfragen übergeben die stabile Leistungs-ID und Bronze/Silver/Gold-ID.
- `scripts/contact-flow.js`: validierte Formularvorbelegung, Sendezustand, Doppelklickschutz und lokale Ereignisse.
- `scripts/build-static-site.mjs`: statische Sprachfassungen, responsive Bildattribute, Logo-WebP und Sitemaps. Keine pauschalen `lastmod`-Angaben; erst mit verlässlichen Inhaltsdaten pro Seite ergänzen.

Nach Änderungen `npm run site:build` und `npm run site:check` ausführen. Fertige HTML-Ausgaben ebenfalls committen. Keine zweite, abweichende Kopie der ausgelagerten Startseiten-Skripte pflegen.

## Anfragewege

Beispiel: `index.html?service=newborn&package=bronze&source=preise.html#contact-form-card`.

Erlaubte Leistungen: `portrait`, `maternity`, `newborn`, `family`, `combo`, `wedding`. Erlaubte Paket-IDs: `bronze`, `silver`, `gold`. Herkunftsseiten sind auf bekannte eigene Seiten in DE/EN/BS beschränkt. Die Sprache wird aus der geöffneten Sprachseite übernommen. Beim Wechsel der Leistung wird das vorherige Paket entfernt; beim Sprachwechsel bleibt die gültige Auswahl erhalten.

Name, E-Mail, Telefon und Leistung bleiben Pflichtfelder. Die Nachricht ist optional. Der tatsächliche Versand erfolgt weiterhin ausschließlich an den vorhandenen Formspree-Endpunkt.

## Erfolgsmessung: vorbereitet, noch nicht dauerhaft gespeichert

`document` sendet ein lokales `liza:conversion`-CustomEvent:

- `lead_success`: erst nach erfolgreicher HTTP-Antwort von Formspree, keine Buchungsbestätigung.
- `phone_click` und `whatsapp_click`: getrennte Kontaktklicks, keine Leads/Buchungen.

Enthalten sind nur Ereignisname, erlaubte Leistungs-/Paket-ID, Sprache und erlaubter Herkunftsdateiname. Keine Namen, Telefonnummern, E-Mail-Adressen, Nachrichtentexte, freien URL-Parameter oder Referrer.

Es ist noch kein Empfänger angeschlossen. Diese Ereignisse werden deshalb noch nicht dauerhaft gezählt. Cloudflare Web Analytics unterstützt derzeit keine eigenen Ereignisse: https://developers.cloudflare.com/web-analytics/faq/#does-web-analytics-support-custom-events

## Prüfung vom 10.09.2026

- Build erfolgreich; erneuter vollständiger Build erzeugte identische HTML-Dateien.
- `site:check`: 36 HTML-Dateien; Links, Preise, Sprachversionen, Metadaten, JSON-LD, responsive Startseitenbilder und doppelte Skripte.
- Formulartests für DE/EN/BS: erlaubte/ungültige Parameter, Vorbelegung, Leistungswechsel, Doppelabsenden, Erfolg, Serverfehler, Netzwerkfehler und Ereignisdaten ohne persönliche Formulardaten. Versand ausschließlich simuliert.
- Browser: mobile Startseite 390 px, Babybauch BS 320 px, Desktop 1440 px; keine horizontale Überbreite in den geprüften mobilen Ansichten. Erstes Foto auf DE-Startseite bei ca. 334 px, Newborn bei ca. 431 px; Werte können mit Schriften variieren.
- Browser: Newborn-Galerie 15 zunächst sichtbare Bilder, 67 insgesamt; aufklappbare weitere Bilder mit funktionierender nativer Lightbox. Menü scrollt innerhalb der Bildschirmhöhe. Escape/Fokus getestet.
- Browser: Preis-Bronzepaket Newborn EN übernommen; Sprachwechsel zu BS erhält Paket und Herkunft.
- Originaldateien bleiben Quellen für die Lightbox; `srcset` enthält größere Varianten für höhere Pixeldichten. Keine echte physische Retina-Geräteprüfung erfolgt.
- Logo: 122.389 auf 52.216 Bytes, WebP bei 640 px Breite, visuell geprüft.
- Video: Original 67.986.592 Bytes; CRF 23: 16.952.534 Bytes; CRF 26: 12.222.897 Bytes. CRF 23 gewählt, unveränderte 1920×1080/24 fps, 76,33 s und unverändert kopierte Audiospur. Framevergleich und vollständiger SSIM-Vergleich (0,9961). Fast Start, Poster, `preload="none"` und native Bedienelemente bleiben erhalten. Original zusätzlich außerhalb des Repositories unter `C:\Users\hurem\Desktop\EMINA\Homepage\video-original-backup.mp4` gesichert.
- Live: HTTP, www und GitHub-Alias führen auf HTTPS ohne www; Startseite 200, erfundene URL 404. `/index.html` liefert 200, Canonical zeigt auf `/`. Tatsächlicher GET liefert gzip und `Cache-Control: max-age=600`.

## Noch offene externe Abnahme

- Änderungen nach dem Push auf der Live-Seite prüfen; wiederholbare mobile Lighthouse-Läufe und Netzwerkprüfung dort durchführen.
- Mobile Core-Web-Vitals-Feldwerte nicht bestätigt. Öffentlicher PageSpeed-API-Aufruf wurde mit HTTP 429 abgewiesen.
- Search-Console-URL-Prüfung benötigt Zugriff auf die Property und ihre URL-Inspektion. Indexstatus und von Google gewähltes Canonical wurden nicht bestätigt.
- Echter Formulartest bis zum Posteingang wurde nicht versendet. Er benötigt eine konkrete Testabsendung und Bestätigung des E-Mail-Eingangs.
- Gesprochene Inhalte im Video sind noch nicht bestätigt; deshalb wurden keine Untertitel erfunden.

Hochzeit und Porträt bekommen weitere Arbeitsproben, sobald entsprechende Bilder vorliegen. Bestehende Angebote, Titles und Sprach-URLs bleiben getrennt erhalten.

## Datenschutz (10. September 2026)

Details und Testbericht: `PRIVACY-AUDIT.md`. Die Datenschutztexte werden aus `scripts/privacy-policy-content.mjs` erzeugt. `scripts/privacy-build.mjs` integriert lokale Fonts, die inerte Cloudflare-Konfiguration und Footer-Einstellungen. `scripts/privacy-consent.js` aktiviert den Beacon nur nach Zustimmung; `scripts/validate-privacy.mjs` ist Bestandteil von `npm run site:check`. Neue externe Inhalte erfordern eine erneute Prüfung.
