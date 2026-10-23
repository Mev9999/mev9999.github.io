# Geschenkgutscheine – lokale Vorschau

Stand: 23. Oktober 2026. Die neue Funktion wurde lokal gebaut und geprüft. Datenbankmigration, Cloudflare-Deployment und Homepage-Push für diese Erweiterung wurden nicht ausgeführt.

## Vorschau ansehen

Die laufende Testumgebung ist unter diesen Adressen erreichbar:

- Gutscheinseite: http://127.0.0.1:8791/gutscheine.html
- Handy und Desktop vergleichen: http://127.0.0.1:8791/__dev/vouchers
- Bestellung: http://127.0.0.1:8791/gutscheine-kaufen.html
- Verwaltung: http://127.0.0.1:8791/galerie/
- Lokaler E-Mail-Eingang: http://127.0.0.1:8791/__dev/mail

Testverwaltung: `emina@example.test` / `Testverwaltung2026!`. Nach dem Anmelden gegebenenfalls auf **Verwaltung** und anschließend **Gutscheine** wechseln. Diese Zugangsdaten gelten ausschließlich lokal.

Eine Testbestellung mit erfundenen Daten anlegen, den Bestelllink aufbewahren, dann in der Verwaltung den Zahlungseingang bestätigen. Im Bestelllink auf **Status aktualisieren** klicken: Der Gutschein wird als PDF verfügbar. Die zwei Test-E-Mails bleiben im lokalen Postfach; nichts wird an echte Empfänger versendet. Die Bankverbindung in der Vorschau ist ein Testkonto und darf nicht bezahlt werden.

## Bedienung

Der Wert ist frei zwischen 10 € und 2.000 € wählbar. Name der beschenkten Person, Absender und Nachricht sind optional. Der Käufer erhält Überweisungsdaten, Zahlungsreferenz und einen geschützten Bestelllink. Der QR-Code füllt eine Überweisung aus und prüft keinen Zahlungseingang.

**Zahlung bestätigen** erst nach tatsächlichem Eingang am Bankkonto verwenden. Dadurch entsteht ein zufälliger Gutscheincode; der Gutschein wird als PDF an den Käufer geschickt. **Erneut senden** verwendet denselben Code. Der geschützte Bestelllink enthält Käuferdaten und darf nicht an die beschenkte Person weitergeleitet werden; dafür ist die separate Geschenk-PDF gedacht.

Bei einer Anfrage kann der Gutscheincode im eigenen Feld unter dem Partner-Vorteilscode angegeben werden. Eine Anfrage belastet kein Guthaben. In der Verwaltung den Code suchen, einen Betrag für den vereinbarten Termin reservieren oder direkt einlösen. Reservierungen lassen sich später vollständig einlösen oder freigeben; Restguthaben bleibt erhalten. Ein Partner-Rabatt ist weiterhin getrennt vom bezahlten Guthaben.

Ein Online-Rücktritt sperrt weitere Einlösungen sofort. **Rückzahlung erfassen** dokumentiert ausschließlich eine bereits außerhalb des Portals ausgeführte Rückzahlung; es löst keine Banküberweisung aus. Diese Aktion ist für vollständig ungenutztes, nicht reserviertes Guthaben vorgesehen. Bereits teilweise eingelöste Gutscheine bei einem Rücktritt müssen individuell abgeglichen werden.

Gutscheine gelten für persönliche Shootings und vereinbarte zusätzliche Bilder. Organisierte Krippen-, Kindergarten- und Schulfototage sind ausgenommen. Es gibt keine kurze vertragliche Befristung. Auftragsbestätigung und Gutscheinbedingungen werden bei der Bestellung gespeichert. Die Geschenk-PDF enthält keine Rechnungsadresse; sie ist keine Rechnung. Finanzbelege werden weiterhin im bestehenden Buchhaltungsablauf erstellt.

Testbestellungen ohne tatsächliche Kundenzahlung lassen sich in den Gutschein-Details über **Testgutschein löschen** entfernen – auch wenn ihr Zahlungseingang zu Testzwecken bereits bestätigt wurde. Dafür müssen die genaue Bestellreferenz und eine ausdrückliche Testbestätigung eingegeben werden. Code, Bestelllink und PDF-Download werden anschließend ungültig. Aktive Reservierungen, bereits erfolgte Einlösungen oder ein laufender E-Mail-Versand verhindern das Löschen. Der Vorgang wird im Verwaltungsprotokoll festgehalten und verschickt keine E-Mail. Für echte bezahlte Kundenbestellungen bleibt der Rücktritts-/Erstattungsablauf vorgesehen.

