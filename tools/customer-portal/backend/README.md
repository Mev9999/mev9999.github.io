# Privater Portal-Server

Der Server ist vorbereitet, aber nicht veröffentlicht oder mit echten Anbieter-Zugangsdaten verbunden. Er verwendet Cloudflare Workers, D1 und den bereits angelegten privaten EU-R2-Bucket `liza-memories-gallerie`. Weder Originalfotos noch Kundenlisten gehören in GitHub Pages oder in das öffentliche `dist`-Verzeichnis.

## Verbindung einrichten

1. D1-Datenbank `liza-customer-portal` anlegen, möglichst mit EU-Jurisdiktion. Die echte Database-ID in `wrangler.jsonc` einsetzen. `schema.sql` auf dieser Datenbank ausführen. Bei einem späteren Update bestehende Tabellen mit einer eigenen Migration ändern; `CREATE TABLE IF NOT EXISTS` ergänzt keine Spalten.
2. Den R2-Bucket als `PHOTOS` und die Datenbank als `DB` binden. Der Bucket bleibt privat. Keine R2-Entwicklungs-URL und keine öffentliche R2-Domain aktivieren.
3. Nur die vom Projekt erzeugten Frontend-Dateien in `../dist` als Assets bereitstellen. Lokale Datenbank, Test-Mailbox, Originale, Secrets und Admin-SQL dürfen dort nicht liegen.
4. Exakte HTTPS-Origin `https://portal.liza-memories-photography.com` und `PORTAL_PATH=/` setzen. Das ist eine Subdomain der bestehenden Domain. Falls externe DNS-Verwaltung beibehalten werden soll, kann die Oberfläche samt Advanced-Mode-Worker auch als Cloudflare-Pages-Projekt auf die Subdomain gelegt werden; die Hauptseite bleibt auf GitHub Pages. Der DNS-Schritt wird gesondert nach der fertigen Vorschau durchgeführt.
5. Mindestens `PASSWORD_PEPPER` als Worker-Secret setzen: langer zufälliger Wert aus dem Passwortmanager, mindestens 32 Zeichen. Dieser Wert darf nicht in Git, Build-Assets, Browser-Konfiguration oder Chat stehen. Den Wert sicher aufbewahren; eine Rotation erfordert das Zurücksetzen vorhandener Passwörter.
6. E-Mail-Absender-Domain bei Resend verifizieren und `EMAIL_API_KEY` sowie `EMAIL_FROM` setzen. Die Absenderadresse muss für Versand zugelassen sein. E-Mails werden durch den Server versendet, niemals durch den Browser. Anbieter-AVV, Datenschutztexte und aktuelle Tarife vor echter Nutzung prüfen.
7. Den ersten Administrator lokal mit `bootstrap-admin.mjs` anlegen. Das Tool fragt das Passwort verdeckt im Terminal ab und erzeugt eine private SQL-Datei. Dieselbe Pepper muss für Tool und Worker verwendet werden. Die SQL-Datei in D1 importieren, anschließend löschen. Es gibt keinen öffentlich erreichbaren Bootstrap und kein Standard-Admin-Passwort.
8. Für Überweisung `BANK_RECIPIENT`, `BANK_IBAN` und optional `BANK_BIC` hinterlegen. Empfänger höchstens 70 Zeichen ohne Zeilenumbrüche, gültige IBAN mit MOD-97-Prüfsumme (österreichische IBAN genau 20 Zeichen) und BIC optional mit 8 oder 11 Zeichen. Leerzeichen in der IBAN werden entfernt. Ohne korrekte Werte bleibt Überweisung deaktiviert. Die erste Fassung verwendet ausschließlich `PAYMENT_METHODS=transfer`. Kartenzahlung und PayPal sind technisch vorbereitet, werden aber erst nach ausdrücklicher späterer Aktivierung angezeigt. Dazu braucht es eigene Händlerkonten, Anbieter-Secrets und eine erweiterte Allowlist, beispielsweise `transfer,stripe,paypal`.

Beispiel für den privaten Bootstrap (Pfad außerhalb der öffentlichen Assets):

