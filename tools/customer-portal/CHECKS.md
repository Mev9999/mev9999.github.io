# Prüfstand des Kundenportals

## Verwaltungs- und Finaldatei-Update vom 12. Oktober 2026

**258 Tests im vollständigen Portal-Lauf bestanden**, keine Fehler, übersprungenen oder abgebrochenen Tests. Danach Website-Build, Website-Prüfung (39 HTML-Dateien), Portal-Prüfung, Pages-Bündelung, Vorlagen-Generierung und `git diff --check` erfolgreich. Kein Live-Deployment, keine echten E-Mails, Zahlungen, Bestelllöschungen oder Produktionsdatenänderungen. Keine gerenderte Browserabnahme dieser Ergänzung; die zuvor dokumentierte Browserbeschränkung bleibt bestehen.

Enthalten: Aktivitäten als gelesen mit Server-Zeitstand, doppelt bestätigte Testbestellungs-Löschung mit erhaltenen Nachweisen, gespeicherte Paket-Reihenfolge und optionaler Ablauf Auswahl → Zahlung → fertige Bilder. Bereits fertig bearbeitete Dateien können direkt beim Upload markiert werden; vorhandene Dateien können gesammelt mit Bestätigung als fertig gekennzeichnet werden. Bearbeitete Ersatzdateien werden über eindeutige ursprüngliche Dateinamen zugeordnet, bei Ausnahmen ausdrücklich manuell. Keine neue Galerie erforderlich.

Geprüft: 135 Dateien automatisch zuordnen und Upload nach Unterbrechung fortsetzen, unveränderte Originalbytes, Auth/CSRF/fremde oder doppelte IDs, all-or-nothing Sammelkennzeichnung, Zahlung vor/nach Fertigstellung, ausschließlich vollständiger finaler Bestellsatz freigegeben, übrige Fotos geschützt, manuelle Sperren erhalten, Belege/Preise/Favoriten erhalten. Überlappende Bestellungen und wiederholte Zahlung/Uploads erzeugen keine doppelte Bestell-Downloadmail. Konkurrierende Datei-/Vorschau-Ersetzung kann kein altes Auswahloriginal freigeben oder eine fertige Vorschau überschreiben. Verlorene Upload-Antworten lassen sich durch Wiederholung oder Benachrichtigungs-Retry ohne Cron reparieren. Sammelkennzeichnung von 135 Bildern und Listen mit 60 Bestellungen bleiben in den Tests unter 50 D1-Abfragen pro Anfrage.

Neue Vertragsbestätigungen und E-Mails erläutern bei Auswahlgalerien die Fertigstellung vor Download; historische gespeicherte Vertrags-/Mailsnapshots bleiben erhalten. Lokale Vorschau umfasst 15 Ansichten mit erfundenen Daten und deaktivierten Links.

Übergabe: `LiZa-Portal-Cloudflare-Verwaltung-Fertige-Bilder.zip` (identisch mit der aktuellen `LiZa-Portal-Cloudflare.zip`), 43 Dateien, 604556 Bytes, SHA-256 `6abde8c5884f1c0766da4a7cfa57ddf0b680d21ef9058fae55caad40ec339eaf`. Alle ZIP-Inhalte bytegenau gegen die vollständige Build-Ausgabe geprüft, keine Tests, Datenbankexporte, private Dateien oder Zugangsdaten enthalten.

`LiZa-Portal-Datenbank-Update-Verwaltung.txt`: zehn reine SQL-Anweisungen ohne Kommentare/Zeilenumbrüche, SHA-256 `3e6c7acbf7c6964e708e89aab44ad48281cad5bd58d363fd6dc277cb86008854`. Kombiniert ausschließlich die beiden neuen Migrationen `admin-management` und `final-delivery`. Die tatsächliche Übergabedatei zusätzlich gegen eine lokale Vorgängerdatenbank ausgeführt: bestehende Galerie, Preise und Bestellbestätigung erhalten. **Diese neue Datenbankdatei einmal zuerst ausführen, dann die neue ZIP veröffentlichen.** Ältere bereits ausgeführte Migrationen nicht wiederholen. Anleitung: `UPGRADE-2026-10-12-verwaltung.txt` / Übergabe `LiZa-Portal-Update-Anleitung.txt`. Veröffentlichung durch den Benutzer steht noch aus.

