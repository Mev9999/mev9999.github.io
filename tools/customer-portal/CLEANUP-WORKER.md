# Tägliche Bereinigung bei Cloudflare Pages

Das Portal auf Pages benötigt für die tägliche Bereinigung einen separaten Worker. `backend/cleanup-worker.mjs` ist ein vollständiges JavaScript-Modul zum Kopieren in den Dashboard-Editor. Es löscht ausschließlich abgelaufene Sessions, abgelaufene Setup-/Reset-Tokens und Rate-Limits, deren Reset mehr als 24 Stunden zurückliegt. Galerien, Bilder, Benutzer, Bestellungen und Freigaben bleiben erhalten, auch bei abgelaufenen Galerien.

## Einmalige Einrichtung im Dashboard

1. Unter **Workers & Pages** einen eigenständigen Worker erstellen, beispielsweise `liza-portal-cleanup`, im Workers-Free-Tarif. Den vollständigen Inhalt von `backend/cleanup-worker.mjs` im Code-Editor einsetzen und deployen.
2. Unter **Bindings** eine **D1 database** mit Variablennamen **`DB`** hinzufügen. Dieselbe produktive D1-Datenbank auswählen, die das Pages-Portal als `DB` verwendet. Speichern und die Änderung deployen. Dieser Worker benötigt nur diese Bindung. [Cloudflare: D1-Bindung](https://developers.cloudflare.com/d1/get-started/#3-bind-your-worker-to-your-d1-database)
3. Unter **Settings → Triggers → Cron Triggers** die benutzerdefinierte Cron-Zeichenfolge **`17 3 * * *`** hinzufügen. Sie läuft täglich um **03:17 UTC**; in Wien um 04:17 im Winter und 05:17 im Sommer. Änderungen können bis zu 15 Minuten benötigen. [Cloudflare: Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
4. Nach dem ersten geplanten Lauf in der Worker-Ansicht die Cron-Ausführung bzw. Ereignisse prüfen. Fehlende `DB`-Bindung und Datenbankfehler lassen den geplanten Lauf fehlschlagen. Eine HTTP-Anfrage liefert immer `404` und startet keine Bereinigung.

Eine öffentliche Domain oder Portal-Route ist nicht erforderlich. Es werden keine Fotos, E-Mails oder Zahlungsanbieter angesprochen. Bei einer späteren Worker-Verwaltung mit Wrangler müssen die Cron-Einstellungen in dessen Konfigurationsdatei übernommen werden.

## Lokal prüfen

Node.js ab 22.13 mit `node:sqlite`, empfohlen Node 24. Im Repository:

```text
node --test tools/customer-portal/backend/cleanup-worker.test.mjs
```

Die Tests verwenden die bestehende SQLite-D1-Implementierung und das produktive Schema mit ausschließlich erfundenen Daten. Sie prüfen die Ablaufgrenzen, erhalten alle übrigen Tabellen, verifizieren die Wirkungslosigkeit öffentlicher Aufrufe und prüfen sichtbare Fehler samt Transaktions-Rollback. Eine erfolgreiche lokale Prüfung bestätigt noch keinen erfolgten Cron-Lauf in Cloudflare.
