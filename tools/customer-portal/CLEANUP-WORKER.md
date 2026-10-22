# Automatische Bereinigung bei Cloudflare Pages

Das Pages-Portal benötigt einen separaten Worker für geplante Bereinigung. Der aktuelle Worker entfernt abgelaufene Sitzungen, Setup-/Reset-Tokens, alte Rate-Limits und Aktivitäten. Seit dem Update vom 22. Oktober 2026 bereinigt er außerdem die Portalbilder **neu angelegter Galerien mit der Aufbewahrungsregel `school-v1`**. Alte Galerien werden nicht rückwirkend einbezogen. Rechnungen und Vertrags-/Zahlungsunterlagen werden nicht aus dem Bildspeicher entfernt.

Die vollständigen Schritte und die Bedeutung der Fristen stehen in [der Update-Anleitung](UPGRADE-2026-10-22-Aufbewahrung.txt).

## Einrichtung

1. Die Migration `backend/migrations/2026-10-22-school-retention.sql` einmal in der bestehenden D1-Datenbank ausführen und das aktualisierte Portal veröffentlichen.
2. Den bestehenden Bereinigungs-Worker aktualisieren. Für den Dashboard-Editor die **gebündelte Datei `03-Bereinigungs-Worker.js` aus dem Updatepaket** verwenden. `backend/cleanup-worker.mjs` importiert Hilfsfunktionen und ist deshalb nicht mehr alleine kopierbar. Bei Wrangler das Projekt mit `backend/wrangler.cleanup.jsonc` verwenden und den dortigen Workernamen gegebenenfalls an den bereits eingerichteten Worker anpassen.
3. Bindings `DB` für die bestehende Portal-Datenbank und **`PHOTOS` für denselben privaten R2-Bucket wie beim Portal** verbinden. Die R2-EU-Jurisdiktion beibehalten. Der Dienst braucht keine E-Mail-Secrets und keine öffentliche Route. [R2-Bindings](https://developers.cloudflare.com/r2/api/workers/workers-api-usage/)
4. Den bisherigen täglichen Cron durch `17 * * * *` ersetzen. Damit läuft der Dienst jede Stunde zur Minute 17 und arbeitet fällige Dateien in begrenzten Chargen ab. Das Löschfenster beginnt nach Ende des 90-tägigen Galeriezugangs; 30 weitere Tage bilden die obere Frist, nicht den ersten Start der Bereinigung. Änderungen an Cron-Einstellungen können bis zu 15 Minuten benötigen. [Cloudflare Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
5. Nach dem ersten geplanten Lauf das Ergebnis in Cloudflare prüfen. Ein HTTP-Aufruf bleibt `404` und startet keine Bereinigung. Fehlende Bindings und fehlgeschlagene Dateilöschungen müssen als Fehler sichtbar sein; der nächste geplante Lauf wiederholt offene Dateilöschungen.

## Grenzen

Der Beginn ist die erste Veröffentlichung, nicht die Erstellung des Entwurfs. Ein erneutes Veröffentlichen verschiebt ihn nicht. Nach 90 Tagen endet der Kundenzugang auch ohne Cron. Ungekaufte Portalbilder werden innerhalb der folgenden 30 Tage entfernt. Für bezahlte, fertig bereitgestellte Dateien und manuelle Freigaben gilt die jeweilige sechsmonatige Speicherfrist. Gemeinsame Bilddateien bleiben bis zum Ende der letzten noch laufenden Frist bestehen. Eine bezahlte, noch nicht fertige Bestellung wird nicht als ungekauft entfernt.

Die Automatik betrifft den privaten Portal-Bildspeicher. Lokale Arbeitsdateien, Lightroom, OneDrive, getrennte Backups und heruntergeladene Kundendateien sind nicht Teil dieses Dienstes. Die sechs Monate verlängern den Galerie-Zugang nicht. Bei einem längeren Ausfall des Dienstes kann keine fristgerechte physische Löschung zugesichert werden; fehlgeschlagene Läufe müssen kontrolliert werden. Datenbank- und Rechnungsbelege bleiben erhalten.

## Lokal prüfen

Node.js ab 22.13 mit `node:sqlite`, empfohlen Node 24:

```text
node --test tools/customer-portal/tests/*.test.mjs tools/customer-portal/backend/cleanup-worker.test.mjs
```

Die Tests verwenden erfundene Daten und lokalen Dateispeicher. Sie prüfen unter anderem Fristgrenzen, Schutz bestehender Galerien, bezahlte Bestellungen, Gruppenbilder, Fehler und Wiederholungen. Ein erfolgreicher lokaler Test bestätigt noch keinen ausgeführten Cloudflare-Cron.
