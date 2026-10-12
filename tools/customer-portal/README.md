# LiZa Memories Kundenportal

Das Kundenportal läuft unter `https://portal.liza-memories-photography.com/` auf Cloudflare Pages. Die Homepage bleibt auf GitHub Pages und verlinkt im Footer das Portal. Die bisherigen Website-Adressen unter `/galerie/` führen zur passenden Sprachversion des Portals; die lokale Vorschau bleibt dort erreichbar. Homepage-Push und Portal-Deployment sind getrennte Veröffentlichungen. Ein Galerie-Link allein berechtigt nicht zum Zugriff.

## Update vom 9. Oktober 2026

Studio-Navigation, Bildbibliothek, Aktivitäten, Wasserzeichen, Designvorschau, kurze Zahlungsreferenzen, Rechnungen direkt bei Bestellungen und neue E-Mail-Gestaltung sind veröffentlicht. Die additive Migration wurde per D1-Erfolgsmeldung bestätigt; alle 40 öffentlichen Production-Dateien entsprechen dem neuen Paket. Wasserzeichen-Aktivierung und gezielter Kundentest: [Anleitung](UPGRADE-2026-10-09.md). Die Migration nicht erneut ausführen.

## Bedienung

1. Als Verwalterin anmelden und eine Galerie mit Shootingname und Datum erstellen.
2. Fertig bearbeitete JPEG-, PNG- oder WebP-Dateien hochladen. Die Vorschau wird im Browser verkleinert und separat vom geschützten Original gespeichert.
3. Die E-Mail-Adresse und den Namen des Kunden zuordnen. Im Bereich **Rechnung** den passenden Kunden wählen und seine PDF hochladen (maximal 5 MB). Pro Kunde und Galerie gibt es eine Rechnung; sie ist nur für diesen Kunden und die Verwaltung zugänglich.
4. Bilder, Pakete und Zugriff prüfen, dann Galerie veröffentlichen und Einladung senden.
5. Neue Kunden erhalten direkt in der Einladung den einmaligen Link **Passwort festlegen**. Er gilt 30 Minuten. Bei abgelaufenem Link kann im Portal eine neue Zugangsmail angefordert werden. Kunden mit bestehendem Passwort erhalten den normalen Galerie-Link und melden sich an. Vergessene Passwörter werden mit einem neuen einmaligen Link zurückgesetzt.
6. Favoriten werden serverseitig gespeichert. In der Verwaltung zeigt die Galerie Herzen mit den Kunden, die das Bild markiert haben. Der Kundenfilter und **Favoriten auswählen** helfen bei Zusatzbildern; **Aktualisieren** lädt neue Markierungen. Downloads sind für individuell freigegebene oder bezahlte Bilder verfügbar. Ein ZIP enthält die ausgewählten freigegebenen Originale.
7. Überweisungen nach tatsächlichem Zahlungseingang bestätigen. Betrag, Empfänger, IBAN und Verwendungszweck stehen bei der Bestellung. Daneben erscheint ein EPC-Überweisungs-QR-Code, der lokal im Browser erzeugt wird. Kunden können ihn mit einer unterstützten Banking-App scannen oder als PNG speichern. Der QR-Code meldet keinen Zahlungseingang.

Das Portal verwaltet alle Shootingarten: Babybauch, Neugeborene, Familien, Porträts, Hochzeit, Kombi, Schule/Kindergarten und sonstige Shootings. Bei Schule/Kindergarten gelten zunächst ein Digitalbild 10 € und drei Digitalbilder 25 €. Diese Pakete sind je Galerie editierbar. Persönliche Galerien starten ohne diese Schulpreise: Im Bereich Pakete legst du ein Gesamtpaket mit dem individuell vereinbarten Gesamt- oder Restbetrag an. Bereits bezahlte Galerien lassen sich für die zugeordneten Kunden ohne neue Bestellung vollständig freigeben. Fertige Dateien müssen vor dem Verkauf hochgeladen sein; das Portal bearbeitet keine Fotos.