## Korrektur vom 12. Oktober: Großschreibung der Dokumentüberschriften

Die reine CSS-Kleinschreibung wurde entfernt. Überschriften verwenden wieder die im unveränderten Vertragstext gespeicherten Großbuchstaben, einschließlich ERKLÄRUNG, BEREITSTELLUNG und MUSTER-RÜCKTRITTSFORMULAR. Keine Rechts-, Preis-, Schutz- oder Datenbanklogik geändert. Vorschau aus den produktiven Vorlagen neu erzeugt.

25 bestehende Tests für E-Mail-Vorlagen, gestaltete Dokumente und Worker-Bündelung bestanden. Website-Build, Website-Prüfung (39 HTML-Dateien), Portal-Prüfung und Pages-Bündelung erfolgreich. Die umfassenden 211 Tests des unmittelbar vorherigen Standes gelten weiter als dessen Prüfnachweis; für diese CSS-Korrektur wurde gezielt geprüft. Kein echter E-Mail-Versand und kein Live-Deployment. Keine erneute gerenderte Browserprüfung; die frühere Browserbeschränkung bleibt bestehen.

Neue Übergabe: `LiZa-Portal-Cloudflare-2026-10-12-korrigiert.zip` (und identische aktuelle `LiZa-Portal-Cloudflare.zip`), 43 Dateien, 589309 Bytes, SHA-256 `c560834148950f9f059dda620221be4aaa1b33337681e9f4e55d43aba471b078`. Alle ZIP-Einträge bytegenau geprüft; gegenüber der vorherigen ZIP ausschließlich `_worker.js` verändert. Datenbankdatei unverändert: SHA-256 `a851e8befe7d65d1f98a0c519cb8802ba2c0d688caf71fde089930ba73eb040b`; vor der ZIP einmal einspielen, falls wie vom Benutzer angegeben noch nicht ausgeführt.

## Aktueller Nachtrag 12. Oktober: Galerielöschung, Pflichtpakete und gestaltete Bestätigungen

**211 Tests im vollständigen Portal-Lauf bestanden**, ohne fehlgeschlagene oder übersprungene Tests. Anschließend Website-Build, Website-Prüfung (39 HTML-Dateien), Portal-Prüfung, Worker-Bündelung und `git diff --check` erfolgreich.

Geprüft sind Galerielöschung mit zwei Bestätigungen und exaktem Namen, Authentifizierung/CSRF, atomare Datenbankänderungen, gesperrte Altlinks, erhaltene Bestell- und Rechnungsnachweise, vollständige Bildspeicher-Löschung mit Wiederholung nach Fehlern sowie gleichzeitige Uploads, Vorschauerzeugung und Zahlungsbestätigung. Verpflichtende Pakete werden einmal pro Kundenzugang berechnet; zusätzliche Bilder verwenden die günstigste genaue Kombination der übrigen Angebote. Geprüft sind Mehrfach-/Parallelbestellungen, bestätigte Zahlung, unveränderte historische Preise, alleinige serverseitige Preisberechnung und Stornierung einer unbezahlten Überweisungsbestellung für eine neue Auswahl.

Rücktritts-Eingangsbestätigungen und herunterladbare Bestellbestätigungen tragen das LiZa-Design. Gespeicherter Vertragstext bleibt unverändert. Neue Bestellmails enthalten die gestaltete HTML-Datei; sie kann im Browser gedruckt oder als PDF gespeichert werden. Vorhandene gespeicherte E-Mail-Snapshots werden nicht umgeschrieben. Die beigefügte Vorschau enthält zehn Vorlagen mit ausschließlich erfundenen Testdaten und deaktivierten Links.

**Keine gerenderte Browserabnahme dieses Nachtrags:** Die automatische Browser-Sicherheitsprüfung blockierte das Öffnen der lokalen Vorschau. Es wurde kein alternativer Zugriff versucht. Die genannten Prüfungen sind funktionale und strukturelle Tests; die Vorschau wird zur eigenen Ansicht mitgeliefert. Kein physisches Handy getestet.