```powershell
node backend/bootstrap-admin.mjs --email "deine-adminadresse@example.at" --name "Emina" --output ".private/admin-bootstrap.sql"
```

Die konkreten Veröffentlichungsbefehle stehen in der Projekt-Anleitung. `wrangler.jsonc` enthält bewusst noch keine erfundene Datenbank-ID, Bankverbindung oder Zahlungs-Secrets.

## Zahlungen

- Stripe: Secrets `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET`. Webhook auf `/api/payments/stripe/webhook`. Abonnierte Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `checkout.session.async_payment_failed`. Der Browser-Return schaltet niemals selbst Downloads frei. Nur eine gültige HMAC-Signatur mit maximal fünf Minuten Zeitabweichung und ein exakt passender Anbieterbetrag / Währung / Checkout / Bestellverweis bestätigen Zahlung.
- PayPal: Secrets `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`; Variable `PAYPAL_ENVIRONMENT=sandbox` für Tests bzw. `live` für reale Verkäufe. Der Return führt einen authentifizierten serverseitigen Capture aus. Betrag, Währung, Bestellung und Capture-Status werden mit der PayPal-API verifiziert.
- Überweisung: Nur ein Administrator kann einen Zahlungseingang als bezahlt markieren. Online-Zahlungen lassen sich über diesen Button nicht als bezahlt ausgeben.
- Die Vertragsbestätigung mit Paket, Preis, Bildauswahl, Bedingungen, Erklärung zur digitalen Bereitstellung und Rücktrittsbelehrung wird unveränderlich gespeichert und per E-Mail versandt, bevor ein Download aus einer Bestellung verfügbar wird. Bei Überweisung enthält sie Empfänger, IBAN, optional BIC, Betrag und eindeutige Bestellnummer als Zahlungsreferenz. Fehlt der Versand, bleibt der Download gesperrt. Der Administrator kann den Versand erneut auslösen.
- Erstattungen erfolgen beim Anbieter bzw. per Überweisung außerhalb dieses ersten Portals. Danach als erstattet markieren; das sperrt weitere gekaufte Downloads. Bereits heruntergeladene Dateien lassen sich nicht zurückholen. Chargebacks und externe Rückzahlungen müssen in der Verwaltung abgeglichen werden. Eine automatische Stripe-/PayPal-Erstattungsintegration ist nicht Bestandteil dieser Fassung.
- Rücktrittserklärungen lassen sich bei der eigenen Bestellung absenden. Sie werden gespeichert und Kunde sowie Anbieter erhalten eine Eingangsbestätigung. Eine Prüfung / Rückzahlung erfolgt manuell. Eine automatisierte Rückzahlung wird nicht vorgetäuscht.

## Galerietypen und Preise

Galerien für Babybauch, Neugeborene, Familie, Porträt, Hochzeit, Kombi und Sonstiges erhalten keine automatisch aufgezwungenen Schulpreise. Ihr Standard ist `pricingMode=gallery`: der Administrator erstellt ein Gesamtpaket (`imageCount:0`) zum vereinbarten Gesamt- oder Restbetrag. Ist das Shooting bereits bezahlt oder sollen Bilder ohne weitere Bestellung geliefert werden, kann er die gewünschten Originale manuell für den Kunden freigeben.

Nur `shootingType=school` mit `pricingMode=images` erhält beim Anlegen automatisch 10 € für ein digitales Foto und 25 € für drei. Ein Mehrfachpaket berechnet sich serverseitig: zwei Einzelbilder 20 €, sechs im 3er-Paket 50 €. Eigene Pakete bleiben möglich. Der Server verhindert, dass ein Bildpreis-Paket versehentlich für eine Galerie mit Gesamtpreis bestellt wird. Theme warm / light / dark, Masonry / Grid und vertikale Cover-Position 0–100 werden galeriebezogen gespeichert und validiert.

## Sicherheit und Betrieb