Pro Galerie lassen sich Cover mit Text auf dem Bild, geteiltem Bild/Text oder Text unter dem Bild, Coverhöhe und Bildausschnitt, warmes/helles/dunkles Design, Masonry/Raster, Bilddichte, Abstand, Dateinamen und Ablaufdatum einstellen. Bilder lassen sich einzeln verschieben oder nach Dateinamen sortieren; die Reihenfolge muss ausdrücklich gespeichert werden. Die Kundenvorschau zeigt das Design ohne Verwaltungsdaten. Einladungen werden erst nach Veröffentlichung versendet. Standardmäßig ist ausschließlich Überweisung aktiviert; Stripe und PayPal bleiben auch bei vorhandenen Schlüsseln deaktiviert, bis du sie später ausdrücklich einschaltest.

Die Bestell-E-Mail enthält eine kurze Übersicht mit Preis und Überweisungsdaten. Die vollständige, bei der Bestellung gespeicherte Vertragsbestätigung liegt als gestaltete, druckbare HTML-Datei im Anhang. **Zahlung bestätigen und freigeben** oder eine neue manuelle Downloadfreigabe verschickt eine kurze Download-Benachrichtigung. Die zuvor hochgeladene Rechnung wird an die Bestellbestätigung als PDF angehängt. Deshalb Rechnungen vor der Bestellung hochladen; ein späterer Upload allein versendet keine weitere E-Mail. Die Download-Benachrichtigung enthält keine Rechnung. Bei einem Versandfehler bleiben Zahlung und Freigabe gespeichert, und die Verwaltung zeigt einen Hinweis mit einer Wiederholen-Schaltfläche. Erneutes Bestätigen oder Freigeben bereits freigegebener Bilder erzeugt keine zusätzliche Nachricht.

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
- `backend/mail-templates.mjs`: kurze gestaltete E-Mails und vollständiger Vertragsanhang.
- `backend/schema.sql`: D1-Tabellen. Keine Kundenexporte im Repository.
- `backend/migrations/`: additive Änderungen für bereits vorhandene Datenbanken.
- `bundle-worker.cjs`: verbindet API und E-Mail-Vorlagen zu einer eigenständigen `_worker.js` für Pages Direct Upload.
- `dev/`: Node-Server mit SQLite-D1-Adapter und lokalem privatem R2-Dateiadapter.
- `tests/`: Funktionstests und Zugriffstests.
- `legal.cjs`: Portalhinweise in DE/EN/BS. Sie ergänzen die vorhandenen AGB und müssen vor dem echten Verkauf mit den konkret verwendeten Dienstleistern und Abläufen abgeglichen werden.

Das Portal ist `noindex`, setzt keine Analytics-Beacons und enthält keine privaten Bilder im HTML. Vorschaubilder müssen für angemeldete Kunden angezeigt werden können; wie bei jeder Onlinegalerie sind Screenshots sichtbarer Bilder technisch nicht vollständig vermeidbar. Originaldateien bleiben bis zur Freigabe geschützt.

## Live-Prüfung

Siehe [LIVE-EINRICHTUNG.md](LIVE-EINRICHTUNG.md). Am 8. Oktober 2026 wurden HTTPS, die Produktionskonfiguration und die Passwort-Einrichtung des echten Verwaltungszugangs einschließlich E-Mail-Zustellung bestätigt. Die Inhaberin hat auch den Kundenablauf mit Bestellung, Zahlungsbestätigung, Freigabe und Download erfolgreich ausprobiert. Die hier ergänzten Favoriten-, Design-, Rechnungs- und E-Mail-Funktionen benötigen eine additive Datenbank-Erweiterung und ein neues Portal-Deployment: [UPGRADE-2026-10-08.md](UPGRADE-2026-10-08.md). Für Cloudflare Pages wird die tägliche Bereinigung separat eingerichtet: [CLEANUP-WORKER.md](CLEANUP-WORKER.md). Belegte Prüfergebnisse, technische Grenzen und offene Live-Schritte stehen in [CHECKS.md](CHECKS.md).