Übergabe: `LiZa-Portal-Cloudflare.zip`, 43 Einträge, 589,340 Bytes; alle ZIP-Einträge bytegenau gegen die finale Build-Ausgabe geprüft. SHA-256: `79d505b8f49ddc03900800f9ff309ac6df7ea57fc24a185596d5d1b64f7f8001`. Datenbankdatei: `LiZa-Portal-Datenbank-Update-2026-10-12.txt`, sechs reine SQL-Anweisungen ohne Kommentare; SHA-256: `a851e8befe7d65d1f98a0c519cb8802ba2c0d688caf71fde089930ba73eb040b`.

**Zuerst die neue Datenbankdatei einmal ausführen, danach die neue ZIP in Production veröffentlichen.** Ältere Migrationen nicht erneut ausführen. Anleitung: `UPGRADE-2026-10-12.txt`. Keine Produktionsdaten geändert, keine echte Galerie gelöscht und keine echten E-Mails oder Zahlungen ausgelöst. Veröffentlichung und Live-Migration dieses Nachtrags stehen noch aus.

## Aktueller Nachtrag 11. Oktober: Freigaben und Wasserzeichen pro Bild

**167 Tests im vollständigen Portal-Lauf bestanden**, darunter sieben neue Backend-Tests und insgesamt 49 Oberflächentests. Nach einer letzten Korrektur der Button-Aktivierung beim Wiederherstellen einer vorhandenen Bild-/Kundenauswahl wurden alle 49 Oberflächentests nochmals erfolgreich ausgeführt. Geprüft: kundenspezifische Sperren für einzelne und alle Bilder, Original-GET/HEAD, erneute Freigabe, unveränderte bezahlte Bestellungen, verhinderte doppelte Benachrichtigungen, abgesagte noch offene Benachrichtigungen, Rechte/CSRF/ungültige Zuordnungen, additive Migration ohne Datenverlust und Erkennung durch einen warmen Worker.

Ein ausdrücklicher Test bestellt acht Bilder: die neue Zahlung hebt deren Sperren auf, liefert für genau diese Bilder unveränderte Originalbytes und saubere Vorschauen und verschickt eine Download-Benachrichtigung. Eine danach manuell gesetzte Sperre bleibt bei wiederholter Zahlungsbestätigung erhalten. Wasserzeichen-Ausnahmen überschreiben die Galerie-Vorgabe; ausgeschaltete Wasserzeichen erteilen keine Downloadrechte. Fehlende/veraltete Vorschauen bleiben geschützt. Die Oberfläche erstellt die Vorschau vor dem Aktivieren einer Ausnahme und erhält bei Fehlern die alte Einstellung.

Gerenderte lokale Prüfung: Einzelbild-Dialog bei Handybreite 390 px ohne horizontalen Überlauf; „Ohne Wasserzeichen“ gespeichert und durch erneutes Öffnen verifiziert. Auch die Freigabesteuerung bleibt nach dem Speichern bei erhaltener Auswahl aktiv. Desktop-Dialog geprüft. Die separate Browserprüfung der Rücknahme-Bestätigung wurde durch eine Zeitüberschreitung des Browserwerkzeugs unterbrochen; Rücknahme, Abbrechen und erneute Freigabe sind durch UI- und Backendtests abgedeckt, aber nicht als vollständiger gerenderter Browserablauf bestätigt. Kein physisches Handy getestet.

Die gemeinsame ZIP enthält auch das Paket-Update. **Für diesen Nachtrag ist die neue Migration `2026-10-11-image-controls.sql` erforderlich**, bevor die ZIP veröffentlicht wird. Ältere Aussagen „keine Migration“ betreffen nur das vorherige Paket-Update. Aktuelle Anleitung: `UPGRADE-2026-10-11.md`. Keine Produktionsänderung und kein echter E-Mail-Versand.


## Vorheriger Prüfstand 11. Oktober: günstigste Paketkombination

