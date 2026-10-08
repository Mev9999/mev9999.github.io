# LiZa Memories Kundenportal

Das Kundenportal läuft unter `https://portal.liza-memories-photography.com/` auf Cloudflare Pages. Die Homepage bleibt auf GitHub Pages und verlinkt im Footer das Portal. Die bisherigen Website-Adressen unter `/galerie/` führen zur passenden Sprachversion des Portals; die lokale Vorschau bleibt dort erreichbar. Homepage-Push und Portal-Deployment sind getrennte Veröffentlichungen. Ein Galerie-Link allein berechtigt nicht zum Zugriff.

## Bedienung

1. Als Verwalterin anmelden und eine Galerie mit Shootingname und Datum erstellen.
2. Fertig bearbeitete JPEG-, PNG- oder WebP-Dateien hochladen. Die Vorschau wird im Browser verkleinert und separat vom geschützten Original gespeichert.
3. Die E-Mail-Adresse und den Namen des Kunden zuordnen. Optional Ablaufdatum und Cover festlegen.
4. Bilder, Pakete und Zugriff prüfen, dann Galerie veröffentlichen und Einladung senden.
5. Kunden öffnen den Link und richten einmalig ein Passwort über den Bestätigungslink in ihrer E-Mail ein. Später melden sie sich mit E-Mail und Passwort an. Vergessene Passwörter werden mit einem neuen einmaligen Link zurückgesetzt.
6. Favoriten werden serverseitig gespeichert. Downloads sind für individuell freigegebene oder bezahlte Bilder verfügbar. Ein ZIP enthält die ausgewählten freigegebenen Originale.
7. Überweisungen nach tatsächlichem Zahlungseingang bestätigen. Betrag, Empfänger, IBAN und Verwendungszweck stehen bei der Bestellung. Daneben erscheint ein EPC-Überweisungs-QR-Code, der lokal im Browser erzeugt wird. Kunden können ihn mit einer unterstützten Banking-App scannen oder als PNG speichern. Der QR-Code meldet keinen Zahlungseingang.

Das Portal verwaltet alle Shootingarten: Babybauch, Neugeborene, Familien, Porträts, Hochzeit, Kombi, Schule/Kindergarten und sonstige Shootings. Bei Schule/Kindergarten gelten zunächst ein Digitalbild 10 € und drei Digitalbilder 25 €. Diese Pakete sind je Galerie editierbar. Persönliche Galerien starten ohne diese Schulpreise: Im Bereich Pakete legst du ein Gesamtpaket mit dem individuell vereinbarten Gesamt- oder Restbetrag an. Bereits bezahlte Galerien lassen sich für die zugeordneten Kunden ohne neue Bestellung vollständig freigeben. Fertige Dateien müssen vor dem Verkauf hochgeladen sein; das Portal bearbeitet keine Fotos.

Pro Galerie lassen sich Cover, Bildausschnitt, warmes/helles/dunkles Design, Masonry/Raster und Ablaufdatum einstellen. Einladungen werden erst nach Veröffentlichung versendet. Standardmäßig ist ausschließlich Überweisung aktiviert; Stripe und PayPal bleiben auch bei vorhandenen Schlüsseln deaktiviert, bis du sie später ausdrücklich einschaltest.

## Lokale Vorschau

Node.js ab Version 22.13 mit `node:sqlite`, empfohlen Node 24. Keine echten Kundendaten nötig.

Im Website-Ordner:

```text
npm run portal:build
npm run portal:test
npm run portal:preview
```

Öffnen: `http://127.0.0.1:8789/galerie/`.

Lokale Testkonten (funktionieren nicht im Livebetrieb):

| Zugang | E-Mail | Passwort |
| --- | --- | --- |
| Kunde | customer@example.test | Testgalerie2026! |
| Verwaltung | emina@example.test | Testverwaltung2026! |

Die Vorschau verwendet ausschließlich bereits veröffentlichte Website-Fotos und erfundene Konten. Der lokale Server bindet ausschließlich `127.0.0.1`. Test-E-Mails werden nicht verschickt; der lokale Mail-Eingang ist unter `/__dev/mail` sichtbar. `.local-state/` enthält nur lokale Testdaten und wird weder veröffentlicht noch eingecheckt. Vorlagen, Tests und Serveradapter gehören nicht ins öffentliche Asset-Paket.

## Quellen und Build

- `frontend/`: HTML-Template, scoped CSS, Vanilla-JavaScript und DE/EN/BS-Texte.
- `build.cjs`: übernimmt Navigation, Footer, Farben, lokale Schriften und Logo aus den vorhandenen Startseiten. Ausgabe: `galerie/`.
- `integrate.cjs`: fügt nach dem regulären Website-Build einen dezenten Portal-Link in die bestehenden Footer ein.
- `backend/worker.mjs`: API, Authentifizierung, Bildschutz, Verwaltung, Zahlungen.
- `backend/schema.sql`: D1-Tabellen. Keine Kundenexporte im Repository.
- `dev/`: Node-Server mit SQLite-D1-Adapter und lokalem privatem R2-Dateiadapter.
- `tests/`: Funktionstests und Zugriffstests.
- `legal.cjs`: Portalhinweise in DE/EN/BS. Sie ergänzen die vorhandenen AGB und müssen vor dem echten Verkauf mit den konkret verwendeten Dienstleistern und Abläufen abgeglichen werden.

Das Portal ist `noindex`, setzt keine Analytics-Beacons und enthält keine privaten Bilder im HTML. Vorschaubilder müssen für angemeldete Kunden angezeigt werden können; wie bei jeder Onlinegalerie sind Screenshots sichtbarer Bilder technisch nicht vollständig vermeidbar. Originaldateien bleiben bis zur Freigabe geschützt.

## Live-Prüfung

Siehe [LIVE-EINRICHTUNG.md](LIVE-EINRICHTUNG.md). Am 8. Oktober 2026 wurden HTTPS, die Produktionskonfiguration und die Passwort-Einrichtung des echten Verwaltungszugangs einschließlich E-Mail-Zustellung bestätigt. Der vollständige Kundenablauf mit Upload, Überweisungsbestellung, Freigabe und Download muss noch auf der Live-Seite geprüft werden. Für Cloudflare Pages wird die tägliche Bereinigung separat eingerichtet: [CLEANUP-WORKER.md](CLEANUP-WORKER.md). Belegte Prüfergebnisse, technische Grenzen und offene Live-Schritte stehen in [CHECKS.md](CHECKS.md).
