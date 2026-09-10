# Datenschutz-Audit und Umsetzung

Stand: 10. September 2026. Untersucht wurden alle 36 HTML-Seiten, die verwendeten JavaScript- und CSS-Dateien, HTTP-Antworten der veröffentlichten Seiten und im Browser beobachtete Ressourcen. Die Bestandsaufnahme erfolgte vor den Änderungen; ihr Ergebnis wurde im Gespräch vor der Umsetzung ausgegeben. Die veröffentlichte Website enthielt teilweise einen älteren Stand als das lokale Repository.

## Bestand vor der Umsetzung

| Dienst/Technologie | Tatsächlicher Einsatz | Bewertung und Maßnahme |
| --- | --- | --- |
| Cloudflare Web Analytics | Aktiver Beacon auf den drei Startseiten. Im Browser wurden Beacon und RUM-XHR bereits beim Aufruf beobachtet. Der geprüfte Beacon verwendete Performance-APIs, aber keine Cookies, LocalStorage, SessionStorage oder IndexedDB. | Cookie-frei bestätigt. Die fehlende Cookie-Nutzung entscheidet jedoch nicht allein über TKG-Endgerätezugriffe. Wegen der optionalen Performance-Messung wird vorsorglich eine Statistik-Einwilligung vorgeschaltet. Dies ist keine Feststellung, dass jede Cloudflare-Web-Analytics-Installation zwingend ein Banner benötigt. |
| Google Fonts | Google-CSS und Verbindungen zu fonts.googleapis.com/fonts.gstatic.com auf 27 Inhaltsseiten; Schriftdateien wurden im Browser geladen. | Durch lokal gespeicherte identische Schriftfamilien ersetzt. Kein Google-Aufruf mehr für Schriften, keine eigene Consent-Kategorie nötig. OFL-Lizenzen liegen bei. |
| Videos | Eigene MP4-Datei und lokales Vorschaubild, native Wiedergabe, kein YouTube/Vimeo-Embed. | Keine Medien-Einwilligung für diesen Einsatz erforderlich. |
| Google Maps und Bewertungen | Normale Links zu maps.app.goo.gl; keine Karte, kein Bewertungswidget und kein Google-Skript eingebettet. | Kein Google-Inhalt beim Seitenaufruf geladen. Keine Kategorie „Externe Medien“. |
| Instagram / WhatsApp | Normale Links; Vorschaubilder und Symbole lokal. | Keine Social-Plugins, Pixel oder automatischen Social-Media-Verbindungen gefunden. |
| Formspree | Formular-POST an formspree.io/f/mojkkrob erst beim Absenden. Kein externes Formularskript und kein CAPTCHA-Embed. | Vom Besucher veranlasste Anfrageübermittlung; bleibt unabhängig von Statistik nutzbar. Verarbeitung und Anbieter in der Datenschutzerklärung beschrieben. |
| GitHub Pages | Hosting und technisch erforderliche Auslieferung. Keine Set-Cookie-Header in den 36 geprüften HTML-Antworten. | Kein optionaler Tracker im untersuchten Website-Code; Hosting dokumentiert. |
| Sprachwahl | LocalStorage-Schreibzugriffe auf lizaLanguage, aber keine Lesestelle. Navigation verwendet Sprach-URLs. | Überflüssige Schreibzugriffe entfernt. Bestehende alte Einträge werden nicht mehr verwendet; kein unnötiger automatischer Speicherzugriff zum Aufräumen. |
| Weitere Messung | Lokales CustomEvent liza:conversion ohne angeschlossenes Analytics-Ziel. | Keine Netzwerkübermittlung; keine neue Statistikplattform eingerichtet. |
| Sonstige Speicher / Tracker | Kein eigener document.cookie-, SessionStorage- oder IndexedDB-Einsatz, keine weiteren externen Laufzeitskripte gefunden. | Keine Marketing-Kategorie erfunden. |

Die Bestandsprüfung umfasst Quellcode, HTTP-Header und beobachtete Browser-Ressourcen. Ein vollständiger Export des Browser-Cookie-Speichers einschließlich HttpOnly-Cookies war über die Browser-Schnittstelle nicht möglich. Daher ist dies keine pauschale Aussage über sämtliche denkbaren Hosting-/Proxy-Konfigurationen.

## Entscheidung zum Banner

Nach dem lokalen Hosten der Fonts bleibt Cloudflare als optionale Messung. Es wird eine kleine eigene Lösung mit genau zwei Kategorien verwendet: **Notwendig** und **Statistik**. Die Statistik ist zunächst ausgeschaltet. Die vorsorgliche Entscheidung stützt sich auf den tatsächlichen Zugriff auf Browser-Performance-Informationen, nicht auf die falsche Annahme, Cloudflare setze Analytics-Cookies. Eine verbindliche behördliche Einstufung dieser konkreten Website wurde nicht behauptet.