**153 Tests im vollständigen Portal-Lauf bestanden**, darunter 42 Oberflächentests. Website-Build, Website-Prüfung (39 HTML-Dateien), Portal-Prüfung und Erstellung des Pages-Pakets erfolgreich. Die Berechnung vergleicht genaue Kombinationen der aktiven Galerieangebote; sie berücksichtigt mehrere Paketgrößen und Einzelbilder, statt nur das größte Paket zuerst zu nehmen. Bei 15 € pro Bild, 60 € für fünf und 100 € für zehn Bilder ergeben sich 7 Bilder = 90 €, 12 Bilder = 130 € und 15 Bilder = 160 €.

Geprüft sind außerdem sichtbare, deaktivierte Angebote mit fehlenden Voraussetzungen, die ausdrückliche Auswahl aller Bilder für Gesamtpakete, unmögliche Kombinationen ohne Einzelpreis, fremde/inaktive Angebote, Preisgrenzen, unveränderte gespeicherte Bestellungen, Wiederholungen und parallele Bestellungen. Der Server berechnet neu; ein inzwischen geänderter Gesamtpreis verhindert die neue Bestellung. Paketwechsel während einer laufenden Anfrage erlauben keine zweite Übermittlung.

Gerenderte Browserprüfung mit lokalen synthetischen Testdaten: Desktop bei 1280 Pixeln sowie Handybreiten 390 und 320 Pixel. Kein horizontaler Überlauf der Seite, des Dialogs oder der Paketkarten. Ausgegraute Angebote und Bedingungen sichtbar; Wechsel eines Radiobuttons aktualisiert die Zusammenstellung. Die Summen für 7, 12 und 15 Bilder wurden in der gerenderten Oberfläche bestätigt. Prüfbild: `LiZa-Portal-Pakete-Vorschau.jpg` im Desktop-Ausgabeordner. Kein Test auf einem physischen Handy.

Für dieses Update ist **keine neue Datenbankmigration** nötig. Die Ergänzung `appearance_json` vom 9. Oktober wurde vom Nutzer per erfolgreichem Konsolen-Screenshot bestätigt. Die neue ZIP muss noch in Production hochgeladen werden; es wurden keine echten Bestellungen, Zahlungen oder E-Mails ausgelöst. Aktuelle Anleitung: `UPGRADE-2026-10-11.md`.

## Historischer Prüfstand 9. Oktober: Galeriegestaltung und Handy-Auswahlleiste

**136 Tests im vollständigen Portal-Lauf bestanden.** Build, Website-Prüfung und Portal-Prüfung ebenfalls erfolgreich. Die neuen Prüfungen decken die erweiterten Gestaltungseinstellungen, deren Validierung und Speicherung, die additive Datenbankmigration sowie die unabhängigen Desktop-/Handywerte ab. Enthalten sind 15 Farbpaletten, 8 Coverlayouts und 8 Akzente einschließlich „Keiner“. Desktopbilder verwenden standardmäßig `contain` („Ganzes Foto“); mobile Höhe und Bildanpassung sind separat konfigurierbar. Die Auswahlleiste verwendet die kurzen sichtbaren Beschriftungen „Leeren“, „Download“ und „Bestellen“ mit vollständigen zugänglichen Beschriftungen.

Gerenderte lokale Browserprüfung mit synthetischen Testdaten:

- Kundenansicht bei 320, 390 und 430 Pixeln: keine horizontale Überbreite; alle drei Auswahlbuttons 46 Pixel hoch, Texte und Symbole zentriert, keine Wortzerlegung. Zusätzlich englische und bosnische Auswahlbuttons bei 320 Pixeln mit demselben Ergebnis geprüft.
- Alle acht Coverlayouts bei 1280 Pixeln mit `contain`: keine horizontale Überbreite. Das minimale Cover zeigt den Titel über dem Bild; die entsprechende Korrektur ist enthalten.
- Desktopansicht bei 1920 Pixeln, Cover `editorial` und `contain`: ganze Testfigur und alle vier Eckmarkierungen sichtbar, keine horizontale Überbreite.
- Private reproduzierbare Vorschauseiten unter `.private/design-preview/` verwenden die echten Portal-Renderfunktionen, Portal- und Homepage-CSS sowie lokale Fonts. Sie enthalten ausschließlich synthetische Testbilder und Testdaten und gehören nicht zum öffentlichen Pages-Paket.
- Die Farbpaletten wurden zusätzlich unabhängig auf Text-/Flächenkontraste geprüft; in den geprüften Standardkombinationen mindestens 5,10:1.

