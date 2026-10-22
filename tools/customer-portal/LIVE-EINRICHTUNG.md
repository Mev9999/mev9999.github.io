# Portal live verbinden

Der Code ist vorbereitet. Diese Schritte verbinden ihn mit den tatsächlichen Konten; ein GitHub-Push alleine startet die Serverfunktionen nicht.

Stand 8. Oktober 2026: Die Portal-Subdomain ist per HTTPS erreichbar. Das veröffentlichte Pages-Projekt erkennt `DB`, `PHOTOS`, E-Mail-Versand und die Überweisungskonfiguration. Die Inhaberin hat die Einrichtungs-E-Mail erhalten, ihr Passwort gesetzt und sich mit sichtbarem Verwaltungszugang angemeldet. Anschließend hat sie auch Bestellung, Zahlungsbestätigung, Freigabe und Download erfolgreich ausprobiert. Für die neu ergänzten Favoriten-, Design-, Rechnungs- und E-Mail-Funktionen gilt die [Update-Anleitung](UPGRADE-2026-10-08.md). Die geplante Bereinigung und die gezielte Prüfung fremder Kundenzugriffe sind noch offen.

## 1. Cloudflare Datenbank und privaten Speicher verbinden

- D1-Datenbank `liza-customer-portal` erstellen und bei Erstellung Jurisdiction **EU** wählen.
- Die zurückgegebene Datenbank-ID in die Deployment-Konfiguration eintragen.
- `backend/schema.sql` in die neue, leere Datenbank einspielen. Niemals die lokalen Demo-Daten übertragen.
- R2-Binding `PHOTOS` mit `liza-memories-gallerie` und Jurisdiction `eu` verbinden. Öffentliche Bucket-URLs bleiben deaktiviert.
- Ein zufälliges Secret `PASSWORD_PEPPER` mit mindestens 32 Zeichen erstellen und als Cloudflare-Secret speichern. Es darf nicht im Repository, Chat oder Frontend stehen. Sicher aufbewahren: eine Änderung macht bestehende Passwort-Hashes unbrauchbar.
- `PORTAL_ORIGIN=https://portal.liza-memories-photography.com` und `PORTAL_PATH=/` konfigurieren; `LOCAL_DEV=false` setzen oder die Variable weglassen.