Quellen zur Einordnung:

- [Cloudflare: Funktionsweise des RUM-Beacons und Datenschutz](https://developers.cloudflare.com/speed/observatory/rum-beacon/)
- [Cloudflare Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/)
- [Österreichische Datenschutzbehörde: Cookies und ähnliche Technologien](https://dsb.gv.at/faqs/datenschutz-cookies)
- [EDSA: Technischer Anwendungsbereich von Art. 5 Abs. 3 ePrivacy](https://www.edpb.europa.eu/documents/guideline/guidelines-22023-on-technical-scope-of-art-53-of-eprivacy-directive_en)
- [Formspree Datenschutzhinweise](https://formspree.io/legal/privacy-policy/)
- [GitHub Datenschutzerklärung](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)

## Umsetzung

- Alle 36 Seiten enthalten einen Footer-Button zum Öffnen der Einstellungen; DE, EN und BS sind übersetzt.
- Native modale Dialoge, Fokusbegrenzung und -rückgabe, Escape ohne neue Zustimmung, sichtbare Fokusmarkierung und scrollbar begrenzte Höhe.
- „Alle akzeptieren“ und „Nur notwendige“ besitzen dieselben Farben, Größen und Schriftwerte. Optionale Statistik ist nicht vorausgewählt.
- Cloudflare-Konfiguration ist zunächst inertes JSON. Erst eine gültige Zustimmung erzeugt das externe Script.
- Entscheidung: LocalStorage **lizaPrivacyConsent**, Version, boolesche Statistik-Auswahl, Ablaufdatum; **180 Tage**, ohne Besucherkennung. Fehlerhafte oder abgelaufene Werte erlauben keine Statistik.
- Änderungen werden zwischen Tabs berücksichtigt. Widerruf blockiert weitere Beacon-/XHR-/Fetch-Aufrufe, bricht laufende Analytics-XHRs ab und lädt die Seite neu, um bereits installierte Beobachter zu entfernen. Bereits übermittelte Daten können nicht zurückgerufen werden.
- Bei gesperrtem LocalStorage erscheint eine Fehlermeldung; die neue Entscheidung gilt nur für die aktuelle Seite.
- Keine externe Consent-Bibliothek und keine neue Analytics-Plattform. Keine echten Testanfragen an Formspree versendet.
- Datenschutzerklärung in allen drei Sprachen an den technischen Bestand angepasst.
- Der Build erhält diese Änderungen einschließlich der rechtlichen Seiten. Fontdateien und Lizenztexte befinden sich in `fonts/`.

## Testbericht

- `npm run site:build`: erfolgreich.
- `npm run site:check`: alle **36 HTML-Seiten** erfolgreich; einschließlich interner Links, bestehender Strukturprüfungen und Formularsimulationen.
- Neue automatisierte Consent-Tests: DE/EN/BS, Ausgangszustand ohne Statistik, Annahme, Ablehnung, gespeicherte Entscheidung, fehlerhafte/abgelaufene Auswahl, Widerruf, Tab-Synchronisierung und unbeeinträchtigte Formspree-Aufrufe.
- Browser: vor Zustimmung ausschließlich lokale Ressourcen beobachtet; Schriftdateien kommen vom lokalen Ursprung.
- Browser: nach ausdrücklicher Zustimmung Cloudflare-Script und RUM-XHR beobachtet; nach Widerruf und Neuladen keine externen Ressourcen beobachtet.
- Browser: gespeicherte Ablehnung beim Wechsel DE → EN berücksichtigt, BS-Dialog übersetzt, Footer auf Impressum funktionsfähig.
- Bei 320 × 740 Pixeln blieb der Einstellungsdialog innerhalb des Bildschirms (296 × 716 Pixel, eigener Scrollbereich). Auch 844 × 390 Pixel Querformat geprüft. Tab und Shift+Tab bleiben im Dialog; Escape schließt ohne Zustimmung.

## Grenzen und Betrieb

Der Bericht bestätigt die geprüfte technische Umsetzung, keine rechtliche Zertifizierung. Tatsächliche Anbieter-Verträge, Auftragsverarbeitung, internationale Übermittlungsgrundlagen und kontospezifische Löschfristen müssen zur betrieblichen Nutzung passen; sie lassen sich nicht allein aus diesem Repository bestätigen. Der echte Formspree-Empfang im Postfach wurde nicht getestet.

Nach dem Push muss die veröffentlichte Website erneut stichprobenartig geprüft werden, insbesondere falls der Hosting-Anbieter Analytics zusätzlich automatisch injiziert. Neue Embeds/Tracker dürfen nicht einfach als aktive Skripte oder Iframes ergänzt werden. Dann sind Kategorien, Datenschutzerklärung und Blockierung neu zu prüfen.