Das fertige **LiZa-Portal-Cloudflare.zip** enthält 43 Dateien und ist 548.094 Bytes groß. SHA-256: `bee86bb3ee46a28eeff7e1c7b3c19b9d528a8a7f8c6a3c6a4466ad55c291cb26`. Lokale Screenshots liegen als **LiZa-Portal-Handy-Vorschau.jpg** und **LiZa-Portal-Design-Vorschau.jpg** im Übergabeordner auf dem Desktop; sie sind keine Produktionsansichten und kein Bestandteil des Pages-Pakets.

Keine echten Kunden-E-Mails, keine Produktionsdatenänderung und keine Prüfung auf einem physischen Handy. Das neue Live-Deployment und die neue Produktionsmigration sind noch nicht bestätigt. Die gerenderten Prüfungen oben ersetzen die früheren Browserbeschränkungen nur für die hier genannten lokalen Ansichten.

**Veröffentlichungsreihenfolge:** Zuerst den Inhalt der neuen **LiZa-Portal-Datenbank-Update-Galeriegestaltung.txt** einmal in **Cloudflare → D1 SQLite Database → liza-customer-portal → Console** ausführen. Danach die neueste **LiZa-Portal-Cloudflare.zip** unter **Workers & Pages → liza-kundenportal → Create deployment → Production** hochladen. Die Erweiterung ergänzt nur `galleries.appearance_json`; die früher bereits ausgeführten SQL-Migrationen nicht wiederholen. Die folgenden Aussagen „keine Datenbankmigration“ sind historische Ergebnisse der damaligen Nachträge und gelten nicht für dieses aktuelle Update.

## Historischer Nachtrag 9. Oktober: Admin-Wasserzeichenvorschau

128 Tests im vollständigen Portal-Lauf bestanden, darunter 30 Oberflächentests. Neu geprüft: tatsächliche geschützte Bild-URLs in Admin-Kacheln, Bilddialog, Bibliothek und Designvorschau; saubere Originaldownload-URLs; fehlende Vorschauen mit Aktualisierungshinweis und weiter sichtbaren Admin-Bildern; deaktivierte Galerie-Wasserzeichen und ungespeicherte Änderungen. Zwei neue Backend-Tests prüfen die echte Auslieferung geschützter Bytes, fehlende/veraltete Versionen, Galerie-Modi, Admin-Kundenansicht und unveränderte Kundenrechte. Vollständiger Site-Build, Site-Prüfung (39 HTML-Dateien) und Portal-Prüfung bestanden. Alle 43 ZIP-Einträge bytegenau gegen die Build-Ausgabe geprüft; gegenüber dem vorherigen Paket ändern sich `portal.js`, `portal.css`, `translations.js` und `_worker.js`.

Damals keine echten E-Mails oder Produktionsdaten verändert und keine neue gerenderte Browserprüfung. Dieser damalige Nachtrag benötigte keine Datenbankmigration; seine Veröffentlichung stand zum damaligen Prüfzeitpunkt noch aus.

## Historischer Nachtrag 9. Oktober: Kundenübersicht

Gleiche 35-px-Überschriften, 16-px-Begleittexte und drei umschaltbare Übersichten (große Kacheln, kleine Kacheln, Liste). 27 UI-Tests bestanden, einschließlich Ansichtswechsel ohne neue API-Anfragen/Fokusverlust, Rückkehr aus der Galerie, gespeicherter bzw. ungültiger Wahl und blockiertem Browserspeicher. Vollständiger Site-Build, Site-Prüfung (39 HTML-Dateien) und Portal-Prüfung bestanden. CSS-Kaskade und mobile Regeln zusätzlich unabhängig statisch geprüft; damals keine neue gerenderte Browserprüfung. ZIP-Einträge gegen die damalige Build-Ausgabe validiert; gegenüber dem zuvor veröffentlichten Paket nur drei geänderte öffentliche Frontend-Dateien, Backend identisch. Dieses damalige Folgepaket brauchte keine Datenbankmigration; seine Veröffentlichung stand zum damaligen Prüfzeitpunkt noch aus.

