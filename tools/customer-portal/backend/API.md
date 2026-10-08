# API-Vertrag des privaten Kundenportals

Alle Routen beginnen mit `/api`. Die Oberfläche und API laufen auf derselben Origin. Es gibt keine CORS-Freigabe und keine öffentliche Registrierung. JSON-Antworten und Bilddateien werden mit `private, no-store` ausgeliefert. Kunden sehen ausschließlich veröffentlichte, noch nicht abgelaufene Galerien, denen sie zugeordnet wurden.

Die Session liegt in einem zufälligen HttpOnly-, Secure-, SameSite=Lax-Cookie. Jede angemeldete schreibende Anfrage benötigt die exakte `Origin` sowie `X-CSRF-Token` aus `/session`. Setup, Reset und Login brauchen die exakte `Origin`, aber keine bestehende Session. Fehler: `{error,code}` mit passendem HTTP-Status.

| Methode und Route | Eingabe | Antwort / Zweck |
| --- | --- | --- |
| GET `/session` | — | `{user,csrf,capabilities}`; keine Konfiguration: `user:null`, `configured:false` |
| POST `/auth/login` | `{email,password}` | Nutzer, CSRF, Cookie |
| POST `/auth/logout` | `{}` | Session löschen |
| POST `/auth/request` | `{email,purpose:'setup'|'reset'}` | Allgemeine Bestätigung ohne Preisgabe, ob E-Mail existiert |
| POST `/auth/complete` | `{token,password}` | Token einmal verwenden, Passwort setzen, alte Sessions ungültig, neue Session |
| GET `/galleries` | — | `{galleries:[...]}` |
| GET `/galleries/:id` | — | `{gallery,images,packages,favorites}`; Admin zusätzlich `members` |
| PUT `/galleries/:id/favorites` | `{imageIds:[...]}` | Galeriebezogene Favoriten ersetzen |
| GET/HEAD `/images/:id?kind=preview` | — | Private Vorschau nach Zugangsprüfung |
| GET/HEAD `/images/:id?kind=original` | — | Download nur bei manueller Freigabe oder bezahlter Bestellung mit versandter Vertragsbestätigung |
| POST `/orders` | `{galleryId,imageIds?,all?,packageId,paymentMethod,termsAccepted:true,digitalConsent:true}` | `{order,paymentUrl,transfer?,reference?}`; Preis aus Datenbank, niemals aus Client; bei Gesamtpaketen `all:true` bestimmt die Bilder serverseitig |
| GET `/orders` | — | Eigene Bestellungen |
| GET `/orders/:id/receipt` | — | Gespeicherte Vertragsbestätigung als TXT-Download |
| POST `/orders/:id/withdraw` | `{confirmed:true}` | Rücktrittserklärung speichern, Eingangsbestätigung senden; Erstattung wird geprüft |
| POST `/orders/:id/capture` | `{}` | PayPal serverseitig bestätigen; Anbieterbetrag und Bestellung prüfen |
| POST `/payments/stripe/webhook` | Stripe-Rohbody / Signaturheader | Signatur, Zeitfenster, Betrag, Währung, Checkout und Bestellnummer prüfen |
| GET/POST `/admin/galleries` | POST `{name,date,description?,published?,expiresAt?,shootingType?,pricingMode?,theme?,gridLayout?,coverPosition?}` | Liste / neue Galerie; ausschließlich Schulgalerien mit Bildpreisen erhalten Standardpakete 10 € für 1 / 25 € für 3 digitale Fotos |
| GET/PATCH `/admin/galleries/:id` | PATCH `{name?,date?,description?,published?,expiresAt?,coverImageId?,shootingType?,pricingMode?,theme?,gridLayout?,coverPosition?}` | Galerie ansehen / bearbeiten; unveröffentlicht sperrt Kunden |
| POST `/admin/galleries/:id/members` | `{email,name}` | Kunde anlegen oder bestehenden zuordnen; kein Passwort verschicken |
| DELETE `/admin/galleries/:id/members/:userId` | — | Galeriezugang sofort entziehen |
| POST `/admin/galleries/:id/invite` | `{email}` | „Deine Bilder sind fertig“-E-Mail mit Link, ohne Passwort |
| POST `/admin/galleries/:id/packages` | `{name,imageCount,priceCents,active?}` | Paket anlegen; `imageCount:0` bedeutet alle Bilder |
| PATCH `/admin/galleries/:id/packages/:packageId` | `{name,imageCount,priceCents,active?}` | Paket bearbeiten / deaktivieren; vergangene Bestellpreise bleiben unverändert |
| POST `/admin/galleries/:id/images` | Multipart: `preview`, `original`, `title`, `width`, `height` | JPEG, PNG, WebP; MIME-Signaturprüfung; Vorschau max. 4 MB, Original max. 30 MB |
| POST `/admin/galleries/:id/release` | `{userId,imageIds? ,all?}` | Ausgewählte Originale oder mit `all:true` alle aktuell hinterlegten Originale gratis / nach vorheriger Bezahlung freigeben |
| GET `/admin/orders` | — | Alle Bestellungen inklusive Kundenname / E-Mail |
| POST `/admin/orders/:id/paid` | `{}` | Ausschließlich Bankzahlung manuell bestätigen |
| POST `/admin/orders/:id/receipt` | `{}` | Vertragsbestätigung erneut per E-Mail senden |
| POST `/admin/orders/:id/refunded` | `{}` | Bereits außerhalb des Portals erstattete Zahlung markieren, gekaufte Downloads sperren; löst selbst keine Erstattung aus |