- Ausschließlich vorhandene, vom Administrator zugeordnete Kunden dürfen ihren Zugang aktivieren. Passwörter liegen als gesalzener PBKDF2-SHA256-Hash mit 100.000 Iterationen und separater HMAC-Pepper vor; das berücksichtigt die Workers-Web-Crypto-Grenze. CPU-Zeit des Passwortflusses vor Produktionsbetrieb im echten Cloudflare-Tarif testen; lokaler Node-Erfolg beweist nicht das Workers-CPU-Budget.
- Setup- und Reset-Links enthalten 256-Bit-Zufallstokens, sind 30 Minuten gültig, werden nur gehasht gespeichert und atomar einmal verwendet. Eine Passwortänderung beendet alte Sessions. Bestehende Passwörter werden nicht per E-Mail versandt.
- Zufällige HttpOnly-/Secure-/SameSite=Lax-Session-Cookies gelten sieben Tage. Die Datenbank hält nur den Tokenhash. Schreibende Requests prüfen Origin und CSRF. Session, Token und Rate-Limit-Reste werden täglich bereinigt.
- Login, Tokenanfragen, Einladungen und Bestellungen sind begrenzt. Anonyme Auth-Antworten geben nicht preis, ob ein Konto existiert. In Produktion wird E-Mail-Zustellung unabhängig von der Antwort beendet, damit Provider-Latenz nicht die Existenz verrät.
- Jede Galerie- und Bildroute prüft Berechtigung und Ablauf neu. Eine weitergeleitete Galerie-URL allein gewährt keinen Zugriff. Vorschauen sind nur nach Login sichtbar. Originale benötigen eine separate Freigabe / bestätigte bezahlte Bestellung. Kunden können keine fremden Bild-IDs über Favoriten oder Bestellungen einschleusen.
- Fotos werden als private R2-Objekte gestreamt. Hochladen darf nur ein Administrator; JPEG / PNG / WebP werden anhand ihrer Signatur geprüft. Pro Request ein Bildpaar: Vorschau höchstens 4 MB, Original höchstens 30 MB. Nicht das gesamte Upload-Verzeichnis in einen Request packen.
- Paketpreise und Anzahl stammen aus D1. Die Bildauswahl wird mit `json_each(?)` gebunden, damit größere Galerien die D1-Grenze von 100 SQL-Parametern nicht überschreiten. Datenbank-Transaktionen und ein eindeutiger Schlüssel für offene Auswahlen verhindern doppelte Bestellungen bei gleichzeitigen Klicks.
- Test-Mails und unsichere lokale Cookies existieren ausschließlich bei `LOCAL_DEV=true`, einer echten HTTP-Loopback-Origin und passendem Request-Host. `LOCAL_DEV=false` in Produktion. Keine Testkonten oder Demo-Fotogalerien in eine produktive Datenbank importieren.
- Strukturierte Fehlerlogs enthalten keine E-Mail-Adressen, Passwörter, Recovery-Tokens, Providerantworten oder Foto-Objektschlüssel. API und Fotos haben keine öffentliche Cache-Freigabe. Portal wird über `X-Robots-Tag` von Indexierung ausgeschlossen; öffentliche Marketingseiten bleiben unverändert.

Vor echten Kunden: Datenbank- / R2-Backup- und Löschkonzept festlegen, reale Bankverbindung prüfen, Absender verifizieren, Cloudflare-Zugriff / Stripe-Webhooks / PayPal-Return unter HTTPS testen, AVV und aktualisierte Datenschutzhinweise prüfen. Die vorbereiteten Vertragsinformationen müssen zum tatsächlichen Angebot und Betreiber passen; kein Live-Zahlungstest mit echten Kundendaten ist erfolgt.

Offizielle Referenzen: [D1-API](https://developers.cloudflare.com/d1/worker-api/d1-database/), [Wrangler-Konfiguration](https://developers.cloudflare.com/workers/wrangler/configuration/), [R2-Worker-Anbindung](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/), [Stripe-Webhooks](https://docs.stripe.com/webhooks), [PayPal Orders API](https://developer.paypal.com/api/orders/v2), [Resend-Mailversand](https://resend.com/docs/api-reference/emails/send-email), [FAGG im RIS](https://ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20008847).