Historischer Prüfstand: 8. Oktober 2026. Lokale Prüfungen und damals tatsächlich bestätigte Live-Ergebnisse sind unten getrennt dokumentiert. Die Inhaberin hat Anmeldung, Bestellung, Zahlungsbestätigung, Freigabe und Download erfolgreich ausprobiert. Die damalige Datenbank-Erweiterung und das Production-Deployment wurden anschließend per Screenshot bestätigt; das live ausgelieferte Portal-JavaScript stimmte mit dem damaligen Paket überein. Diese Ergebnisse bestätigen nicht die Veröffentlichung des aktuellen Galeriegestaltungs-Updates.

## Automatische Prüfung

- 86 Tests bestanden: 47 Worker-Tests, 14 E-Mail-Vorlagen-Tests, 13 UI-Tests mit JSDOM, 2 Tests der lokalen Datenbank-Erweiterung, 1 Test des eigenständigen Pages-Pakets, 2 Tests des lokalen Adapters, 3 Bank-QR-Tests und 4 Tests des Bereinigungs-Workers. Die bestehende Bereinigungs-Testfixture wurde an die zusätzliche Token-Spalte angepasst; die Bereinigung selbst blieb unverändert.
- Build und Website-Prüfung des tatsächlichen Website-Repositories bestanden; 39 HTML-Dateien wurden geprüft.
- Die Sicherheitsprüfung ergab keinen konkreten blockierenden Befund.
- Ein unabhängiger Decode mit `jsQR` bestätigte den EPC-QR-Inhalt einschließlich UTF-8, 25 EUR und Verwendungszweck.
- Die IBAN aus den tatsächlichen Rechnungen bestand die Prüfsummenvalidierung. Die Bankdaten stehen ausschließlich in der privaten Konfiguration und werden hier nicht wiedergegeben.
- Kundenfavoriten werden nur für aktive Galerie-Mitglieder im Verwaltungszugang zurückgegeben; Kunden und Kundenvorschau enthalten keine fremden Favoriten oder Kontakte.
- Der kombinierte Einrichtungs-/Einladungslink ist einmalig, gilt 30 Minuten und führt nur in eine weiterhin zugängliche veröffentlichte Galerie.
- Rechnungen sind kundenbezogen und privat. Die PDF wird ausschließlich der Bestellbestätigung angehängt; späterer Upload oder Ersatz verändert keine frühere Bestellbestätigung. Die Download-Freigabemail enthält keine Rechnung.
- Fehlgeschlagene oder unklar bestätigte E-Mail-Versuche verwenden dieselbe gespeicherte Nachricht und dieselben Anhänge. Zahlung und Freigabe bleiben bei Versandfehlern gespeichert. Parallele Freigaben, Rechnungsaustausch, Löschung und Snapshot-Schreibfehler wurden geprüft.
- Die additive Datenbank-Erweiterung erhält bestehende Nutzer, Passwörter und Galerien. Wiederholte Starts der lokalen Vorschau ändern die Daten nicht. Die Produktionsmigration wird ausdrücklich einmal ausgeführt.

## Browserprüfung

- Kunden- und Verwaltungsanmeldung geprüft.
- Favoriten nach erneutem Laden erhalten; Lightbox-Wechsel zum nächsten Bild geprüft.
- Upload mit getrenntem Vorschaubild und Original geprüft.
- Individuellen Preis von 189 EUR und Bestellung der ganzen Galerie geprüft.
- Testbestellung abgesendet: Bestätigung mit Bankverbindung, korrektem Betrag, eindeutiger Bestellnummer und sichtbarem EPC-QR-Code erschienen.
- Originaldownload und ZIP-Download im Browser erfolgreich. Das ZIP enthält zwei Originaldateien; eine unabhängige Prüfung mit .NET `ZipFile` bestätigte beide Originalnamen und die passenden Dateigrößen in Bytes.
- Darstellung bei einer mobilen Breite von 390 Pixeln und einer Desktop-Breite von 1.440 Pixeln geprüft.

