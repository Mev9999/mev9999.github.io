# Gewinnspiel 01.10.–14.10.2026

## Private Teilnehmerliste
https://docs.google.com/spreadsheets/d/1IbP5murCkSfThFUa38PvIdXx-oyxZh2ffS7VnLIdsMk/edit

Die Liste bleibt auf „Eingeschränkt“. Nicht öffentlich teilen, nicht in die Website oder GitHub kopieren. Die Übersicht zählt die eingegangenen Zeilen. Status „Namensgleichheit prüfen“ ist ein Hinweis, kein Ausschlussgrund. E-Mail-Besitz und Identität sind beim Absenden nicht verifiziert.

## Gewinner manuell ermitteln
Nach dem 14.10.2026 die Teilnahmen prüfen und unter allen gültigen Personen zufällig ziehen, mit einem Zufallsgenerator anhand von Teilnahme-IDs. Werbung/Fotos/Newsletter dürfen die Auswahl nicht beeinflussen. Name und Alter der ausgelosten Person mit amtlichem Lichtbildausweis abgleichen, österreichischen Wohnsitz bei Bedarf gesondert prüfen. Keine Ausweiskopie oder Ausweisnummer speichern. Ergebnis und Datum privat dokumentieren. Bis 31.10. per E-Mail verständigen, 14 Tage Antwortfrist. Ziehung nur mit Teilnahme-IDs in der Instagram-Story zeigen; niemals die Teilnehmerliste filmen. Nach Prüfung die Gewinnerin oder den Gewinner in Story und auf der Gewinnspielseite bekannt geben. Bekanntgabe spätestens drei Monate nach Gewinnvergabe entfernen, kein dauerhaftes Story-Highlight. Gutschein drei Monate ab Ausstellung gültig, auch verschenkbar.

## Grenzen des Missbrauchsschutzes
Eintrag pro E-Mail; Gmail-Punkt-/Plusvarianten und googlemail.com werden zusammengeführt. Gleiche normalisierte Namen werden markiert. Bot-Feld, serverseitige Eingabeprüfung, Zeitraumprüfung, Sperre gegen parallele Doppel-Einträge und global 60 Anfragen/Minute ergänzen den Schutz. Keine Fingerprints und keine pauschale Sperre gemeinsamer IP-Adressen. Unabhängige Postfächer mit anderen erfundenen Identitäten sind so nicht sicher zu erkennen. Kein 100-%-Nachweis „eine Person“.

## Werbung und Löschung
Checkboxen protokollieren einen Erklärungsstand, beweisen aber nicht die Kontrolle über die E-Mail-Adresse. Vor Werbeversand die Anmeldung bestätigen lassen und einen geeigneten Versanddienst mit Abmeldung einsetzen. Noch kein Newsletterdienst oder automatischer E-Mail-Versand eingerichtet. Teilnehmerdaten spätestens drei Monate nach endgültiger Gewinnvergabe entsprechend Datenschutzhinweisen bereinigen; dokumentierte Werbeeinwilligungen getrennt verwalten. Einwilligungen auf Anfrage widerrufen, keine weitere Werbung senden.

## Technik
Backend.gs im bestehenden Apps-Script-Projekt speichern. Als Eigentümer ausführen; Web-App muss für Personen ohne Google-Konto erreichbar sein. Dies veröffentlicht nur die Formularannahme, nicht die Tabelle. Google-Kontoberechtigung und kontospezifische Vertragsgrundlagen für geschäftliche Datenverarbeitung prüfen. Kein Nachweis eines Auftragsverarbeitungsvertrags wurde hinterlegt.

Die Deployment-URL in source/gewinnspiel-config.json unter submissionEndpoint eintragen, status erst nach erfolgreichem Integrationstest auf ready setzen. Der serverseitige Zeitraum gilt unabhängig vom Browserdatum. Außerhalb des Zeitraums werden keine Einträge gespeichert. Ein Erfolgspopup setzt eine Antwort mit passender Vorgangs-ID aus der Google-JSON-Antwort voraus. Keine geheimen Schlüssel im Frontend.

Push/Deployment der Website führt Emina selbst durch. Web-App ist freigegeben. Google-Speicherung und Duplikatsperre mit synthetischen Daten im separaten Blatt Techniktest geprüft; HTTP-Anmeldung und Zeitraumantwort im Browser geprüft. Erfolgsdialog zusätzlich mit lokaler Testantwort geprüft. Echte Teilnahmen sind bis 01.10. serverseitig gesperrt.

Sprachfassungen: build.cjs erzeugt index.html, en.html und bs.html über localize.cjs. Deutsche Texte: source/index.html; Übersetzungen: translations.json; Formular-/Servermeldungen: runtime-translations.json. Header und Footer stammen aus den jeweiligen Startseiten. Prüfen: node tools/giveaway-page/test-localized.cjs. Der Teilen-Button nutzt die öffentliche kanonische Sprach-URL mit #mitmachen, auch in der lokalen Vorschau. Die Überschrift Bildnutzung enthält keinen Freiwilligkeitszusatz; die Erklärung und das optionale, nicht vorausgewählte Häkchen bleiben erhalten.

## Instagram ab Oktober
Pflichtfeld instagram; ein @ wird entfernt und der Name normalisiert. Gleiche Instagram-Namen werden zur Prüfung markiert, nicht als Eigentumsnachweis behandelt. Neue Spalten M:Q speichern Instagram-Name, Follow-/Kommentar-/Teilen-Prüfstatus und Prüfdatum. Standard ist ungeprüft. Keine Instagram-API angeschlossen; es gibt keine automatische Follow-Prüfung. Nur nach tatsächlicher Kontrolle bestätigen. Vorhandene Zeilen werden nicht umgedeutet. Backend.gs aktualisieren, aktualisiereInstagramSpalten ausführen und bestehende Bereitstellung als neue Version veröffentlichen. Alte Daten nicht löschen. Post-/Reel-Links in der Konfiguration ergänzen, sobald veröffentlicht.

Teilen: Story mit @liza.memories.photography; kein Screenshot erforderlich. Fehlende Benachrichtigung nicht als bestätigten Regelverstoß markieren. Bei Unklarheit Rückfrage. Social-Media-Grafiken mit alten Datumsangaben müssen vor Veröffentlichung ersetzt werden.