Gutschein-Mails verwenden dieselbe Gestaltungsvorlage wie die übrigen Portal-Mails. Die Geschenk-PDF wird direkt im Worker ohne Personenfoto erzeugt: mit eingebetteten Website-Schriften, Logo, persönlicher Widmung und einem grafischen Blendenmotiv. Die zweite Seite ist als Rückseite gestaltet und zeigt die Leistungen mit Symbolen sowie Hinweise zu Einlösung, Restguthaben, Gültigkeit und Kontakt. Beide Seiten nennen das ursprüngliche Ausstellungsdatum (Bestätigung des Zahlungseingangs); die Gültigkeitsangabe entspricht den bestehenden Bedingungen ohne vertragliche Befristung. Auch erneut heruntergeladene oder versandte bestehende Gutscheine verwenden die aktuelle Gestaltung bei unverändertem Code, Guthaben und Ausstellungsdatum.

Bestellseite und Gutscheinbedingungen übernehmen den gemeinsamen Header und Footer. Website-Links führen vom Portal zur Hauptwebsite; der Sprachwechsel bleibt auf der jeweiligen Bestellseite und erhält einen vorhandenen geschützten Zugang. Der Startseiten-Link **Gutschein-FAQ** führt direkt zu den Gutscheinfragen. Für dieses Design- und Navigationsupdate ist keine weitere Datenbankmigration erforderlich.

## Quellen und lokale Prüfungen

- `build.cjs`, `copy.cjs`, `page.css`, `public-page.js`: Gutscheinseite, Bestellung und Bedingungen in DE/EN/BS. Generierte Dateien im Website-Stamm und die benötigten Transaktionsdateien unter `galerie/`.
- `integration.mjs`: direkter Header-Link zwischen Häufige Fragen und Kontakt, Footer-Link, Gutschein-FAQ-Link und separater Hinweis auf der Startseite.
- `scripts/gift-inquiry.mjs`: eigenes Gutscheincode-Feld im Anfrageformular; keine automatische Einlösung.
- `tools/customer-portal/backend/vouchers.mjs`: Bestellung, Zahlungsfreigabe, Guthaben, Reservierungen, Rücktritt und E-Mail-Versand.
- `tools/customer-portal/backend/voucher-pdf.mjs`: zweiseitige Geschenk-PDF mit eingebetteter Schrift für DE/EN/BS.
- `tools/customer-portal/backend/voucher-service-icons.mjs`: Vektorsymbole für die Leistungen auf der Gutscheinrückseite.
- `tools/customer-portal/backend/migrations/2026-10-23-vouchers.sql`: drei zusätzliche Tabellen mit Indizes; bestehende Galerien und Bestellungen werden nicht verändert.

Lokales Bauen: `npm run portal:build` (oder bei vorhandenen Portal-Hinweisen `npm run vouchers:build`). Prüfen: `npm run portal:test`, `npm run portal:check`, `npm run site:check` und `node --test tools/gift-vouchers/tests/public.test.cjs`.

Für einen neuen Vorschauprozess: `npm run portal:preview` (Standardport 8789). Testdaten und E-Mails verbleiben in der lokalen Testumgebung. Sie gehören weder in das ZIP noch in GitHub.

Optionale Browserprüfung mit installiertem Playwright und Chrome: `node tools/gift-vouchers/tests/visual.cjs` prüft die Darstellung; `node tools/gift-vouchers/tests/preview.cjs` führt Testbestellungen und eine Zahlungsfreigabe ausschließlich lokal aus. Konfigurierbar über `LIZA_PLAYWRIGHT_MODULE`, `LIZA_VOUCHER_ARTIFACT_DIR`, `LIZA_VOUCHER_PREVIEW_URL` und `LIZA_CHROME_EXECUTABLE`. Ohne Konfiguration verwenden die Skripte Port 8791 und einen temporären Ausgabeordner. Andere Ziele als Loopback werden verweigert.

## Veröffentlichung erst nach Durchsicht

Nach Freigabe zuerst die neue additive Migration auf der vorhandenen Portal-Datenbank anwenden und das aktualisierte Portal einschließlich Gutschein-Bestellseiten hochladen. Bestehende D1-/R2-Bindings, Bankdaten, E-Mail-Absender und `PASSWORD_PEPPER` beibehalten. Der bestehende Bereinigungs-Worker benötigt für Gutscheine keine Änderung; die Fotogalerie-Löschfristen werden nicht auf offene Gutschein-Guthaben angewendet.

Vor Freischaltung des Verkaufs die tatsächlichen Bank- und Anbieterangaben, Gutscheinbedingungen, Rücktrittsinformation und Buchhaltungsbehandlung mit dem eigenen Ablauf abgleichen. Im Portal müssen Bestellung, echter E-Mail-Versand, Zahlungsfreigabe und PDF-Download geprüft sein, bevor die Homepage mit den öffentlichen Kauf-Links gepusht wird. Die lokalen Tests bestätigen keinen bereits erfolgten Live-Betrieb.