Die lokale Testumgebung verwendet eine ausdrücklich gekennzeichnete Testbankverbindung und einen lokalen Mail-Eingang; sie versendet keine echten E-Mails. Die ursprüngliche Browserprüfung ist oben dokumentiert. Für dieses Update wurden Cover, Formularabläufe und die mobile Umbruchstruktur mit JSDOM/CSS-Prüfungen kontrolliert; eine gerenderte Browserprüfung der aktuellen mobilen Bestellkarte war wegen verweigerter Browserberechtigung nicht möglich. Dafür wird eine lokale Vorschau bereitgestellt. Die E-Mail-Vorschau ist eine HTML-Datei mit erfundenen Daten; sie ersetzt keinen Test in echten E-Mail-Programmen.

## Bestätigte Live-Ergebnisse

- `https://portal.liza-memories-photography.com/` ist mit gültigem HTTPS erreichbar; der CNAME zeigt auf `liza-kundenportal.pages.dev`.
- Nach dem Production-Deployment meldet die API `configured=true`, `email=true` und `transferConfigured=true`. Stripe und PayPal bleiben deaktiviert. Diese Konfigurationsprüfung ersetzt keinen Bild-Upload oder vollständigen Bestelltest.
- Der D1-Schemaimport wurde im Dashboard mit 14 Anwendungstabellen bestätigt. Die Bindings `DB` und `PHOTOS` sind per Screenshot belegt; der R2-Bucket trägt die EU-Jurisdiction.
- Die Inhaberin hat die echte Einrichtungsmail sofort erhalten, das Passwort gesetzt und sich angemeldet. Der sichtbare Button „Verwaltung“ bestätigt ihren Admin-Zugang. Der Mail-Versand und die authentifizierte Datenbankabfrage der Galerieübersicht wurden damit tatsächlich durchlaufen.
- Anschließend bestätigte die Inhaberin die erfolgreiche Bestellung, Zahlungsbestätigung, Downloadfreigabe und Downloads. Kundenfavoriten werden bei ihr gespeichert; ihre bisher fehlende Anzeige in der Verwaltung wird in diesem Update ergänzt. Dieser Rückmeldetest ersetzt keine gezielte Prüfung eines unberechtigten zweiten Kontos.
- Anonyme Live-Aufrufe von `/api/galleries` und `/api/admin/galleries` liefern HTTP 401. Die API auf dem alternativen `liza-kundenportal.pages.dev`-Host liefert HTTP 403; nur die konfigurierte Portal-Origin wird akzeptiert. Die kontenübergreifende Prüfung einer konkreten Testgalerie steht weiterhin aus.

- Das Update mit Kundenfavoriten, Rechnungsfeld, Bestellanhang, Coveroptionen und mobiler Kartenkorrektur ist veröffentlicht. Der D1-Migrationslauf meldet „successfully executed“, das Pages-Deployment „Success“. HTTPS und die neuen öffentlichen Portal-Assets wurden geprüft. Ein echter Rechnungsanhang und die neue Freigabe-Mail wurden nach diesem Update noch nicht im Kundenpostfach geprüft.

## Grenzen und offene Live-Schritte

- Einzelne Bildauswahlen sind auf 500 Bilder begrenzt. Bestellungen und Freigaben der ganzen Galerie unterstützen bis zu 5.000 Bilder.
- ZIP-Downloads im Browser haben eine Grenze von 300 MB pro Paket; größere Downloads müssen in kleinere Pakete aufgeteilt werden.
- Nach dem neuen Deployment: kombinierte Einladung, Kundenfavoriten in der Verwaltung, Rechnung in der Bestell-E-Mail, separate Download-Mail und mobile Bestellkarte prüfen. Eine gezielte Live-Prüfung von Passwort-Reset und fremdem Kundenzugriff steht weiterhin aus; entsprechende lokale Zugriffstests bestehen.
- „Fail closed“ wurde angewiesen; die gespeicherte Cloudflare-Einstellung wurde bislang nicht gesondert bestätigt.
- Der Pages-Bereinigungs-Worker ist vorbereitet und lokal geprüft. Seine Cloudflare-Bindung, Cron-Konfiguration und erste erfolgreiche Ausführung sind noch nicht bestätigt. Ablaufgrenzen werden unabhängig davon bei jeder zugehörigen Anfrage durchgesetzt.
- Die aktualisierten Datenschutztexte und Portal-Verlinkungen müssen mit dem nächsten jeweiligen Deployment bzw. Homepage-Push veröffentlicht werden.

