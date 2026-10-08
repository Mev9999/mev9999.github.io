# Prüfstand des Kundenportals

Stand: 8. Oktober 2026. Lokale Prüfungen und tatsächlich bestätigte Live-Ergebnisse sind unten getrennt dokumentiert. Die Live-Anmeldung funktioniert; die vollständige Kundenabnahme ist noch offen.

## Automatische Prüfung

- 35 Tests bestanden: 26 Worker-Tests, 2 Tests des lokalen Adapters, 3 Bank-QR-Tests und 4 Tests des eigenständigen Bereinigungs-Workers.
- Build und Website-Prüfung des tatsächlichen Website-Repositories bestanden; 39 HTML-Dateien wurden geprüft.
- Die Sicherheitsprüfung ergab keinen konkreten blockierenden Befund.
- Ein unabhängiger Decode mit `jsQR` bestätigte den EPC-QR-Inhalt einschließlich UTF-8, 25 EUR und Verwendungszweck.
- Die IBAN aus den tatsächlichen Rechnungen bestand die Prüfsummenvalidierung. Die Bankdaten stehen ausschließlich in der privaten Konfiguration und werden hier nicht wiedergegeben.

## Browserprüfung

- Kunden- und Verwaltungsanmeldung geprüft.
- Favoriten nach erneutem Laden erhalten; Lightbox-Wechsel zum nächsten Bild geprüft.
- Upload mit getrenntem Vorschaubild und Original geprüft.
- Individuellen Preis von 189 EUR und Bestellung der ganzen Galerie geprüft.
- Testbestellung abgesendet: Bestätigung mit Bankverbindung, korrektem Betrag, eindeutiger Bestellnummer und sichtbarem EPC-QR-Code erschienen.
- Originaldownload und ZIP-Download im Browser erfolgreich. Das ZIP enthält zwei Originaldateien; eine unabhängige Prüfung mit .NET `ZipFile` bestätigte beide Originalnamen und die passenden Dateigrößen in Bytes.
- Darstellung bei einer mobilen Breite von 390 Pixeln und einer Desktop-Breite von 1.440 Pixeln geprüft.

Die lokale Testumgebung verwendet eine ausdrücklich gekennzeichnete Testbankverbindung und einen lokalen Mail-Eingang; sie versendet keine echten E-Mails. Die letzte visuelle Prüfung der Zahlungsbestätigung in der Verwaltung wurde durch eine verweigerte Browserberechtigung gestoppt. Zahlung und Downloadfreigabe sind durch die automatisierten Tests geprüft; eine Live-Prüfung steht noch aus.

## Bestätigte Live-Ergebnisse

- `https://portal.liza-memories-photography.com/` ist mit gültigem HTTPS erreichbar; der CNAME zeigt auf `liza-kundenportal.pages.dev`.
- Nach dem Production-Deployment meldet die API `configured=true`, `email=true` und `transferConfigured=true`. Stripe und PayPal bleiben deaktiviert. Diese Konfigurationsprüfung ersetzt keinen Bild-Upload oder vollständigen Bestelltest.
- Der D1-Schemaimport wurde im Dashboard mit 14 Anwendungstabellen bestätigt. Die Bindings `DB` und `PHOTOS` sind per Screenshot belegt; der R2-Bucket trägt die EU-Jurisdiction.
- Die Inhaberin hat die echte Einrichtungsmail sofort erhalten, das Passwort gesetzt und sich angemeldet. Der sichtbare Button „Verwaltung“ bestätigt ihren Admin-Zugang. Der Mail-Versand und die authentifizierte Datenbankabfrage der Galerieübersicht wurden damit tatsächlich durchlaufen.
- Anonyme Live-Aufrufe von `/api/galleries` und `/api/admin/galleries` liefern HTTP 401. Die API auf dem alternativen `liza-kundenportal.pages.dev`-Host liefert HTTP 403; nur die konfigurierte Portal-Origin wird akzeptiert. Die kontenübergreifende Prüfung einer konkreten Testgalerie steht weiterhin aus.

## Grenzen und offene Live-Schritte

- Einzelne Bildauswahlen sind auf 500 Bilder begrenzt. Bestellungen und Freigaben der ganzen Galerie unterstützen bis zu 5.000 Bilder.
- ZIP-Downloads im Browser haben eine Grenze von 300 MB pro Paket; größere Downloads müssen in kleinere Pakete aufgeteilt werden.
- Eine echte Testgalerie mit Upload, Kundeneinladung an ein zweites eigenes Postfach, Reset, Zugriffsschutz, Überweisungsbestellung, Bestätigung und Original-/ZIP-Downloads ist noch zu prüfen.
- „Fail closed“ wurde angewiesen; die gespeicherte Cloudflare-Einstellung wurde bislang nicht gesondert bestätigt.
- Der Pages-Bereinigungs-Worker ist vorbereitet und lokal geprüft. Seine Cloudflare-Bindung, Cron-Konfiguration und erste erfolgreiche Ausführung sind noch nicht bestätigt. Ablaufgrenzen werden unabhängig davon bei jeder zugehörigen Anfrage durchgesetzt.
- Die aktualisierten Datenschutztexte und Portal-Verlinkungen müssen mit dem nächsten jeweiligen Deployment bzw. Homepage-Push veröffentlicht werden.

Die Einrichtungsanleitung steht in [LIVE-EINRICHTUNG.md](LIVE-EINRICHTUNG.md).