`user`: `{id,email,name,role:'customer'|'admin'}`.

`gallery`: `{id,name,date,description,shootingType,pricingMode,theme,gridLayout,coverPosition,published,expiresAt,coverImageId,coverUrl,imageCount}`. Datum `YYYY-MM-DD`, Ablauf als ISO-Zeit. Interne Datenbankzeiten sind Millisekunden. `shootingType`: school, maternity, newborn, family, portrait, wedding, combo oder other. `pricingMode`: images oder gallery. Nur Schulgalerien bekommen ohne manuelle Preisangabe Bildpreise; andere Typen beginnen mit mode gallery und ohne vorgegebene Pakete. In gallery-Modus kann nur ein Gesamtpaket `imageCount:0` gekauft werden. `theme`: warm, light oder dark. `gridLayout`: masonry oder grid. `coverPosition`: Zahl 0 bis 100.

`image`: `{id,galleryId,title,width,height,position,previewUrl,originalUrl,downloadAllowed}`.

`package`: `{id,galleryId,name,imageCount,priceCents,currency:'EUR',active}`.

`order`: `{id,userId,galleryId,galleryName,packageId,packageName,packageQuantity,imageIds,amountCents,currency,status,paymentMethod,paymentUrl,createdAt,paidAt,receiptSent,receiptUrl,withdrawalRequested}`. Admin zusätzlich Kundenkontakt. Ein wiederholter Versuch für dieselbe unbezahlte Auswahl verwendet dieselbe Bestellung. Für Pakete mit fester Bildanzahl darf die Auswahl ein Vielfaches davon sein: die Menge und der Gesamtpreis werden vom Server berechnet. Zwei Einzelbilder kosten 20 €, sechs Bilder mit dem 3er-Paket 50 €. Pakete `imageCount:0` gelten einmalig für alle Galeriebilder.

Individuelle `imageIds` sind auf 500 begrenzt. Ganze Galerien können mit `all:true` und einem Gesamtpaket bis 5.000 Fotos ohne große Client-ID-Liste bestellt werden. Die Datenbank bestimmt sämtliche Bild-IDs innerhalb der autorisierten Galerie. Eine manuelle Freigabe mit `all:true` gilt für alle zum Zeitpunkt der Freigabe hinterlegten Bilder dieser Galerie; später hinzugefügte Bilder brauchen eine neue Freigabe.

`capabilities`: `{configured,email,stripe,paypal,transferConfigured,transfer}`. Transfer enthält bei Konfiguration `{recipient,iban,bic}`. `PAYMENT_METHODS` enthält zunächst ausschließlich transfer. Stripe und PayPal bleiben verborgen / gesperrt, bis sie ausdrücklich in dieser Allowlist stehen und die notwendigen Anbieter-Secrets vorhanden sind. Anbieter ohne Secrets bleiben deaktiviert.

Setup-Links: `PORTAL_ORIGIN + PORTAL_PATH + ?token=...&purpose=setup|reset`. Die Oberfläche entfernt das Token direkt aus der URL. Galerie-Einladungen enthalten nur `?gallery=...`; dieser Link selbst gewährt keine Berechtigung.