Die Einrichtungsanleitung steht in [LIVE-EINRICHTUNG.md](LIVE-EINRICHTUNG.md).


## Update 9. Oktober 2026

120 Tests erfolgreich: kompletter Portal-Lauf mit 117 Tests sowie der anschließend ergänzte Favoriten-Ratenbegrenzungstest und zwei echte Initialisierungs-/Migrationstests. Betroffene Sicherheits- und Migrationssuiten anschließend erfolgreich. Einschließlich 24 Oberflächenaktionen/CSS-Integrationstests, 19 Mailtests, 7 unabhängigen Sicherheitsprüfungen und 5 Bereinigungsprüfungen. Vollständiger Site-Build, Site-Prüfung (39 HTML-Seiten) und Portal-Prüfung erfolgreich.

Die Prüfung deckt insbesondere den realen Checkbox-Konflikt mit Homepage-CSS, zugriffsgeschützte Wasserzeichenvorschauen, veraltete Vorschauen ohne ungeschützten Fallback, Rechnungsbesitz pro Bestellung, eingefrorene Anhänge, kurze Referenzen, Paid-zu-Freigabe-Mail, Aktivitätspaginierung und CSRF ab. Header/Footer verwenden identische gemeinsame CSS-Dateien; die abweichenden Portal-Shell-Regeln wurden entfernt. Der PNG-Mail-Logopfad ist im neuen Paket vorhanden. Pages-Assets erhalten CSP und weitere Header getrennt von API-Antworten.

Nur lokale Testdaten; keine echten E-Mails oder Produktionsänderungen. Die Browser-URL-Richtlinie blockierte die gerenderte Prüfung der geöffneten file://-Vorschau. Kein alternativer Browserzugriff zur Umgehung verwendet. Mobile Browser und echte Mailclients sind daher nach Deployment noch visuell abzunehmen.

Der erneute Start mit der tatsächlich vorhandenen lokalen Datenbank deckte zusätzlich die Reihenfolge neuer Indizes und Migrationen auf. Der gemeinsame Initialisierer migriert bestehende Spalten jetzt vor dem Anlegen der Indizes. Der lokale Server läuft auf 127.0.0.1:8791; HTTP-Portal, Testanmeldung, geschützte Einstellungen und Bildbibliothek geprüft. Kein echter Versand, keine Kundendaten verändert.

### Veröffentlichung bestätigt — 9. Oktober 2026, 12:43 UTC

- Nutzer-Screenshot: Das ausgeführte SQL stimmt mit `2026-10-09-portal-studio.sql` überein; D1 meldet erfolgreiche Ausführung. Pages meldet erfolgreiches Deployment für `liza-kundenportal`.
- Alle 40 öffentlichen Dateien des vorbereiteten Pages-Pakets liefern unter `https://portal.liza-memories-photography.com/` HTTP 200 und identische SHA-256-Prüfsummen. Enthalten sind DE/EN/BS, Portalcode, gemeinsame Header-/Footer-Assets, Rechtstexte und PNG-Logo.
- CSP, HSTS, Frame-Sperre, No-Sniff, Referrer-Policy, Permissions-Policy und Noindex werden live ausgeliefert.
- Anonyme Sitzung: HTTP 200 mit `user=null`. Einstellungen, Bildbibliothek, Aktivitäten, Bestellungen, Galerien und ein Originalbild-Endpunkt: jeweils HTTP 401 und `private, no-store`.
- Es wurden keine Produktionsdaten geändert und keine E-Mails ausgelöst. Diese öffentliche Prüfung bestätigt weder die vollständige D1-Struktur durch einen authentifizierten Abruf noch den neuen Kundenablauf oder die gerenderte mobile Darstellung. Dafür bleibt der gezielte Test aus der Update-Anleitung offen.