Technische Dokumentation: [D1 EU-Jurisdiction](https://developers.cloudflare.com/d1/configuration/data-location/), [private R2-Zugriffe im Worker](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/).

## 2. Subdomain ohne Umzug der Homepage

Die App kann als Worker mit statischen Assets betrieben werden. Für eine Worker-Custom-Domain muss die DNS-Zone bei Cloudflare aktiv sein.

Falls deine DNS-Einträge weiter bei IONOS oder einem anderen Anbieter liegen, ist die vorbereitete **Cloudflare-Pages-Variante mit demselben Worker-Code** möglich:

```text
node tools/customer-portal/package-pages.cjs
```

Sie erstellt `tools/customer-portal/dist-pages/` mit der öffentlichen Oberfläche und `_worker.js`; keine Demo-Daten, Originalbilder oder Geheimnisse. Für Pages die Bindings `DB`, `PHOTOS` und Secrets wie oben setzen. `portal.liza-memories-photography.com` zuerst im Pages-Projekt unter Custom domains hinzufügen. Danach genau den von Cloudflare genannten CNAME-Zielwert bei deinem DNS-Anbieter eintragen. Nur der Portal-Eintrag wird ergänzt; bestehende Mail-, Homepage- und Domain-Einträge bleiben bestehen.

Unter Pages **Settings → Runtime → Fail open/closed** die Einstellung **Fail closed** verwenden. Sie verhindert, dass erschöpfte Functions-Kontingente zum Ausliefern von ungeprüften statischen API-Antworten führen. [Cloudflare: Fail open/closed](https://developers.cloudflare.com/pages/functions/routing/#fail-open--closed).

Das Pages-Paket mit `_worker.js` führt keinen geplanten Cron-Aufruf aus. Dafür ist der eigenständige Bereinigungs-Worker vorgesehen: [Einrichtung und Prüfung](CLEANUP-WORKER.md). Seit dem Aufbewahrungsupdate benötigt er dieselben Bindings `DB` und `PHOTOS` wie das Portal. Neben abgelaufenen Zugangsdaten entfernt er fällige Bilddateien neuer School-Galerien mit aktiver Aufbewahrungsregel; bestehende Galerien und Finanzbelege bleiben erhalten. Für den Dashboard-Editor die gebündelte Datei aus dem Updatepaket verwenden. Abgelaufene Sitzungen, Tokens und Galeriezugänge werden bei jeder zugehörigen Anfrage geprüft und auch ohne laufende Bereinigung abgewiesen.

[Cloudflare Pages: externe DNS und Subdomains](https://developers.cloudflare.com/pages/configuration/custom-domains/#add-a-custom-subdomain).

Nach der Aktivierung müssen Einrichtungslinks und Zahlungs-Rücksprünge dieselbe Portal-Origin verwenden. HTTPS wurde bestätigt; `integrate.cjs` verwendet den festen Live-Link in der passenden Sprache. Die Website-Adressen unter `/galerie/` leiten nur auf den öffentlichen Homepage-Hosts zur Portal-Subdomain weiter und erhalten vorhandene Linkparameter. Lokale Vorschau und Cloudflare bleiben auf ihrem jeweiligen Host.

## 3. E-Mail-Versand

Resend, die Absenderdomain, `EMAIL_FROM` und das Secret `EMAIL_API_KEY` sind bereits eingerichtet; die echte Zugangsmail wurde zugestellt. Keine bestehenden IONOS-MX-Einträge ersetzen. E-Mail-Versand erfolgt für Einladung mit Passwort-Einrichtung bei neuen Kunden, Passwort-Zurücksetzung, Bestellbestätigung und nach dem Update auch für Downloadfreigaben. Eine zuvor hochgeladene Rechnung wird der Bestellbestätigung angehängt.

Die konkreten Anbieter, Auftragsverarbeitung und Datenschutzangaben müssen zur Live-Konfiguration passen. Im Portal wird keine Werbeeinwilligung aus der Anmeldung abgeleitet.

## 4. Verwaltung erstmals einrichten

Die erste Administratorin lässt sich ohne Passwortübertragung über die bestehende Einrichtungs-E-Mail anlegen. Nur im privaten D1-Dashboard, bei noch nicht vorhandener Inhaberinnen-E-Mail:

```sql
INSERT INTO users (id,email,name,password_hash,role,disabled,created_at) VALUES (lower(hex(randomblob(16))),'info@liza-memories-photography.com','Emina',NULL,'admin',0,CAST(strftime('%s','now') AS INTEGER)*1000);
```

Die einmalige Zeile steht ohne Kommentar im Console-Eingabefeld. Vorhandene Benutzer werden nicht überschrieben: dieselbe E-Mail verursacht einen UNIQUE-Fehler. Danach auf der Portal-Subdomain **Zugang einrichten**, die Inhaberinnen-E-Mail eingeben und **Bestätigungslink senden** wählen. Der Link geht ausschließlich an das hinterlegte Postfach. Dort wird das eigene Passwort gesetzt. Der NULL-Hash erlaubt vorher keine Anmeldung; die Admin-Rolle bleibt beim Einrichten erhalten. Dieser Ablauf wurde für die Inhaberin bereits durchgeführt und darf für ihren bestehenden Zugang nicht wiederholt werden. Es gibt keine öffentliche Admin-Registrierung.

Als alternative Einrichtung bleibt der interaktive Helfer verfügbar. Aus `tools/customer-portal/backend` ausführen:

```text
node bootstrap-admin.mjs --email info@liza-memories-photography.com --name Emina --output ../.private/admin-bootstrap.sql
```

Der alternative Helfer fragt den identischen Server-Pepper und dein eigenes Passwort verdeckt ab; Geheimnisse nicht als Argument übergeben. Die private SQL-Datei einmalig in D1 importieren, danach löschen. Sie bleibt außerhalb der öffentlichen Galerie und außerhalb von Git. Danach mit E-Mail und Passwort im Portal anmelden.

## 5. Bezahlung aktivieren

**Zum Start ausschließlich Überweisung:** `PAYMENT_METHODS=transfer` beibehalten. Tatsächliche `BANK_RECIPIENT`, `BANK_IBAN` und optional `BANK_BIC` konfigurieren. Jede Bestellung zeigt Betrag und eindeutigen Verwendungszweck neben einem lokal erzeugten QR-Code. Freigabe erst nach geprüftem Zahlungseingang; es gibt keine Verbindung zum Bankkonto. Bereits bezahlte Shootings manuell in der Galerie freigeben.

Die tatsächlichen Bankdaten wurden bereits aus den Rechnungen der Inhaberin übernommen. Sie liegen lokal im echten Repository in der privaten, von Git ignorierten Datei `C:/Users/hurem/Documents/GitHub/mev9999.github.io/tools/customer-portal/.private/bank-config.env`. Diese Werte bei der Live-Einrichtung als Umgebungswerte `BANK_RECIPIENT`, `BANK_IBAN` und `BANK_BIC` im Cloudflare-Worker bzw. Pages-Projekt hinterlegen. Den Dateiinhalt nicht in Dokumentation, Chat, öffentliche Builds oder Git kopieren. Das öffentliche Paket liest diese private Datei nicht automatisch; die Cloudflare-Konfiguration muss gesondert erfolgen.

**Später optional Stripe:** erst nach ausdrücklicher Aktivierung über PAYMENT_METHODS=transfer,stripe. Zuerst Testmodus verwenden. `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` als Secrets hinterlegen und den Webhook auf die API-Route des Portals richten. Den vom Backend dokumentierten Endpoint verwenden. Checkout-Erfolg wird durch die geprüfte serverseitige Zahlungsbestätigung festgestellt, nicht durch einen URL-Parameter. Danach echten Geschäftszugang und Live-Secrets verbinden.

**Später optional PayPal:** erst nach ausdrücklicher Aktivierung über PAYMENT_METHODS=transfer,paypal. Business-Konto, App-Client-ID und Client-Secret verbinden. `PAYPAL_ENVIRONMENT` zunächst `sandbox`, später `live`. Der Server prüft den zugehörigen Bestellbetrag und die bestätigte Zahlung. Zahlungsarten erscheinen erst bei ausdrücklicher Aktivierung und vollständiger Konfiguration.

Digitale Checkout-Texte und Vertragsbestätigung vor Verkauf vollständig abgleichen. Insbesondere bei sofortiger Lieferung müssen Zustimmung, Kenntnisnahme und Bestätigung auf dauerhaftem Datenträger zusammenpassen. [WKO: Rücktritt bei Downloads](https://www.wko.at/internetrecht/ruecktrittsrecht-bei-downloads-b2c).

## 6. Echter Abnahmetest

Eine eigene Testgalerie mit nicht vertraulichen Bildern anlegen. Einladung an ein eigenes Postfach zustellen, Einrichtung und Reset testen, Zugriff eines zweiten Kontos verweigern, Favoriten prüfen, Testzahlungen inkl. Abbruch ausführen, Bestellbestätigung und ZIP-Download prüfen. Erst danach echte Kunden einladen. Regelmäßige Sicherung der Originale außerhalb von R2 vorsehen und die vereinbarten Galerie-Laufzeiten festlegen.
