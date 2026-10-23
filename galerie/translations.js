const rows = {
orderedPhotos:["Bestellte Bilder ansehen","View ordered photos","Pogledaj naručene fotografije"],
orderConfirmation:["Bestellbestätigung herunterladen","Download order confirmation","Preuzmi potvrdu narudžbe"],
orderPhotoHint:["Dies sind die Bilder dieser Bestellung. Favoriten sind davon unabhängig. Fehlende fertige Dateien sind hervorgehoben.","These are the photos in this order, independent of favourites. Missing final files are highlighted.","Ovo su naručene fotografije, nezavisno od favorita. Nedostajuće gotove datoteke su označene."],
orderedImageMissing:["Bild nicht mehr verfügbar","Image no longer available","Fotografija više nije dostupna"],
orderedOriginal:["Hochgeladene Datei vorhanden","Uploaded file available","Učitana datoteka dostupna"],
adminFinalOriginal:["Fertige Originaldatei bereit · Admin-Vorschau ohne Wasserzeichen","Final original · Admin preview without watermark","Gotov original · Admin prikaz bez vodenog žiga"],
customerEmails:["E-Mails an diesen Kunden","Emails to this customer","E-mailovi ovom klijentu"],
mailHistoryHint:["Gespeicherte E-Mails an diese Person, auch aus anderen Galerien. Versendet bedeutet: vom Versanddienst angenommen. Zustellung prüfen fragt den aktuellen Anbieterstatus ab; dies bestätigt nicht, dass die Person die Nachricht gelesen hat. Ältere Nachrichten sind nur verfügbar, soweit sie gespeichert wurden. Anmeldelinks sind geschützt.","Stored emails to this person across galleries. Sent means accepted by the mail provider. Check delivery retrieves the provider status, not proof that the person read it. Older messages are available only where stored. Login links are protected.","Sačuvani e-mailovi ovoj osobi iz svih galerija. Poslano znači prihvaćeno od servisa. Provjera dostave nije dokaz čitanja. Starije poruke dostupne su samo ako su sačuvane. Linkovi za prijavu su zaštićeni."],
mailHistoryMigration:["Für das Protokoll neuer E-Mails bitte das Datenbank-Update mail-history.sql ausführen.","Run mail-history.sql to log new emails.","Pokreni mail-history.sql za evidenciju novih poruka."],
mailHistoryEmpty:["Keine gespeicherten Nachrichten vorhanden.","No stored messages available.","Nema sačuvanih poruka."],
mailCheck:["Zustellung prüfen","Check delivery","Provjeri dostavu"],
mailContent:["E-Mail ansehen","View email","Pogledaj e-mail"],
mailState_sent:["Versendet · Zustellung noch nicht bestätigt","Sent · Delivery not yet confirmed","Poslano · Dostava još nije potvrđena"],
mailState_delivered:["Vom Empfänger-Mailserver angenommen","Accepted by recipient mail server","Prihvaćeno na serveru primaoca"],
mailState_pending:["Versand ausstehend","Pending send","Slanje na čekanju"],
mailState_cancelled:["Versand aufgehoben","Sending cancelled","Slanje otkazano"],
mailState_failed:["Versand fehlgeschlagen","Sending failed","Slanje nije uspjelo"],
mailState_unavailable:["Zustellstatus nicht abrufbar – gegebenenfalls direkt bei Resend prüfen.","Delivery status unavailable – check Resend directly if needed.","Status dostave nije dostupan – provjeri u Resendu."],
mailState_bounced:["Nicht zugestellt · zurückgewiesen","Not delivered · Bounced","Nije dostavljeno · Odbijeno"],
mailState_complained:["Als Spam gemeldet","Reported as spam","Prijavljeno kao neželjena pošta"],
mailState_delivery_delayed:["Zustellung verzögert","Delivery delayed","Dostava kasni"],
mailState_opened:["Öffnung vom Anbieter registriert · kein sicherer Lesenachweis","Provider registered an open · Not proof of reading","Servis je zabilježio otvaranje · Nije dokaz čitanja"],
mailState_clicked:["Link-Aufruf vom Anbieter registriert","Provider registered a link click","Servis je zabilježio klik"],
  themeCream:['Creme','Cream','Krem'],themeRose:['Rosé','Rose','Ružičasta'],themeBlush:['Blütenrosa','Blush','Nježna ružičasta'],themeSand:['Sand','Sand','Pijesak'],themeClay:['Terrakotta','Terracotta','Terakota'],themeSage:['Salbei','Sage','Kadulja'],themeOlive:['Olive','Olive','Maslina'],themeForest:['Waldgrün','Forest','Šumska zelena'],themeSea:['Meeresgrün','Sea green','Morska zelena'],themeSky:['Himmelblau','Sky blue','Nebesko plava'],themeLavender:['Lavendel','Lavender','Lavanda'],themeSlate:['Schieferblau','Slate blue','Škriljac plava'],
  coverSplitReverse:['Titel links · Foto rechts','Title left · Photo right','Naslov lijevo · Fotografija desno'],coverCard:['Titelkarte auf dem Foto','Title card on photo','Kartica s naslovom na fotografiji'],coverArch:['Foto mit Bogen','Arched photo','Fotografija s lukom'],coverPolaroid:['Fotodruck mit Rand','Framed photo print','Fotografija s obrubom'],coverMinimal:['Titel oben · Foto darunter','Title above · Photo below','Naslov iznad · Fotografija ispod'],
  coverHeightDesktop:['Coverhöhe · Desktop','Cover height · Desktop','Visina naslovnice · Računar'],coverHeightMobile:['Coverhöhe · Handy','Cover height · Mobile','Visina naslovnice · Mobitel'],coverFitDesktop:['Bilddarstellung · Desktop','Image fit · Desktop','Prikaz fotografije · Računar'],coverFitMobile:['Bilddarstellung · Handy','Image fit · Mobile','Prikaz fotografije · Mobitel'],coverFitContain:['Ganzes Foto · ohne Beschnitt','Entire photo · No crop','Cijela fotografija · Bez rezanja'],coverFitCover:['Fläche füllen · mit Beschnitt','Fill area · Cropped','Popuni prostor · Izrezano'],
  decorationDoubleFrame:['Doppelter Rahmen','Double frame','Dvostruki okvir'],decorationCorners:['Feine Ecklinien','Fine corners','Tanke ugaone linije'],decorationUnderline:['Linie unter dem Titel','Line below title','Linija ispod naslova'],decorationShadow:['Weicher Schatten','Soft shadow','Blaga sjena'],decorationRounded:['Sanft gerundet','Softly rounded','Blago zaobljeno'],
  selectionRegion:['Bildauswahl','Photo selection','Izbor fotografija'],selectionClearShort:['Leeren','Clear','Poništi'],selectionDownloadShort:['Download','Download','Preuzmi'],selectionOrderShort:['Bestellen','Order','Naruči'],
  watermarkVisible:['Wasserzeichen sichtbar','Watermark visible','Vodeni žig je vidljiv'],
  watermarkInactive:['Wasserzeichen aus','Watermark off','Vodeni žig je isključen'],
  watermarkSavePreview:['Speichere die Wasserzeichen-Einstellung zuerst. Aktualisiere danach bei Bedarf die Vorschauen, um das Ergebnis hier zu sehen.','Save the watermark setting first. Then update previews if needed to see the result here.','Prvo sačuvaj postavku vodenog žiga. Zatim po potrebi ažuriraj preglede da ovdje vidiš rezultat.'],
  watermarkPreviewsMissing:['Bei {n} von {total} Bildern fehlt die aktuelle Wasserzeichen-Vorschau. Klicke auf „Vorschauen aktualisieren“ und lasse die Seite offen. Bis dahin sehen Kunden ohne Freigabe ein Schloss. Du musst die Bilder nicht neu hochladen.','The current watermark preview is missing for {n} of {total} images. Click Update previews and keep this page open. Until then, clients without release see a lock. You do not need to upload the images again.','Za {n} od {total} fotografija nedostaje ažurirani pregled s vodenim žigom. Klikni Ažuriraj preglede i ostavi stranicu otvorenu. Do tada klijenti bez odobrenja vide lokot. Fotografije ne moraš ponovo učitati.'],
  galleryView:['Galerieansicht','Gallery view','Prikaz galerija'],
  galleryViewLarge:['Große Kacheln','Large tiles','Velike kartice'],
  galleryViewCompact:['Kleine Kacheln','Small tiles','Male kartice'],
  galleryViewList:['Liste','List','Lista'],
  title:['Kundenportal','Client portal','Portal za klijente'], private:['Dein persönlicher Bildbereich','Your private photo space','Tvoj privatni prostor za fotografije'],
  welcome:['Eure Erinnerungen.','Your memories.','Vaše uspomene.'], welcomeAccent:['Einfach bei euch.','Always with you.','Uvijek uz vas.'], intro:['Hier warten eure Bilder auf euch – in einer geschützten Galerie, die nur für euch bestimmt ist. Ansehen, Lieblingsbilder auswählen und freigegebene Fotos herunterladen.','Your photographs have a space of their own. View your private gallery, choose your favourites and download the images released for you.','Vaše fotografije imaju svoje mjesto. Pogledajte privatnu galeriju, odaberite omiljene fotografije i preuzmite one koje su vam dostupne.'],
  protected:['Geschützter Zugang','Private access','Zaštićen pristup'], favourites:['Lieblingsbilder','Favourites','Omiljene fotografije'], downloads:['Digitale Downloads','Digital downloads','Digitalno preuzimanje'], loginTitle:['Willkommen zurück','Welcome back','Dobro došli nazad'], loginIntro:['Melde dich mit der E-Mail-Adresse an, die du mir für deine Galerie gegeben hast.','Use the email address you provided for your gallery.','Prijavi se e-mail adresom koju si navela za svoju galeriju.'], login:['Anmelden','Sign in','Prijava'], setup:['Zugang einrichten','Set up access','Aktiviraj pristup'], reset:['Passwort zurücksetzen','Reset password','Promijeni lozinku'], email:['E-Mail-Adresse','Email address','E-mail adresa'], password:['Passwort','Password','Lozinka'], newPassword:['Neues Passwort','New password','Nova lozinka'], repeatPassword:['Passwort wiederholen','Repeat password','Ponovi lozinku'], showPassword:['Passwort anzeigen','Show password','Prikaži lozinku'], hidePassword:['Passwort verbergen','Hide password','Sakrij lozinku'], forgot:['Passwort vergessen?','Forgot password?','Zaboravljena lozinka?'], requestSetup:['Bestätigungslink senden','Send setup link','Pošalji link za aktivaciju'], requestReset:['Link zum Zurücksetzen senden','Send reset link','Pošalji link za promjenu'], setupIntro:['Noch kein Passwort? Ein Bestätigungslink geht an die E-Mail-Adresse, die für deine Galerie hinterlegt ist. Darüber legst du dein eigenes Passwort fest.','No password yet? A setup link will be sent to the email address registered for your gallery. Use it to choose your own password.','Još nemaš lozinku? Link za aktivaciju stiže na adresu registrovanu za tvoju galeriju. Putem njega postavljaš svoju lozinku.'], resetIntro:['Du bekommst einen kurz gültigen Link an deine hinterlegte E-Mail-Adresse. Dein bisheriges Passwort wird niemals per E-Mail verschickt.','Receive a short-lived reset link at your registered email address. Your existing password is never sent by email.','Dobit ćeš kratkotrajni link za promjenu na registrovanu e-mail adresu. Postojeća lozinka se nikada ne šalje e-mailom.'], requestSent:['Wenn diese Adresse freigeschaltet ist, erhältst du gleich eine E-Mail. Bitte prüfe auch deinen Spam-Ordner.','If this address has access, you will receive an email shortly. Please also check your spam folder.','Ako je ova adresa registrovana, uskoro će stići e-mail. Provjeri i neželjenu poštu.'], secureNote:['Deine Galerie ist erst nach der Anmeldung sichtbar. Auch die einzelnen Bilder sind geschützt.','Your gallery and individual images are available only after you sign in.','Galerija i pojedinačne fotografije dostupne su tek nakon prijave.'], help:['Fragen zum Zugang?','Need help accessing your gallery?','Pitanja o pristupu?'], contact:['Schreib mir gerne','Get in touch','Javi mi se'], loading:['Dein Kundenportal wird geladen …','Loading your client portal …','Učitavanje portala …'], saving:['Wird gespeichert …','Saving …','Spremanje …'], working:['Einen Moment …','One moment …','Samo trenutak …'], offlineTitle:['Dein Portal wird vorbereitet','Your portal is being prepared','Tvoj portal se priprema'], offlineText:['Die sichere Verbindung ist noch nicht eingerichtet oder gerade nicht erreichbar. Deine Angaben wurden nicht gespeichert. Bitte versuche es später erneut oder melde dich bei mir.','The secure connection is not configured yet or is currently unavailable. Your details have not been saved. Please try again later or contact me.','Sigurna veza još nije postavljena ili trenutno nije dostupna. Tvoji podaci nisu spremljeni. Pokušaj kasnije ili mi se javi.'], retry:['Erneut versuchen','Try again','Pokušaj ponovo'], signOut:['Abmelden','Sign out','Odjava'], myGalleries:['Deine Galerien','Your galleries','Tvoje galerije'], hello:['Schön, dass du da bist, {name}.','Lovely to see you, {name}.','Drago mi je da si tu, {name}.'], images:['{n} Bilder','{n} images','{n} fotografija'], openGallery:['Galerie öffnen','Open gallery','Otvori galeriju'], noGalleries:['Deine Bilder sind bald hier','Your images will be here soon','Tvoje fotografije uskoro stižu'], noGalleriesText:['Für deinen Zugang ist noch keine veröffentlichte Galerie verfügbar. Sobald deine Bilder fertig sind, bekommst du von mir eine Nachricht.','No published gallery is available for your access yet. I will let you know when your photographs are ready.','Za tvoj pristup još nema objavljene galerije. Javit ću ti kada fotografije budu spremne.'], backGalleries:['Alle Galerien','All galleries','Sve galerije'], allPhotos:['Alle Bilder','All photos','Sve fotografije'], favouritesCount:['Favoriten ({n})','Favourites ({n})','Omiljene ({n})'], selectedCount:['{n} ausgewählt','{n} selected','{n} odabrano'], selectAll:['Alle auswählen','Select all','Odaberi sve'], clearSelection:['Auswahl aufheben','Clear selection','Poništi izbor'], selectFavourites:['Favoriten auswählen','Select favourites','Odaberi omiljene'], buyPhotos:['Bilder bestellen','Order images','Naruči fotografije'], download:['Herunterladen','Download','Preuzmi'], downloadSelected:['Auswahl herunterladen','Download selection','Preuzmi odabrane'], selection:['Deine Auswahl','Your selection','Tvoj izbor'], favoriteAdd:['Als Favorit markieren','Add to favourites','Dodaj u omiljene'], favoriteRemove:['Aus Favoriten entfernen','Remove from favourites','Ukloni iz omiljenih'], selectPhoto:['Bild auswählen','Select image','Odaberi fotografiju'], deselectPhoto:['Bild aus Auswahl entfernen','Deselect image','Poništi izbor fotografije'], photoOpen:['Bild {n} vergrößern','Open image {n}','Otvori fotografiju {n}'], noFavourites:['Welche Bilder sind eure Lieblingsbilder?','Which images are your favourites?','Koje su vam fotografije omiljene?'], noFavouritesText:['Tippe auf das Herz an einem Bild, um es hier wiederzufinden. Deine Favoriten werden in deiner Galerie gespeichert.','Tap the heart on an image to find it here. Your favourites are saved in your gallery.','Dodirni srce na fotografiji da je sačuvaš ovdje. Omiljene fotografije se spremaju u tvoju galeriju.'], noImages:['Noch keine Bilder vorhanden','No images yet','Još nema fotografija'], noImagesText:['Die Bilder für diese Galerie werden gerade vorbereitet.','The photographs for this gallery are being prepared.','Fotografije za ovu galeriju se pripremaju.'], close:['Schließen','Close','Zatvori'], previous:['Vorheriges Bild','Previous image','Prethodna fotografija'], next:['Nächstes Bild','Next image','Sljedeća fotografija'], fullscreen:['Vollbild','Fullscreen','Cijeli ekran'], imagePosition:['{n} von {total}','{n} of {total}','{n} od {total}'], imageLoadError:['Dieses Bild konnte nicht geladen werden. Bitte versuche es noch einmal.','This image could not be loaded. Please try again.','Fotografiju nije moguće učitati. Pokušaj ponovo.'], favouriteSaved:['Deine Favoriten wurden gespeichert.','Your favourites have been saved.','Omiljene fotografije su spremljene.'], downloadLocked:['Die Originaldateien dieser Auswahl sind noch nicht freigegeben. Bestelle die Bilder oder frage mich nach deiner Freigabe.','The originals in this selection have not been released yet. Order the images or ask me about your download access.','Originalne datoteke ovog izbora još nisu dostupne. Naruči fotografije ili me pitaj za pristup preuzimanju.'], downloadPreparing:['Dein Download wird vorbereitet','Preparing your download','Priprema preuzimanja'], downloadProgress:['{n} von {total} Bildern geladen','{n} of {total} images loaded','Učitano {n} od {total} fotografija'], downloadStarted:['Dein Download ist bereit.','Your download is ready.','Preuzimanje je spremno.'], downloadLimit:['Bitte lade höchstens 30 Bilder auf einmal herunter, damit dein Gerät den Download zuverlässig vorbereiten kann.','Please download no more than 30 images at a time so your device can prepare the download reliably.','Preuzmi najviše 30 fotografija odjednom kako bi uređaj mogao pouzdano pripremiti preuzimanje.'], downloadSize:['Diese Auswahl ist für einen gemeinsamen Download zu groß. Bitte lade weniger Bilder auf einmal herunter.','This selection is too large for one download. Please download fewer images at a time.','Ovaj izbor je prevelik za jedno preuzimanje. Preuzmi manje fotografija odjednom.'],
  myOrders:['Deine Bestellungen','Your orders','Tvoje narudžbe'], noOrders:['Du hast noch keine Bestellung aufgegeben.','You have not placed an order yet.','Još nemaš narudžbi.'], orderNumber:['Bestellung {id}','Order {id}','Narudžba {id}'], orderPending:['Zahlung ausständig','Payment pending','Čeka se uplata'], orderPaid:['Bezahlt · Download freigegeben','Paid · Download available','Plaćeno · Preuzimanje dostupno'], orderCancelled:['Storniert','Cancelled','Otkazano'], orderFailed:['Zahlung fehlgeschlagen','Payment failed','Plaćanje nije uspjelo'], receipt:['Bestätigung herunterladen','Download confirmation','Preuzmi potvrdu'], checkoutTitle:['Deine Bilder. Für immer bei dir.','Your photographs. Yours to keep.','Tvoje fotografije. Zauvijek tvoje.'], checkoutIntro:['Du hast {n} Bilder ausgewählt. Wähle das passende digitale Paket für deine Auswahl.','You have selected {n} images. Choose the digital package for your selection.','Odabrala si {n} fotografija. Izaberi odgovarajući digitalni paket.'], packageCount:['{n} digitale Bilder','{n} digital images','{n} digitalnih fotografija'], packageAll:['Alle Bilder dieser Galerie','All images in this gallery','Sve fotografije ove galerije'], noPackage:['Für diese Auswahl ist noch kein passendes Paket vorhanden. Passe deine Bildanzahl an oder melde dich bei mir.','There is no package matching this selection yet. Adjust the number of images or contact me.','Još nema paketa za ovaj izbor. Promijeni broj fotografija ili mi se javi.'], paymentMethod:['Zahlungsart','Payment method','Način plaćanja'], transfer:['Überweisung','Bank transfer','Bankovna uplata'], stripe:['Kreditkarte','Card','Kartica'], paypal:['PayPal','PayPal','PayPal'], unavailablePayment:['Noch nicht verfügbar','Not available yet','Još nije dostupno'], total:['Gesamtpreis','Total price','Ukupna cijena'], vat:['Gemäß Kleinunternehmerregelung wird keine Umsatzsteuer ausgewiesen.','No VAT is charged under the Austrian small-business exemption.','PDV se ne obračunava prema austrijskom pravilu za male poduzetnike.'], termsConsent:['Ich akzeptiere die <a href="{terms}" target="_blank" rel="noopener">Bestellbedingungen</a> und habe die <a href="{privacy}" target="_blank" rel="noopener">Datenschutzhinweise</a> gelesen.','I accept the <a href="{terms}" target="_blank" rel="noopener">order terms</a> and have read the <a href="{privacy}" target="_blank" rel="noopener">privacy notice</a>.','Prihvatam <a href="{terms}" target="_blank" rel="noopener">uslove narudžbe</a> i pročitala sam <a href="{privacy}" target="_blank" rel="noopener">obavijest o privatnosti</a>.'], digitalConsent:['Ich stimme ausdrücklich zu, dass die Bereitstellung der digitalen Bilder vor Ablauf der Widerrufsfrist beginnt, und bestätige, dass ich mit Beginn der Bereitstellung mein Widerrufsrecht verliere. <a href="{terms}#widerruf" target="_blank" rel="noopener">Mehr dazu</a>','I expressly consent to the supply of the digital images before the withdrawal period ends and acknowledge that I lose my right of withdrawal when supply begins. <a href="{terms}#widerruf" target="_blank" rel="noopener">Details</a>','Izričito pristajem da isporuka digitalnih fotografija počne prije isteka roka za odustajanje i potvrđujem da početkom isporuke gubim pravo na odustajanje. <a href="{terms}#widerruf" target="_blank" rel="noopener">Detalji</a>'], orderButton:['Zahlungspflichtig bestellen','Place order with obligation to pay','Naruči uz obavezu plaćanja'], digitalOnly:['Digitale Originaldateien für deinen persönlichen Gebrauch. Es werden keine gedruckten Fotos verschickt.','Original digital files for your personal use. No printed photographs are shipped.','Originalne digitalne datoteke za ličnu upotrebu. Štampane fotografije se ne šalju.'], orderSuccess:['Vielen Dank für deine Bestellung','Thank you for your order','Hvala na narudžbi'], transferInstruction:['Bitte überweise den Betrag mit der Bestellnummer als Verwendungszweck. Nach Zahlungseingang gebe ich deine Bilder frei.','Please transfer the amount using the order number as the reference. I will release your images after payment is received.','Uplati iznos uz broj narudžbe kao poziv na broj. Fotografije ću omogućiti nakon primitka uplate.'], bankRecipient:['Empfängerin','Recipient','Primatelj'], bankReference:['Verwendungszweck','Payment reference','Svrha uplate'], bankMissing:['Die Bankverbindung ist noch nicht hinterlegt. Bitte melde dich bei mir, bevor du eine Zahlung ausführst.','Bank details have not been added yet. Please contact me before making a payment.','Bankovni podaci još nisu postavljeni. Javi mi se prije uplate.'], paymentProcessing:['Die Zahlung wird überprüft. Sobald sie bestätigt ist, werden deine Bilder freigegeben.','Your payment is being verified. Your images will be released once it is confirmed.','Plaćanje se provjerava. Fotografije će biti dostupne nakon potvrde.'], continueGallery:['Zurück zu deinen Bildern','Back to your photographs','Nazad na fotografije'],
  setPasswordTitle:['Dein Zugang. Dein Passwort.','Your access. Your password.','Tvoj pristup. Tvoja lozinka.'], setPasswordIntro:['Lege ein sicheres Passwort fest. Danach öffnet sich dein persönlicher Bildbereich.','Choose a secure password. Your personal photo space will open afterwards.','Postavi sigurnu lozinku. Nakon toga otvorit će se tvoje fotografije.'], passwordHint:['Mindestens 12 Zeichen. Verwende ein Passwort, das du sonst nirgends benutzt.','At least 12 characters. Use a password you do not use elsewhere.','Najmanje 12 znakova. Koristi lozinku koju ne koristiš drugdje.'], savePassword:['Passwort festlegen','Set password','Postavi lozinku'], passwordMismatch:['Die beiden Passwörter stimmen nicht überein.','The passwords do not match.','Lozinke se ne podudaraju.'], passwordShort:['Bitte verwende mindestens 12 Zeichen.','Please use at least 12 characters.','Koristi najmanje 12 znakova.'], setupDone:['Dein Zugang ist eingerichtet.','Your access is ready.','Tvoj pristup je spreman.'],
  admin:['Verwaltung','Administration','Administracija'], clientView:['Kundenansicht','Client view','Prikaz za klijente'], manageGalleries:['Galerien verwalten','Manage galleries','Upravljaj galerijama'], manageOrders:['Bestellungen','Orders','Narudžbe'], createGallery:['Neue Galerie','New gallery','Nova galerija'], galleryName:['Shootingname','Shooting name','Naziv snimanja'], galleryDate:['Shootingdatum','Shooting date','Datum snimanja'], description:['Persönliche Nachricht','Personal message','Lična poruka'], expiry:['Galerie verfügbar bis (optional)','Gallery expiry (optional)','Galerija dostupna do (opcionalno)'], coverImage:['Coverbild','Cover image','Naslovna fotografija'], noCover:['Noch kein Coverbild','No cover image yet','Još nema naslovne fotografije'], published:['Veröffentlicht','Published','Objavljeno'], draft:['Entwurf','Draft','Nacrt'], publishConsent:['Galerie für zugeordnete Kunden veröffentlichen','Publish for assigned clients','Objavi za dodijeljene klijente'], saveGallery:['Galerie speichern','Save gallery','Spremi galeriju'], create:['Erstellen','Create','Kreiraj'], gallerySaved:['Die Galerie wurde gespeichert.','The gallery has been saved.','Galerija je spremljena.'], customerAccess:['Kundenzugänge','Client access','Pristup klijentima'], customerName:['Name','Name','Ime'], addCustomer:['Zugang zuordnen','Assign access','Dodijeli pristup'], accessIntro:['Nur diese E-Mail-Adressen können nach der Anmeldung auf diese Galerie zugreifen. Neue Kunden richten ihr Passwort über einen Bestätigungslink ein.','Only these email addresses can access this gallery after signing in. New clients set their password using a setup link.','Samo ove e-mail adrese mogu pristupiti galeriji nakon prijave. Novi klijenti postavljaju lozinku putem linka za aktivaciju.'], sendInvite:['Einladung senden','Send invitation','Pošalji pozivnicu'], inviteSent:['Die Einladung wurde versendet.','The invitation has been sent.','Pozivnica je poslana.'], inviteUnavailable:['Der E-Mail-Versand ist noch nicht eingerichtet. Du kannst den Zugang bereits zuordnen, aber noch keine Einladung verschicken.','Email sending is not configured yet. You can assign access but cannot send an invitation yet.','Slanje e-maila još nije postavljeno. Pristup možeš dodijeliti, ali još ne možeš poslati pozivnicu.'], accessAdded:['Der Zugang wurde zugeordnet.','Access has been assigned.','Pristup je dodijeljen.'], noMembers:['Noch keine Kundenzugänge zugeordnet.','No client access assigned yet.','Još nema dodijeljenih klijenata.'], packages:['Digitale Pakete','Digital packages','Digitalni paketi'], packageName:['Paketname','Package name','Naziv paketa'], imageQuantity:['Bildanzahl (0 = alle)','Image count (0 = all)','Broj fotografija (0 = sve)'], price:['Preis in EUR','Price in EUR','Cijena u EUR'], addPackage:['Paket hinzufügen','Add package','Dodaj paket'], packageAdded:['Das Paket wurde hinzugefügt.','The package has been added.','Paket je dodan.'], noPackages:['Noch keine Pakete angelegt.','No packages created yet.','Još nema paketa.'], photos:['Bilder','Photographs','Fotografije'], uploadIntro:['Lade fertig bearbeitete JPEG-, PNG- oder WebP-Dateien hoch. Eine kleinere Vorschau wird auf deinem Gerät erstellt; das Original bleibt unverändert und geschützt.','Upload edited JPEG, PNG or WebP files. A smaller preview is created on your device; the original stays unchanged and private.','Učitaj obrađene JPEG, PNG ili WebP datoteke. Manji pregled se kreira na tvom uređaju; original ostaje nepromijenjen i privatan.'], selectFiles:['Bilddateien auswählen','Choose image files','Odaberi fotografije'], upload:['Bilder hochladen','Upload photographs','Učitaj fotografije'], uploading:['Wird hochgeladen: {name} ({n}/{total})','Uploading: {name} ({n}/{total})','Učitavanje: {name} ({n}/{total})'], uploadDone:['{n} Bilder wurden hochgeladen.','{n} images have been uploaded.','Učitano je {n} fotografija.'], uploadType:['Bitte verwende JPEG-, PNG- oder WebP-Dateien.','Please use JPEG, PNG or WebP files.','Koristi JPEG, PNG ili WebP datoteke.'], uploadSize:['Eine Datei darf höchstens 30 MB groß sein.','Each file must be no larger than 30 MB.','Datoteka ne smije biti veća od 30 MB.'], uploadPixels:['Dieses Bild ist für die Vorschauerstellung zu groß. Bitte exportiere es mit weniger als 50 Megapixeln.','This image is too large to create a preview. Please export it at less than 50 megapixels.','Fotografija je prevelika za izradu pregleda. Izvezi je s manje od 50 megapiksela.'], releaseTitle:['Downloads manuell freigeben','Release downloads manually','Ručno omogući preuzimanje'], releaseIntro:['Wähle oben die Bilder und hier den Kunden. Die Freigabe gilt für diesen Zugang und ist unabhängig von einer Bestellung.','Select the images above and the client here. This release applies to this client and is independent of an order.','Odaberi fotografije iznad i klijenta ovdje. Ovo odobrenje vrijedi za tog klijenta nezavisno od narudžbe.'], release:['Auswahl freigeben','Release selection','Omogući odabrane'], releaseSuccess:['Die ausgewählten Downloads wurden freigegeben.','The selected downloads have been released.','Odabrane fotografije su dostupne za preuzimanje.'], chooseCustomer:['Kunden auswählen','Choose client','Odaberi klijenta'], markPaid:['Zahlung bestätigen & freigeben','Confirm payment & release','Potvrdi uplatu i omogući preuzimanje'], paidConfirm:['Nur bestätigen, wenn die Zahlung eingegangen ist. Dadurch werden die bestellten Bilder zum Download freigegeben.','Confirm only after payment has been received. This releases the ordered images for download.','Potvrdi samo kada uplata stigne. Time se naručene fotografije omogućuju za preuzimanje.'], paidSuccess:['Die Zahlung wurde bestätigt und die Downloads freigegeben.','The payment is confirmed and downloads are available.','Uplata je potvrđena i preuzimanje je dostupno.'], noAdminGalleries:['Erstelle deine erste Galerie','Create your first gallery','Kreiraj prvu galeriju'], noAdminGalleriesText:['Lege den Shootingnamen fest, lade deine Bilder hoch und ordne den Kundenzugang zu.','Set the shooting name, upload your images and assign client access.','Postavi naziv snimanja, učitaj fotografije i dodijeli pristup klijentu.'],
  errorGeneric:['Das hat gerade nicht funktioniert. Bitte versuche es erneut.','Something went wrong. Please try again.','Nešto nije uspjelo. Pokušaj ponovo.'], errorAuth:['Die E-Mail-Adresse oder das Passwort stimmt nicht.','The email address or password is incorrect.','E-mail adresa ili lozinka nije tačna.'], errorSession:['Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.','Your session has expired. Please sign in again.','Sesija je istekla. Prijavi se ponovo.'], errorForbidden:['Für diese Aktion hast du keinen Zugriff.','You do not have access to this action.','Nemaš pristup ovoj radnji.'], errorNotFound:['Diese Galerie oder dieser Einrichtungslink ist nicht mehr verfügbar.','This gallery or setup link is no longer available.','Galerija ili link za aktivaciju više nije dostupan.'], errorRate:['Bitte warte einen Moment, bevor du es erneut versuchst.','Please wait a moment before trying again.','Sačekaj trenutak prije ponovnog pokušaja.'], errorConfig:['Diese Funktion ist noch nicht eingerichtet. Bitte melde dich bei mir.','This feature is not configured yet. Please contact me.','Ova funkcija još nije postavljena. Javi mi se.'], formInvalid:['Bitte fülle die erforderlichen Felder aus.','Please complete the required fields.','Popuni obavezna polja.'], security:['Sicherer Zugang','Secure access','Siguran pristup'], noPayment:['Es ist noch keine Zahlungsart eingerichtet. Bitte melde dich bei mir.','No payment method is configured yet. Please contact me.','Još nema postavljenog načina plaćanja. Javi mi se.'], chooseImages:['Bitte wähle zuerst Bilder aus.','Please select images first.','Prvo odaberi fotografije.'], cancel:['Abbrechen','Cancel','Otkaži'], choose:['Auswählen','Choose','Odaberi'], uploadedPreview:['Vorschau','Preview','Pregled'], delete:['Entfernen','Remove','Ukloni'], returnHome:['Zur Homepage','Back to website','Nazad na web stranicu']
};
Object.assign(rows,{
  customerPreview:['Kundenansicht · Vorschau dieser Galerie','Client view · Gallery preview','Prikaz za klijente · Pregled galerije'],
  imageOne:['{n} Bild','{n} image','{n} fotografija'], packageOne:['{n} digitales Bild','{n} digital image','{n} digitalna fotografija'],
  checkoutIntroOne:['Du hast ein Bild ausgewählt. Wähle das passende digitale Paket für deine Auswahl.','You have selected one image. Choose the digital package for your selection.','Odabrana je jedna fotografija. Izaberi odgovarajući digitalni paket.'], uploadDoneOne:['Ein Bild wurde hochgeladen.','One image has been uploaded.','Učitana je jedna fotografija.'],
  selectionLimit:['Bitte wähle höchstens 500 Bilder einzeln aus. Für eine vollständige Galerie verwende das Galeriepaket.','Please select no more than 500 individual images. Use the gallery package for a complete gallery.','Odaberi najviše 500 pojedinačnih fotografija. Za cijelu galeriju koristi paket galerije.'], downloadBatchHint:['Für große Galerien lade deine Bilder in mehreren Teil-Auswahlen herunter: höchstens 30 Bilder und insgesamt 300 MB pro Download.','For large galleries, download your images in smaller selections: no more than 30 images and 300 MB per download.','Za velike galerije preuzimaj fotografije u manjim grupama: najviše 30 fotografija i ukupno 300 MB po preuzimanju.'],
  saveBankQr:['QR-Code als Bild speichern','Save QR code as image','Spremi QR kod kao sliku'],
  shootingType:['Art des Shootings','Shooting type','Vrsta snimanja'], typeSchool:['Krippe, Kindergarten & Schule','Nursery, kindergarten & school','Jaslice, vrtić i škola'], typeMaternity:['Babybauch','Maternity','Trudnoća'], typeNewborn:['Neugeborene','Newborn','Novorođenčad'], typeFamily:['Familie','Family','Porodica'], typePortrait:['Porträt','Portrait','Portret'], typeWedding:['Hochzeit','Wedding','Vjenčanje'], typeCombo:['Kombi-Shooting','Combined shooting','Kombinovano snimanje'], typeOther:['Andere Galerie','Other gallery','Druga galerija'],
  pricingMode:['Verkaufsmodell','Pricing model','Model prodaje'], modeImages:['Einzelbilder & Bildpakete','Individual images & image packages','Pojedinačne fotografije i paketi'], modeGallery:['Gesamte Galerie / bereits bezahltes Shooting','Whole gallery / previously paid shooting','Cijela galerija / već plaćeno snimanje'], galleryPricingIntro:['Für persönliche Shootings legst du einen Gesamt- oder Restpreis als Galeriepaket an (Bildanzahl 0 = alle Bilder). Bereits bezahlte Bilder kannst du unten direkt freigeben.','For personal shootings, set a full or remaining price as a gallery package (image count 0 = all images). You can release previously paid images directly below.','Za lična snimanja postavi ukupnu ili preostalu cijenu kao paket galerije (broj fotografija 0 = sve). Već plaćene fotografije možeš direktno odobriti ispod.'], schoolPricingIntro:['Für Krippen-, Kindergarten- und Schulfotos sind Einzelbilder und frei wählbare Bildpakete vorgesehen. Die Standardpakete sind 10 € für ein Bild und 25 € für drei Bilder; du kannst sie bearbeiten.','Nursery, kindergarten and school galleries support individual images and image packages. Default packages are €10 for one image and €25 for three images; you can edit them.','Galerije za jaslice, vrtiće i škole nude pojedinačne fotografije i pakete. Standardno je 10 € za jednu i 25 € za tri fotografije; cijene možeš urediti.'],
  theme:['Galeriegestaltung','Gallery appearance','Izgled galerije'], themeWarm:['Warm · LiZa Stil','Warm · LiZa style','Toplo · LiZa stil'], themeLight:['Hell · Weiß','Light · White','Svijetlo · Bijelo'], themeDark:['Dunkel · Elegant','Dark · Elegant','Tamno · Elegantno'], gridLayout:['Bildanordnung','Image layout','Raspored fotografija'], layoutMasonry:['Masonry · Originalformate','Masonry · Original proportions','Masonry · Originalni formati'], layoutGrid:['Raster · Gleichmäßige Kacheln','Grid · Equal tiles','Mreža · Jednake pločice'], coverPosition:['Coverbild-Ausschnitt (0 = oben, 100 = unten)','Cover crop (0 = top, 100 = bottom)','Isječak naslovne fotografije (0 = vrh, 100 = dno)'],
  buyGallery:['Galerie bestellen','Order gallery','Naruči galeriju'], downloadAll:['Alle freigegebenen Bilder herunterladen','Download all released images','Preuzmi sve dostupne fotografije'], selectAllAdmin:['Alle Bilder auswählen','Select all images','Odaberi sve fotografije'], clearAdmin:['Bildauswahl aufheben','Clear image selection','Poništi izbor fotografija'], galleryPackageName:['Galerie · digital','Gallery · digital','Galerija · digitalno'], createFullPackage:['Gesamtpreis / Restpreis festlegen','Set full / remaining price','Postavi ukupnu / preostalu cijenu'], galleryNoPrice:['Deine Galerie wird persönlich freigegeben. Wenn noch eine Zahlung offen ist, bekommst du die Informationen von mir.','Your gallery is released personally. If a payment is outstanding, I will send you the details.','Tvoju galeriju ću lično odobriti. Ako postoji preostala uplata, poslat ću ti informacije.'],
  bankQrTitle:['Mit deiner Banking-App scannen','Scan with your banking app','Skeniraj bankovnom aplikacijom'], bankQrAlt:['QR-Code für die Überweisung dieser Bestellung','QR code for this order’s bank transfer','QR kod za bankovnu uplatu ove narudžbe'], bankQrHint:['Prüfe Empfängerin, Betrag und Verwendungszweck in deiner Banking-App vor der Freigabe.','Check the recipient, amount and reference in your banking app before confirming.','Provjeri primatelja, iznos i svrhu uplate u bankovnoj aplikaciji prije potvrde.'], bankQrUnavailable:['Der Überweisungs-QR-Code ist nicht verfügbar. Nutze bitte die Bankdaten oben.','The bank-transfer QR code is unavailable. Please use the bank details above.','QR kod za uplatu nije dostupan. Koristi bankovne podatke iznad.'], bankAdminMissing:['Die Bankverbindung ist noch nicht eingerichtet. Hinterlege BANK_RECIPIENT und BANK_IBAN in der Serverkonfiguration, bevor du Bestellungen annimmst.','Bank details are not configured yet. Set BANK_RECIPIENT and BANK_IBAN in the server configuration before accepting orders.','Bankovni podaci još nisu postavljeni. Postavi BANK_RECIPIENT i BANK_IBAN u konfiguraciji servera prije primanja narudžbi.'],
  inactive:['Nicht angeboten','Not offered','Nije u ponudi'],
  edit:['Bearbeiten','Edit','Uredi'], save:['Speichern','Save','Spremi'], activePackage:['Paket zur Bestellung anbieten','Offer package for purchase','Ponudi paket za kupovinu'],
  revoke:['Zugang entziehen','Revoke access','Ukini pristup'], revokeConfirm:['Diesen Zugang zu dieser Galerie wirklich entziehen? Andere Galerien des Kunden bleiben erhalten.','Revoke this client’s access to this gallery? Their other galleries will remain available.','Ukinuti pristup ovog klijenta ovoj galeriji? Ostale galerije ostaju dostupne.'], revoked:['Der Galeriezugang wurde entzogen.','Gallery access has been revoked.','Pristup galeriji je ukinut.'],
  receiptPending:['Bezahlt · Bestätigung wird versendet','Paid · Confirmation pending','Plaćeno · Čeka se potvrda'], resendReceipt:['Bestätigung erneut senden','Resend confirmation','Ponovo pošalji potvrdu'],
  withdrawal:['Rücktritt erklären','Request withdrawal','Izjavi odustajanje'], withdrawalConfirm:['Möchtest du den Rücktritt von dieser Bestellung erklären? Ich prüfe deine Erklärung. Bereits bereitgestellte digitale Fotos können vom Rücktritt ausgeschlossen sein. Es erfolgt keine automatische Erstattung.','Do you wish to withdraw from this order? I will review your request. Digital images already supplied may be excluded from withdrawal. This does not trigger an automatic refund.','Želiš li odustati od ove narudžbe? Provjerit ću tvoju izjavu. Već isporučene digitalne fotografije mogu biti isključene iz prava na odustajanje. Povrat novca nije automatski.'], withdrawalSaved:['Deine Rücktrittserklärung wurde gespeichert. Du erhältst eine Eingangsbestätigung per E-Mail.','Your withdrawal request has been recorded. You will receive an acknowledgment by email.','Izjava o odustajanju je spremljena. Potvrda primitka stiže e-mailom.'], withdrawalRequested:['Rücktritt zur Prüfung eingegangen','Withdrawal request received','Primljena izjava o odustajanju'],
  refunded:['Erstattet','Refunded','Vraćen novac'], markRefunded:['Erstattung vermerken','Record refund','Evidentiraj povrat'], refundConfirm:['Nur bestätigen, wenn du die Zahlung bereits außerhalb dieses Portals erstattet hast. Hier wird keine Bank- oder PayPal-Erstattung ausgeführt. Gekaufte Downloads werden gesperrt.','Confirm only after refunding the payment outside this portal. This does not refund money through your bank or PayPal. Purchased downloads will be blocked.','Potvrdi samo nakon što vratiš uplatu izvan ovog portala. Ovdje se ne izvršava bankovni ili PayPal povrat. Kupljeno preuzimanje će se blokirati.'], refundedSaved:['Die externe Erstattung wurde vermerkt.','The external refund has been recorded.','Povrat izvan portala je evidentiran.']
});
Object.assign(rows,{
  coverLayout:['Covergestaltung','Cover layout','Izgled naslovnice'], coverOverlay:['Foto mit Titel','Photo with title','Fotografija s naslovom'], coverSplit:['Foto & Titel nebeneinander','Photo & title side by side','Fotografija i naslov jedno pored drugog'], coverEditorial:['Foto mit Titel darunter','Photo with title below','Fotografija s naslovom ispod'],
  coverHeight:['Coverhöhe','Cover height','Visina naslovnice'], heightCompact:['Kompakt','Compact','Kompaktno'], heightStandard:['Standard','Standard','Standardno'], heightLarge:['Großzügig','Large','Veliko'],
  gridDensity:['Bildgröße im Raster','Image size in grid','Veličina fotografija u mreži'], densityComfortable:['Mittel','Medium','Srednje'], densityCompact:['Klein · mehr Bilder','Small · more images','Male · više fotografija'], densitySpacious:['Groß · mehr Raum','Large · more space','Velike · više prostora'], gridGap:['Abstand zwischen Bildern (8–40 px)','Image spacing (8–40 px)','Razmak između fotografija (8–40 px)'], showFilenames:['Bildnamen anzeigen','Show image filenames','Prikaži nazive fotografija'],
  customerFavourites:['Kundenfavoriten','Client favourites','Favoriti klijenata'], customerFavouritesIntro:['Herzen und Namen zeigen die Auswahl deiner Kunden. Wähle einen Kunden, um dessen Favoriten für zusätzliche Downloads freizugeben.','Hearts and names show your clients’ choices. Choose a client to release their favourites as additional downloads.','Srca i imena prikazuju izbor klijenata. Odaberi klijenta da odobriš njegove favorite za dodatno preuzimanje.'], favouriteCustomer:['Favoriten filtern','Filter favourites','Filtriraj favorite'], allCustomerFavourites:['Alle Kundenfavoriten ({n})','All client favourites ({n})','Svi favoriti klijenata ({n})'], customerFavouriteCount:['Von {n} Kunden favorisiert','Favourited by {n} clients','Favorit za {n} klijenata'], noCustomerFavourites:['Noch keine Kundenfavoriten','No client favourites yet','Još nema favorita klijenata'], refreshFavourites:['Aktualisieren','Refresh','Osvježi'], favouritesRefreshed:['Die Kundenfavoriten wurden aktualisiert.','Client favourites have been refreshed.','Favoriti klijenata su osvježeni.'],
  imageOrder:['Bildreihenfolge','Image order','Redoslijed fotografija'], sortChoose:['Sortierung wählen','Choose sorting','Odaberi sortiranje'], filenameAscending:['Bildname A–Z','Filename A–Z','Naziv A–Z'], filenameDescending:['Bildname Z–A','Filename Z–A','Naziv Z–A'], moveImageUp:['Vor','Earlier','Ranije'], moveImageDown:['Zurück','Later','Kasnije'], movePhotoUp:['{name} nach vorne verschieben','Move {name} earlier','Pomjeri {name} ranije'], movePhotoDown:['{name} nach hinten verschieben','Move {name} later','Pomjeri {name} kasnije'], saveImageOrder:['Reihenfolge speichern','Save image order','Spremi redoslijed'], resetImageOrder:['Änderungen verwerfen','Discard changes','Odbaci izmjene'], imageOrderUnsaved:['Reihenfolge noch nicht gespeichert','Image order has not been saved','Redoslijed još nije spremljen'], imageOrderSaved:['Reihenfolge gespeichert','Image order saved','Redoslijed je spremljen'], discardOrderConfirm:['Die neue Bildreihenfolge ist noch nicht gespeichert. Änderungen verwerfen und diese Ansicht verlassen?','The new image order has not been saved. Discard the changes and leave this view?','Novi redoslijed nije spremljen. Odbaciti izmjene i napustiti ovaj prikaz?'],
  notificationPending:['Die Freigabe ist gespeichert. Die E-Mail wurde noch nicht zugestellt. Bitte versuche den Versand erneut.','The release is saved. The email has not been delivered yet. Please retry sending it.','Odobrenje je spremljeno. E-mail još nije dostavljen. Pokušaj ponovo poslati.'], retryNotification:['E-Mail erneut senden','Retry email','Ponovo pošalji e-mail'], notificationSent:['Die ausstehenden E-Mails wurden versendet.','Pending emails have been sent.','E-mailovi na čekanju su poslani.'],
  invoicePdf:['Rechnung (PDF)','Invoice (PDF)','Račun (PDF)'], invoiceIntro:['Ordne die Rechnung einem Kunden dieser Galerie zu und lade sie hoch, bevor er bestellt. Sie wird seiner Bestellbestätigung beigefügt und bleibt in seinem Zugang abrufbar. PDF bis 5 MB.','Assign the invoice to a client in this gallery and upload it before they place an order. It is attached to their order confirmation and remains available in their account. PDF up to 5 MB.','Dodijeli račun klijentu ove galerije i učitaj ga prije nego što naruči. Račun se prilaže potvrdi narudžbe i ostaje dostupan na njegovom računu. PDF do 5 MB.'], invoiceFile:['PDF-Datei','PDF file','PDF datoteka'], uploadInvoice:['Rechnung hochladen','Upload invoice','Učitaj račun'], replaceInvoice:['Rechnung ersetzen','Replace invoice','Zamijeni račun'], removeInvoice:['Rechnung entfernen','Remove invoice','Ukloni račun'], currentInvoice:['Aktuelle Rechnung','Current invoice','Trenutni račun'], noInvoice:['Für diesen Kunden ist noch keine Rechnung hinterlegt.','No invoice has been uploaded for this client yet.','Za ovog klijenta još nema učitanog računa.'], chooseInvoiceCustomer:['Wähle den Kunden für diese Rechnung.','Choose the client for this invoice.','Odaberi klijenta za ovaj račun.'], invoiceUploaded:['Die Rechnung wurde gespeichert.','The invoice has been saved.','Račun je spremljen.'], invoiceRemoved:['Die Rechnung wurde entfernt.','The invoice has been removed.','Račun je uklonjen.'], invoiceType:['Bitte wähle eine PDF-Datei.','Please choose a PDF file.','Odaberi PDF datoteku.'], invoiceSize:['Die PDF-Datei darf höchstens 5 MB groß sein.','The PDF file must be no larger than 5 MB.','PDF datoteka ne smije biti veća od 5 MB.'], downloadInvoice:['Rechnung herunterladen','Download invoice','Preuzmi račun']
});
Object.assign(rows,{
  "galleryOverview": [
    "Galerien",
    "Galleries",
    "Galerije"
  ],
  "yourStudio": [
    "Dein Fotostudio",
    "Your photo studio",
    "Tvoj foto studio"
  ],
  "galleryEditor": [
    "Galerie bearbeiten",
    "Edit gallery",
    "Uredi galeriju"
  ],
  "design": [
    "Design",
    "Design",
    "Dizajn"
  ],
  "gallerySettings": [
    "Galerie-Einstellungen",
    "Gallery settings",
    "Postavke galerije"
  ],
  "studioSettings": [
    "Einstellungen",
    "Settings",
    "Postavke"
  ],
  "activity": [
    "Aktivitäten",
    "Activity",
    "Aktivnosti"
  ],
  "search": [
    "Suchen",
    "Search",
    "Pretraži"
  ],
  "dateFrom": [
    "Ab Datum",
    "From date",
    "Od datuma"
  ],
  "sort": [
    "Sortieren",
    "Sort",
    "Sortiraj"
  ],
  "dateNewest": [
    "Neueste zuerst",
    "Newest first",
    "Najnovije prvo"
  ],
  "dateOldest": [
    "Älteste zuerst",
    "Oldest first",
    "Najstarije prvo"
  ],
  "resetFilters": [
    "Filter zurücksetzen",
    "Reset filters",
    "Poništi filtere"
  ],
  "noResults": [
    "Keine passenden Einträge.",
    "No matching results.",
    "Nema odgovarajućih rezultata."
  ],
  "allGalleries": [
    "Alle Galerien",
    "All galleries",
    "Sve galerije"
  ],
  "livePreview": [
    "Direkte Vorschau",
    "Live preview",
    "Pregled uživo"
  ],
  "desktop": [
    "Desktop",
    "Desktop",
    "Računar"
  ],
  "mobile": [
    "Handy",
    "Mobile",
    "Mobitel"
  ],
  "typography": [
    "Schriftstil",
    "Typography",
    "Tipografija"
  ],
  "typeSerif": [
    "Elegant",
    "Elegant",
    "Elegantno"
  ],
  "typeSans": [
    "Modern",
    "Modern",
    "Moderno"
  ],
  "typeEditorial": [
    "Editorial · kursiv",
    "Editorial · italic",
    "Editorial · kurziv"
  ],
  "coverDecoration": [
    "Cover-Akzent",
    "Cover accent",
    "Ukras naslovnice"
  ],
  "decorationNone": [
    "Ohne Akzent",
    "No accent",
    "Bez ukrasa"
  ],
  "decorationFrame": [
    "Feiner Rahmen",
    "Fine frame",
    "Tanki okvir"
  ],
  "decorationStripe": [
    "Seitliche Linie",
    "Side line",
    "Bočna linija"
  ],
  "editImage": [
    "Bild bearbeiten",
    "Edit image",
    "Uredi fotografiju"
  ],
  "imageName": [
    "Bildname",
    "Image name",
    "Naziv fotografije"
  ],
  "deleteImageConfirm": [
    "Dieses Bild dauerhaft entfernen? Bestellte Bilder bleiben geschützt und können nicht gelöscht werden.",
    "Permanently remove this image? Images included in orders are protected and cannot be deleted.",
    "Trajno ukloniti fotografiju? Naručene fotografije su zaštićene i ne mogu se obrisati."
  ],
  "imageDeleted": [
    "Das Bild wurde entfernt.",
    "The image has been removed.",
    "Fotografija je uklonjena."
  ],
  "imageWatermarkHint": [
    "Das hochgeladene Original bleibt unverändert. Wasserzeichen werden nur in die verkleinerte Vorschau eingebettet.",
    "The uploaded original remains unchanged. Watermarks are embedded only in the reduced preview.",
    "Učitani original ostaje nepromijenjen. Vodeni žig se dodaje samo umanjenom pregledu."
  ],
  "watermark": [
    "Wasserzeichen & Vorschauen",
    "Watermarks & previews",
    "Vodeni žig i pregledi"
  ],
  "watermarkMode": [
    "Wasserzeichen dieser Galerie",
    "Gallery watermark",
    "Vodeni žig galerije"
  ],
  "watermarkInherit": [
    "Allgemeine Einstellung verwenden",
    "Use studio default",
    "Koristi opću postavku"
  ],
  "watermarkOn": [
    "Wasserzeichen einschalten",
    "Enable watermark",
    "Uključi vodeni žig"
  ],
  "watermarkOff": [
    "Ohne Wasserzeichen",
    "No watermark",
    "Bez vodenog žiga"
  ],
  "watermarkIntro": [
    "Kunden sehen vor der Freigabe eine kleinere Vorschau. Nach der Freigabe stehen die saubere Vorschau und das unveränderte Original bereit.",
    "Clients see a smaller preview before release. After release, the clean preview and unchanged original are available.",
    "Klijenti prije odobrenja vide manji pregled. Nakon odobrenja dostupni su čisti pregled i nepromijenjeni original."
  ],
  "watermarkDefault": [
    "Neue und bestehende Galerien standardmäßig mit Wasserzeichen schützen",
    "Protect new and existing galleries with a watermark by default",
    "Standardno zaštiti nove i postojeće galerije vodenim žigom"
  ],
  "watermarkText": [
    "Text des Wasserzeichens",
    "Watermark text",
    "Tekst vodenog žiga"
  ],
  "watermarkSize": [
    "Schriftgröße (12–96)",
    "Text size (12–96)",
    "Veličina teksta (12–96)"
  ],
  "watermarkOpacity": [
    "Deckkraft (0,1–1)",
    "Opacity (0.1–1)",
    "Neprozirnost (0,1–1)"
  ],
  "watermarkPosition": [
    "Position",
    "Position",
    "Položaj"
  ],
  "positionCenter": [
    "Mittig",
    "Centre",
    "Sredina"
  ],
  "positionDiagonal": [
    "Diagonal · wiederholt",
    "Diagonal · repeated",
    "Dijagonalno · ponovljeno"
  ],
  "positionBottomRight": [
    "Unten rechts",
    "Bottom right",
    "Dolje desno"
  ],
  "watermarkExisting": [
    "Nach einer Änderung: Öffne bestehende Galerien und klicke bei „Bilder“ auf „Vorschauen aktualisieren“. Bis dahin zeigt das Portal bei nicht freigegebenen Bildern einen geschützten Platzhalter. Neue Uploads erhalten das Wasserzeichen automatisch.",
    "After changing this setting, open existing galleries and click Update previews under Photographs. Until then, unreleased images show a protected placeholder. New uploads receive the watermark automatically.",
    "Nakon promjene otvori postojeće galerije i pod Fotografije klikni Ažuriraj preglede. Do tada neodobrene fotografije prikazuju zaštićeni placeholder. Novi prijenosi automatski dobijaju vodeni žig."
  ],
  "previewPending": [
    "Geschützte Vorschau aktualisieren",
    "Update protected preview",
    "Ažuriraj zaštićeni pregled"
  ],
  "regeneratePreviews": [
    "Vorschauen aktualisieren",
    "Update previews",
    "Ažuriraj preglede"
  ],
  "previewProgress": [
    "Vorschau {n} von {total}",
    "Preview {n} of {total}",
    "Pregled {n} od {total}"
  ],
  "previewsReady": [
    "Alle Vorschauen wurden aktualisiert.",
    "All previews have been updated.",
    "Svi pregledi su ažurirani."
  ],
  "protectedPreviewNote": [
    "Wasserzeichen aktiv. Originale bleiben unverändert; Kunden ohne Freigabe sehen nur die geschützte Vorschau.",
    "Watermark enabled. Originals stay unchanged; clients without release see only the protected preview.",
    "Vodeni žig je uključen. Originali ostaju nepromijenjeni; klijenti bez odobrenja vide samo zaštićeni pregled."
  ],
  "cleanPreviewNote": [
    "Für diese Galerie ist kein Wasserzeichen aktiv. Original-Downloads benötigen weiterhin eine Freigabe.",
    "Watermarks are disabled for this gallery. Original downloads still require release.",
    "Vodeni žig je isključen za ovu galeriju. Preuzimanje originala i dalje zahtijeva odobrenje."
  ],
  "emailSettings": [
    "E-Mail-Texte",
    "Email text",
    "Tekst e-mailova"
  ],
  "emailSettingsIntro": [
    "Betreff und Einleitung kannst du hier anpassen. Leere Felder verwenden die gestaltete Standardvorlage. Logo, persönliche Anrede, Bestelldaten und Pflichtinformationen bleiben erhalten.",
    "Customize the subject and introduction here. Empty fields use the designed default template. Logo, personal greeting, order details and required information are preserved.",
    "Ovdje možeš prilagoditi naslov i uvod. Prazna polja koriste standardni predložak. Logo, lični pozdrav, podaci narudžbe i obavezne informacije ostaju."
  ],
  "emailSubject": [
    "Eigener Betreff (optional)",
    "Custom subject (optional)",
    "Vlastiti naslov (opcionalno)"
  ],
  "emailIntro": [
    "Eigene Einleitung (optional)",
    "Custom introduction (optional)",
    "Vlastiti uvod (opcionalno)"
  ],
  "emailKind_invite": [
    "Galerie-Einladung",
    "Gallery invitation",
    "Pozivnica za galeriju"
  ],
  "emailKind_setup": [
    "Zugang einrichten",
    "Set up access",
    "Postavljanje pristupa"
  ],
  "emailKind_reset": [
    "Passwort zurücksetzen",
    "Reset password",
    "Reset lozinke"
  ],
  "emailKind_order": [
    "Bestellbestätigung",
    "Order confirmation",
    "Potvrda narudžbe"
  ],
  "emailKind_download": [
    "Download-Freigabe",
    "Download release",
    "Odobrenje preuzimanja"
  ],
  "settingsSaved": [
    "Einstellungen gespeichert. Bestehende Vorschauen bei Bedarf in der Galerie aktualisieren.",
    "Settings saved. Update existing gallery previews if needed.",
    "Postavke spremljene. Po potrebi ažuriraj postojeće preglede u galeriji."
  ],
  "activityIntro": [
    "Hier erscheinen Kundenfavoriten und gestartete Downloads. Ein Eintrag bestätigt den Download-Aufruf, nicht das Speichern auf dem Gerät. Aktivitäten werden 90 Tage aufbewahrt.",
    "Client favourites and started downloads appear here. An entry confirms the download request, not that the file was saved on the device. Activity is retained for 90 days.",
    "Ovdje se prikazuju favoriti klijenata i započeta preuzimanja. Unos potvrđuje zahtjev za preuzimanje, ne spremanje na uređaj. Aktivnosti se čuvaju 90 dana."
  ],
  "activityDownload": [
    "Download gestartet",
    "Download started",
    "Preuzimanje započeto"
  ],
  "activityFavourite": [
    "Als Favorit markiert",
    "Added to favourites",
    "Dodano u favorite"
  ],
  "activityUnfavourite": [
    "Favorit entfernt",
    "Removed from favourites",
    "Uklonjeno iz favorita"
  ],
  "markRead": [
    "Als gelesen markieren",
    "Mark as read",
    "Označi pročitano"
  ],
  "noActivity": [
    "Noch keine Kundenaktivitäten.",
    "No client activity yet.",
    "Još nema aktivnosti klijenata."
  ],
  "loadMore": [
    "Weitere laden",
    "Load more",
    "Učitaj više"
  ],
  "copy": [
    "Kopieren",
    "Copy",
    "Kopiraj"
  ],
  "copied": [
    "In die Zwischenablage kopiert.",
    "Copied to clipboard.",
    "Kopirano u međuspremnik."
  ],
  "copyManual": [
    "Der Wert ist markiert. Wähle „Kopieren“.",
    "The value is selected. Choose Copy.",
    "Vrijednost je označena. Odaberi Kopiraj."
  ],
  "imageInOrder": [
    "Dieses Bild gehört zu einer Bestellung und kann nicht entfernt werden.",
    "This image belongs to an order and cannot be removed.",
    "Fotografija pripada narudžbi i ne može se ukloniti."
  ]
});
Object.assign(rows,{newActivity:['Neue Kundenaktivität – unter Aktivitäten ansehen.','New client activity — view Activity.','Nova aktivnost klijenta — pogledaj Aktivnosti.']});
Object.assign(rows,{regeneratePreview:['Wasserzeichen aktualisieren','Update watermark','Ažuriraj vodeni žig']});
Object.assign(rows,{
  packageAutoHint:['Die günstigste Zusammenstellung ist vorausgewählt. Passende Pakete und zusätzliche Einzelbilder werden automatisch verrechnet.','The lowest-priced combination is preselected. Matching packages and additional individual images are calculated automatically.','Najpovoljnija kombinacija je unaprijed odabrana. Odgovarajući paketi i dodatne pojedinačne fotografije obračunavaju se automatski.'],
  choosePackage:['Dein Paket wählen','Choose your package','Odaberi svoj paket'],
  editSelection:['Bildauswahl ändern','Change image selection','Promijeni izbor fotografija'],
  packageChooseImages:['Wähle zuerst deine Bilder aus.','Select your images first.','Prvo odaberi fotografije.'],
  packageNeedsMore:['Noch {n} auswählen, um dieses Paket zu nutzen.','Select {n} more to use this package.','Odaberi još {n} za ovaj paket.'],
  packageNeedsAll:['Noch {n} auswählen – dieses Paket gilt für alle Bilder.','Select {n} more — this package includes every image.','Odaberi još {n} — ovaj paket uključuje sve fotografije.'],
  packageCannotComplete:['Diese Auswahl lässt sich mit den verfügbaren Paketen nicht vollständig zusammenstellen. Bitte ändere die Bildanzahl.','The available packages cannot cover this selection exactly. Please change the image count.','Dostupni paketi ne mogu tačno pokriti ovaj izbor. Promijeni broj fotografija.'],
  packageAmountLimit:['Bitte melde dich für diese große Bestellung direkt bei mir.','Please contact me directly for this large order.','Za ovu veliku narudžbu kontaktiraj me direktno.'],
  packageNeedsSingle:['Für zusätzliche Bilder ist noch kein Einzelpreis hinterlegt. Wähle ein Vielfaches der Paketgröße.','No single-image price is available for additional images. Select a multiple of the package size.','Cijena dodatne pojedinačne fotografije još nije unesena. Odaberi višekratnik veličine paketa.'],
  packageMultiple:['{quantity} × {name}','{quantity} × {name}','{quantity} × {name}'],
  packageCombination:['{quantity} × {name} + {n} einzeln zu je {price}','{quantity} × {name} + {n} individual at {price} each','{quantity} × {name} + {n} pojedinačno po {price}'],
  packageSelectionTotal:['für deine Auswahl','for your selection','za tvoj izbor'],
  packageBasePrice:['Paketpreis','Package price','Cijena paketa'],
  packageUnitPrice:['je {price}','{price} each','po {price}'],
  checkoutSummary:['Deine Zusammenstellung','Your order breakdown','Pregled tvoje narudžbe'],
  noEligiblePackage:['Für deine Auswahl ist noch kein passendes Paket verfügbar. Bitte ändere deine Bildauswahl.','No package matches your selection yet. Please change your image selection.','Još nema paketa koji odgovara tvom izboru. Promijeni izbor fotografija.'],
  packagePriceChanged:['Die verfügbaren Pakete oder Preise wurden inzwischen geändert. Bitte lade die Galerie neu und prüfe die aktuelle Summe. Es wurde keine neue Bestellung aufgegeben.','The available packages or prices have changed. Please reload the gallery and check the current total. No new order was placed.','Dostupni paketi ili cijene su promijenjeni. Ponovo učitaj galeriju i provjeri novi iznos. Nova narudžba nije napravljena.']
});
Object.assign(rows,{
  orderPaidBlocked:['Bezahlt · Downloads gesperrt','Paid · Downloads blocked','Plaćeno · Preuzimanja blokirana'],
  orderPaidPartlyBlocked:['Bezahlt · Downloads teilweise gesperrt','Paid · Some downloads blocked','Plaćeno · Neka preuzimanja blokirana'],
  revokeDownloads:['Freigabe zurücknehmen','Revoke download access','Ukini odobrenje za preuzimanje'],
  revokeDownloadsHint:['Die Freigabe gilt für den ausgewählten Kunden. Eine Sperre gilt auch für bezahlte Bilder; Bestellungen bleiben erhalten. Bereits gespeicherte Dateien lassen sich nicht zurückholen.','Access applies to the selected customer. Revocation also blocks purchased images; orders remain unchanged. Previously downloaded files cannot be recalled.','Odobrenje vrijedi za odabranog klijenta. Zabrana važi i za plaćene fotografije; narudžbe ostaju sačuvane. Već preuzete datoteke ne mogu se povući.'],
  revokeDownloadsConfirm:['Downloadfreigabe für {n} ausgewählte Bilder für {name} zurücknehmen? Auch bezahlte Bilder werden gesperrt. Du kannst sie später erneut freigeben.','Revoke download access to {n} selected images for {name}? Purchased images will also be blocked. You can release them again later.','Ukinuti preuzimanje {n} odabranih fotografija za {name}? I plaćene fotografije će biti blokirane. Kasnije ih možeš ponovo odobriti.'],
  downloadsRevoked:['Die ausgewählten Downloads wurden für diesen Kunden gesperrt.','The selected downloads have been blocked for this customer.','Odabrana preuzimanja su blokirana za ovog klijenta.'],
  downloadBlocked:['Für gewählten Kunden: gesperrt','Selected customer: blocked','Odabrani klijent: blokirano'],
  downloadReleased:['Für gewählten Kunden: freigegeben','Selected customer: released','Odabrani klijent: odobreno'],
  downloadNotReleased:['Für gewählten Kunden: nicht freigegeben','Selected customer: not released','Odabrani klijent: nije odobreno'],
  imageWatermarkMode:['Wasserzeichen für dieses Bild','Watermark for this image','Vodeni žig za ovu fotografiju'],
  imageWatermarkInherit:['Galerie-Einstellung übernehmen','Use gallery setting','Koristi postavku galerije'],
  imageWatermarkOverrideHint:['Diese Einstellung gilt nur für dieses Bild und hat Vorrang vor der Galerie-Einstellung. Nach der Downloadfreigabe sieht der jeweilige Kunde es weiterhin ohne Wasserzeichen. Beim Einschalten wird die geschützte Vorschau bei Bedarf automatisch erstellt.','This setting overrides the gallery setting for this image only. Customers with download access still see it without a watermark. Enabling protection automatically prepares the preview if needed.','Ova postavka ima prednost nad postavkom galerije samo za ovu fotografiju. Klijenti s odobrenim preuzimanjem je i dalje vide bez vodenog žiga. Zaštićeni pregled se po potrebi automatski kreira.'],
  imagePreparingWatermark:['Die Wasserzeichen-Vorschau wird erstellt. Bitte lasse diese Seite geöffnet.','Preparing the watermarked preview. Please keep this page open.','Kreira se pregled s vodenim žigom. Ostavi ovu stranicu otvorenu.'],
  imageControlsMigration:['Bitte führe zuerst die Datenbank-Erweiterung für die Bildeinstellungen aus.','Please apply the image controls database migration first.','Prvo primijeni proširenje baze podataka za postavke fotografija.']
});

Object.assign(rows, {
  packageRequiredPending:['Für dein Buchungspaket gibt es bereits eine offene Bestellung unter „Deine Bestellungen“. Für eine andere Bildauswahl melde dich bitte bei Emina.','There is already an open booking order under Your orders. Contact Emina to change your image selection.','Već postoji otvorena narudžba rezervisanog paketa pod Tvoje narudžbe. Za promjenu fotografija javi se Emini.'],
  packageRequiredProcessing:['Dein Buchungspaket ist bereits bezahlt. Die Bestätigung wird noch vorbereitet. Bitte warte kurz und lade die Seite neu.','Your booking package is already paid. Its confirmation is still being prepared. Please wait and reload.','Tvoj rezervisani paket je već plaćen. Potvrda se još priprema. Sačekaj pa osvježi stranicu.'],
  deleteGalleryChanged:['Der Galeriename wurde währenddessen geändert. Lade die Galerie neu und bestätige das Löschen erneut.','The gallery name changed. Reload the gallery and confirm deletion again.','Naziv galerije je u međuvremenu promijenjen. Osvježi galeriju i ponovo potvrdi brisanje.'],
  packageRequiredActiveOnly:['Ein Pflichtpaket muss aktiv bleiben. Entferne zuerst die Markierung als Pflichtpaket, bevor du es deaktivierst.','A required package must remain active. Remove its required status before deactivating it.','Obavezni paket mora biti aktivan. Prvo ukloni oznaku obaveznog paketa prije deaktiviranja.'],
  pendingOrderCannotCancel:['Nur eine noch unbezahlte Überweisungsbestellung kann hier storniert werden. Bitte lade die Bestellungen neu.','Only an unpaid bank-transfer order can be cancelled here. Please reload the orders.','Ovdje se može otkazati samo neplaćena narudžba putem bankovnog transfera. Osvježi narudžbe.'],
  cancelPendingOrder:['Offene Bestellung stornieren','Cancel unpaid order','Otkaži neplaćenu narudžbu'],
  cancelPendingOrderConfirm:['Diese noch unbezahlte Überweisungsbestellung stornieren? Danach kann der Kunde seine Bildauswahl neu bestellen. Bitte nur bestätigen, wenn keine Zahlung eingegangen ist. Die bisherigen Unterlagen bleiben erhalten.','Cancel this unpaid bank-transfer order? The customer can then place a new image selection. Confirm only if no payment has arrived. Existing documents are retained.','Otkazati ovu neplaćenu narudžbu putem bankovnog transfera? Klijent zatim može naručiti novi izbor fotografija. Potvrdi samo ako uplata nije stigla. Postojeći dokumenti ostaju sačuvani.'],
  pendingOrderCancelled:['Die offene Bestellung wurde storniert. Eine neue Bildauswahl kann bestellt werden.','The unpaid order was cancelled. A new selection can be ordered.','Neplaćena narudžba je otkazana. Novi izbor fotografija se može naručiti.'],
  packageRequiredOption:['Verpflichtendes Buchungspaket','Required booking package','Obavezni rezervisani paket'],
  packageRequiredBadge:['Gebuchtes Pflichtpaket','Required booked package','Obavezni rezervisani paket'],
  packageRequiredAdminHint:['Ein Pflichtpaket pro Galerie. Es wird pro Kundenzugang einmal bezahlt. Darüber hinaus ausgewählte Bilder werden mit den übrigen aktiven Paketen am günstigsten berechnet. Ein neues Pflichtpaket ersetzt das bisherige.','One required package per gallery, paid once per customer. Extra selected images use the cheapest combination of the other active packages. A new required package replaces the previous one.','Jedan obavezni paket po galeriji, plaća se jednom po klijentu. Dodatne fotografije obračunavaju se najpovoljnijom kombinacijom ostalih aktivnih paketa. Novi obavezni paket zamjenjuje prethodni.'],
  packageRequiredCheckoutHint:['Dein gebuchtes Paket ist verbindlich enthalten. Wähle mindestens die darin enthaltene Bildanzahl. Weitere Bilder berechnen wir automatisch mit der günstigsten Kombination der Zusatzpakete.','Your booked package is required. Select at least its included number of images. Additional images automatically use the cheapest combination of extra packages.','Tvoj rezervisani paket je obavezan. Odaberi najmanje broj fotografija uključen u paket. Dodatne fotografije automatski obračunavamo najpovoljnijom kombinacijom dodatnih paketa.'],
  packageRequiredPaidHint:['Dein Buchungspaket ist bereits bezahlt. Hier werden nur deine zusätzlich ausgewählten Bilder berechnet.','Your booking package is already paid. Only your extra selected images are charged here.','Tvoj rezervisani paket je već plaćen. Ovdje se obračunavaju samo dodatno odabrane fotografije.'],
  packageRequiredExtra:['Zusatzpaket · wird für weitere Bilder automatisch berücksichtigt','Extra package · automatically considered for additional images','Dodatni paket · automatski se uzima u obzir za dodatne fotografije'],
  packageRequiredPaid:['Bereits bezahlt','Already paid','Već plaćeno'],
  packageRequiredMigration:['Bitte zuerst die Datenbank-Erweiterung für Pflichtpakete ausführen.','Please apply the required packages database migration first.','Prvo primijeni proširenje baze za obavezne pakete.'],
  deleteGallery:['Galerie löschen','Delete gallery','Izbriši galeriju'],
  deleteGalleryHint:['Die Galerie wird für alle Zugänge entfernt. Ihre Originalfotos und Vorschauen werden dauerhaft gelöscht. Bestell-, Rechnungs- und Zahlungsunterlagen bleiben erhalten. Dieser Vorgang lässt sich nicht rückgängig machen.','The gallery is removed for all users. Its original photos and previews are permanently deleted. Order, invoice and payment records are retained. This cannot be undone.','Galerija se uklanja za sve korisnike. Originalne fotografije i pregledi se trajno brišu. Narudžbe, računi i podaci o plaćanju ostaju sačuvani. Ovo se ne može poništiti.'],
  deleteGalleryStep:['Bestätigung {n} von 2','Confirmation {n} of 2','Potvrda {n} od 2'],
  deleteGalleryNext:['Weiter zum Löschen','Continue to deletion','Nastavi na brisanje'],
  deleteGalleryFinal:['Galerie endgültig löschen','Permanently delete gallery','Trajno izbriši galeriju'],
  deleteGalleryTypeHint:['Gib zur zweiten Bestätigung den oben angezeigten Galerienamen exakt ein.','For the second confirmation, type the exact gallery name shown above.','Za drugu potvrdu unesi tačan naziv galerije prikazan iznad.'],
  deleteGalleryNameMismatch:['Der eingegebene Galeriename stimmt nicht überein.','The gallery name does not match.','Naziv galerije se ne podudara.'],
  galleryDeleted:['Die Galerie und ihre Fotodateien wurden gelöscht. Bestellunterlagen bleiben erhalten.','The gallery and its photos were deleted. Order records are retained.','Galerija i fotografije su izbrisane. Dokumenti narudžbi ostaju sačuvani.'],
  deleteGalleryCleanupPending:['Die Galerie ist gesperrt. Einige Fotodateien müssen noch entfernt werden. Bitte schließe die Löschung in der Galerieübersicht ab.','The gallery is blocked. Some photo files still need removal. Finish deletion in the gallery overview.','Galerija je blokirana. Neke datoteke još treba ukloniti. Dovrši brisanje u pregledu galerija.'],
  finishGalleryDeletion:['Dateilöschung abschließen','Finish deleting files','Dovrši brisanje datoteka'],
  pendingGalleryDeletions:['Ausstehende Dateilöschungen','Pending photo deletions','Brisanje datoteka na čekanju']
});
Object.assign(rows, {
  activityReadInvalid:['Der Zeitpunkt der Aktivitäten konnte nicht übernommen werden. Aktualisiere die Liste und versuche es erneut.','The activity timestamp could not be used. Refresh the list and try again.','Vrijeme aktivnosti nije moglo biti preuzeto. Osvježi listu i pokušaj ponovo.'],
  activityReadSaved:['Die bisherigen Aktivitäten sind als gelesen markiert.','The previous activities are marked as read.','Prethodne aktivnosti su označene kao pročitane.'],
  packageOrderHint:['Mit den Pfeilen legst du die Reihenfolge für deine Kunden fest. Änderungen werden sofort gespeichert. Die günstigste Preisberechnung bleibt unabhängig davon.','Use the arrows to set the order shown to customers. Changes save immediately. The cheapest price calculation is independent of this order.','Strelicama odredi redoslijed za klijente. Promjene se odmah spremaju. Najpovoljniji obračun cijene ne zavisi od redoslijeda.'],
  packageOrderMigration:['Bitte führe zuerst das Datenbank-Update für die Paketreihenfolge aus.','Apply the package ordering database update first.','Prvo primijeni ažuriranje baze za redoslijed paketa.'],
  packageOrderChanged:['Die Pakete wurden zwischenzeitlich geändert. Aktualisiere die Galerie und verschiebe das Paket erneut.','The packages changed in the meantime. Refresh the gallery and move the package again.','Paketi su u međuvremenu promijenjeni. Osvježi galeriju pa ponovo premjesti paket.'],
  packageOrderSaved:['Die Paketreihenfolge ist gespeichert und gilt auch für die Kundenansicht.','The package order is saved and applies to the customer view.','Redoslijed paketa je sačuvan i primjenjuje se u prikazu za klijente.'],
  packageMoveUp:['Nach oben','Move up','Pomjeri gore'],
  packageMoveDown:['Nach unten','Move down','Pomjeri dolje'],
  packageMoveUpName:['{name} nach oben verschieben','Move {name} up','Pomjeri {name} gore'],
  packageMoveDownName:['{name} nach unten verschieben','Move {name} down','Pomjeri {name} dolje'],
  packageInactive:['Deaktiviert','Inactive','Neaktivan'],
  deleteTestOrder:['Testbestellung löschen','Delete test order','Izbriši probnu narudžbu'],
  deleteTestOrderHint:['Die Testbestellung verschwindet aus Verwaltung und Kundenansicht. Nur die durch diese Bestellung erteilten Downloadfreigaben entfallen; andere Freigaben bleiben bestehen. Die Unterlagen bleiben intern erhalten. Es wird kein Geld zurücküberwiesen und keine E-Mail verschickt.','The test order disappears from the admin and customer views. Download access granted by this order is removed; other access stays unchanged. Records are retained internally. No money is refunded and no email is sent.','Probna narudžba nestaje iz administracije i prikaza za klijenta. Ukida se samo odobrenje preuzimanja iz ove narudžbe; ostala odobrenja ostaju. Dokumenti se čuvaju interno. Novac se ne vraća i e-mail se ne šalje.'],
  deleteTestOrderAcknowledge:['Ich bestätige, dass dies eine Testbestellung ohne echten Verkauf ist.','I confirm that this is a test order without a real sale.','Potvrđujem da je ovo probna narudžba bez stvarne prodaje.'],
  deleteTestOrderTypeHint:['Gib zur zweiten Bestätigung die oben angezeigte Bestellreferenz exakt ein.','For the second confirmation, type the exact order reference shown above.','Za drugu potvrdu unesi tačnu referencu narudžbe prikazanu iznad.'],
  orderReference:['Bestellreferenz','Order reference','Referenca narudžbe'],
  deleteTestOrderFinal:['Testbestellung endgültig löschen','Permanently delete test order','Trajno izbriši probnu narudžbu'],
  deleteTestOrderMismatch:['Bestätige die Testbestellung und gib ihre Bestellreferenz exakt ein.','Confirm that this is a test order and enter its exact order reference.','Potvrdi da je ovo probna narudžba i unesi njenu tačnu referencu.'],
  deleteTestOrderUnavailable:['Diese Bestellung kann nicht als Testbestellung gelöscht werden. Lade die Bestellungen neu. Bestellungen mit Online-Zahlung bleiben erhalten.','This order cannot be deleted as a test order. Reload the orders. Orders with online payments are retained.','Ova narudžba se ne može izbrisati kao probna. Osvježi narudžbe. Narudžbe s online plaćanjem ostaju sačuvane.'],
  deleteTestOrderMigration:['Bitte führe zuerst das Datenbank-Update zum Löschen von Testbestellungen aus.','Apply the test order deletion database update first.','Prvo primijeni ažuriranje baze za brisanje probnih narudžbi.'],
  testOrderDeleted:['Die Testbestellung wurde aus beiden Ansichten entfernt.','The test order was removed from both views.','Probna narudžba je uklonjena iz oba prikaza.']
});
Object.assign(rows, {
  finalModeOption:['Auswahlgalerie: erst fertige Bilder ausliefern','Proofing gallery: deliver only finished images','Galerija za izbor: isporuči samo gotove fotografije'],
  finalAlreadyFinished:['Diese Bilder sind bereits fertig bearbeitet','These images are already fully edited','Ove fotografije su već završene'],
  finalAlreadyFinishedHint:['Aktiviere dies, wenn die Dateien bereits die endgültigen Kundenbilder sind. Ein zweiter Upload ist dann nicht nötig. Die Zahlung bestätigst du weiterhin separat bei der Bestellung.','Enable this if these files are already the finished customer images. A second upload is unnecessary. Payment is still confirmed separately on the order.','Aktiviraj ako su ove datoteke već gotove fotografije za klijenta. Drugo učitavanje nije potrebno. Uplatu i dalje potvrđuješ zasebno u narudžbi.'],
  finalDirectUploadTitle:['Fertige Bilder direkt hochladen','Upload finished images directly','Direktno učitaj gotove fotografije'],
  finalExistingHint:['Schon fertig bearbeitete Bilder in der Galerie? Wähle sie unten aus und klicke auf „Als fertig bearbeitet markieren“. Dafür ist kein neuer Upload nötig.','Already have finished images in this gallery? Select them below and click “Mark as fully edited”. No new upload is needed.','U galeriji već postoje gotove fotografije? Odaberi ih ispod i klikni „Označi kao završene“. Novo učitavanje nije potrebno.'],
  finalMarkSelected:['Als fertig bearbeitet markieren','Mark as fully edited','Označi kao završene'],
  finalMarkConfirm:['Sind diese {n} ausgewählten Dateien die fertigen Bilder, die deine Kunden in Originalqualität herunterladen sollen? Sie werden ohne neuen Upload als fertig markiert. Dies bestätigt keine Zahlung; vollständig fertige, bereits bezahlte Bestellungen werden automatisch freigegeben.','Are these {n} selected files the finished images your customers should download in original quality? They will be marked as finished without a new upload. This does not confirm payment; paid orders with all finished files are released automatically.','Jesu li ovih {n} odabranih datoteka gotove fotografije koje klijenti trebaju preuzeti u originalnom kvalitetu? Bit će označene kao završene bez novog učitavanja. Ovo ne potvrđuje uplatu; plaćene narudžbe sa svim gotovim datotekama automatski se otključavaju.'],
  finalMarkSaved:['Die ausgewählten Bilder sind als fertig markiert. Bereits bezahlte Bestellungen werden freigegeben, sobald alle zugehörigen Bilder fertig sind. Eine Zahlung wurde dadurch nicht bestätigt.','The selected images are marked as finished. Paid orders are released once all their images are finished. This did not confirm a payment.','Odabrane fotografije su označene kao završene. Plaćene narudžbe se otključavaju kada su sve njihove fotografije gotove. Ovim nije potvrđena uplata.'],
  finalMarkChanged:['Die Bildauswahl hat sich geändert. Aktualisiere die Galerie und wähle die fertigen Bilder erneut aus.','The image selection changed. Refresh the gallery and select the finished images again.','Izbor fotografija se promijenio. Osvježi galeriju i ponovo odaberi gotove fotografije.'],
  finalMarkConfirmationMissing:['Bitte bestätige, dass die ausgewählten Dateien die fertigen Kundenbilder sind.','Confirm that the selected files are the finished customer images.','Potvrdi da su odabrane datoteke gotove fotografije za klijenta.'],
  releaseAwaitingFinal:['Die Freigabe ist gespeichert. Noch unfertige Bilder bleiben gesperrt, bis ihre fertigen Dateien zugeordnet sind.','The release is saved. Unfinished images stay locked until their finished files are assigned.','Odobrenje je sačuvano. Nedovršene fotografije ostaju zaključane dok im se ne pridruže gotove datoteke.'],
  finalModeDisableConfirm:['Die Galerie enthält noch unfertige Auswahlbilder. Wenn du diesen Schutz ausschaltest, können bereits bezahlte oder manuell freigegebene Bilder direkt als Downloads zugänglich werden. Trotzdem ausschalten?','This gallery still contains unfinished proof images. Turning this protection off can make paid or manually released images available for download immediately. Turn it off anyway?','Galerija još sadrži nedovršene fotografije za izbor. Isključivanje ove zaštite može odmah omogućiti preuzimanje već plaćenih ili ručno odobrenih fotografija. Ipak isključiti?'],
  finalModeHint:['Aktivieren, bevor Kunden bezahlen: Die hochgeladenen Bilder dienen zunächst nur zur Auswahl. Nach der Zahlung bleiben die Downloads gesperrt, bis für alle bestellten Bilder fertige Dateien zugeordnet sind. Dann werden genau diese Dateien automatisch freigegeben und die Download-E-Mail versendet.','Enable before customers pay: uploaded images are initially for selection only. After payment, downloads stay locked until finished files are assigned to every ordered image. Those files are then released automatically and a download email is sent.','Aktiviraj prije uplate klijenta: učitane fotografije služe samo za izbor. Nakon uplate preuzimanje ostaje zaključano dok svim naručenim fotografijama nisu pridružene gotove datoteke. Tada se te datoteke automatski otključavaju i šalje se e-mail za preuzimanje.'],
  finalModeSettings:['In den Galerie-Einstellungen aktivieren','Enable in gallery settings','Aktiviraj u postavkama galerije'],
  finalDeliveryMigration:['Bitte führe zuerst das Datenbank-Update für die fertigen Bilddateien aus.','Apply the finished image delivery database update first.','Prvo primijeni ažuriranje baze za isporuku gotovih fotografija.'],
  finalModeRequired:['Aktiviere zuerst „Auswahlgalerie: erst fertige Bilder ausliefern“ und speichere die Galerie.','First enable “Proofing gallery: deliver only finished images” and save the gallery.','Prvo aktiviraj „Galerija za izbor: isporuči samo gotove fotografije“ i sačuvaj galeriju.'],
  finalFileReady:['Fertige Datei bereit','Finished file ready','Gotova datoteka je spremna'],
  finalFilePending:['Auswahlbild · fertige Datei fehlt','Proof image · finished file missing','Fotografija za izbor · nedostaje gotova datoteka'],
  finalFilesCount:['{n} von {total} fertigen Dateien zugeordnet','{n} of {total} finished files assigned','Pridruženo {n} od {total} gotovih datoteka'],
  finalProofUploadTitle:['Auswahlbilder hochladen','Upload proof images','Učitaj fotografije za izbor'],
  finalBatchTitle:['Fertige Bilder hochladen · automatisch ersetzen','Upload finished images','Učitaj gotove fotografije'],
  finalBatchIntro:['Exportiere die fertig bearbeiteten Fotos mit den ursprünglichen Dateinamen, z. B. DSC04378.jpg. Wähle alle Dateien gemeinsam oder ziehe sie in das Upload-Feld. Gleiche Namen werden automatisch zugeordnet; du prüfst die Zuordnung und bestätigst einmal.','Export edited photos using their original filenames, e.g. DSC04378.jpg. Select all files together or drop them into the upload area. Matching names are assigned automatically; review the assignments and confirm once.','Izvezi obrađene fotografije s izvornim nazivima, npr. DSC04378.jpg. Odaberi sve datoteke zajedno ili ih povuci u polje za učitavanje. Isti nazivi se automatski povezuju; provjeri podudaranja i potvrdi jednom.'],
  finalProofUploadHint:['Das normale Feld darunter fügt neue Auswahlbilder hinzu. Für fertige Dateien verwende den Button oben, damit Auswahl, Favoriten und Bestellungen erhalten bleiben.','The regular upload below adds new proof images. Use the button above for finished files to preserve selections, favourites and orders.','Uobičajeno polje ispod dodaje nove fotografije za izbor. Za gotove datoteke koristi dugme iznad kako bi izbori, favoriti i narudžbe ostali sačuvani.'],
  finalDropHint:['Alle fertigen Dateien hierher ziehen oder auswählen','Drop all finished files here or select files','Povuci sve gotove datoteke ovdje ili ih odaberi'],
  finalReviewHint:['Prüfe die Zuordnung. Bei abweichenden oder mehrfach vorkommenden Namen wählst du das passende Auswahlbild aus. Jede Datei muss einem anderen Bild zugeordnet sein. Bereits fertige Dateien werden ersetzt.','Review the assignments. For different or repeated names, choose the matching proof image. Each file must be assigned to a different image. Existing finished files will be replaced.','Provjeri podudaranja. Za različite ili ponovljene nazive odaberi odgovarajuću fotografiju za izbor. Svaka datoteka mora biti pridružena drugoj fotografiji. Postojeće gotove datoteke bit će zamijenjene.'],
  finalTargetImage:['Gehört zu diesem Auswahlbild','Belongs to this proof image','Pripada ovoj fotografiji za izbor'],
  finalMatchFor:['Auswahlbild für {name}','Proof image for {name}','Fotografija za izbor za {name}'],
  finalChooseImage:['Auswahlbild wählen','Choose proof image','Odaberi fotografiju za izbor'],
  finalMatchMissing:['Kein eindeutiger Dateiname gefunden. Bitte das passende Auswahlbild wählen.','No unique filename match found. Choose the matching proof image.','Nije pronađen jedinstven naziv. Odaberi odgovarajuću fotografiju za izbor.'],
  finalMatchAmbiguous:['Dieser Name gehört zu mehreren Bildern. Bitte das passende auswählen.','This name matches multiple images. Choose the correct one.','Ovaj naziv odgovara više fotografija. Odaberi ispravnu.'],
  finalMatchDuplicate:['Diesem Bild sind mehrere Dateien zugeordnet. Bitte die Zuordnung korrigieren.','Multiple files are assigned to this image. Correct the assignments.','Više datoteka je pridruženo ovoj fotografiji. Ispravi podudaranja.'],
  finalResolveMatches:['Bitte ordne jede Datei eindeutig zu und prüfe Dateiformat und Größe.','Assign each file uniquely and check its format and size.','Svaku datoteku pridruži jednoznačno i provjeri format i veličinu.'],
  finalMatched:['Eindeutig zugeordnet','Uniquely assigned','Jednoznačno pridruženo'],
  finalWillReplace:['Vorhandene fertige Datei wird ersetzt','Existing finished file will be replaced','Postojeća gotova datoteka bit će zamijenjena'],
  finalUploaded:['Fertige Datei gespeichert','Finished file saved','Gotova datoteka je sačuvana'],
  finalBatchConfirm:['Zuordnung bestätigen und hochladen','Confirm assignments and upload','Potvrdi podudaranja i učitaj'],
  finalBatchRetry:['Verbleibende Dateien erneut hochladen','Retry remaining files','Ponovo učitaj preostale datoteke'],
  finalUploadProgress:['Datei {n} von {total}: {name} wird gespeichert. Bitte lasse die Seite offen.','Saving file {n} of {total}: {name}. Keep this page open.','Sprema se datoteka {n} od {total}: {name}. Ostavi stranicu otvorenu.'],
  finalUploadComplete:['Fertige Dateien gespeichert: {n}. Bezahlte Bestellungen werden freigegeben, sobald alle zugehörigen Dateien bereit sind.','Finished files saved: {n}. Paid orders are released once all their files are ready.','Sačuvane gotove datoteke: {n}. Plaćene narudžbe se otključavaju kada su sve njihove datoteke spremne.'],
  finalSingleTitle:['Fertige Datei zuordnen','Assign finished file','Pridruži gotovu datoteku'],
  finalSingleHint:['Die Datei wird genau diesem Auswahlbild zugeordnet. Bildname, Favoriten und Bestellungen bleiben erhalten. Eine bisherige fertige Datei wird ersetzt.','The file is assigned to this proof image. The image name, favourites and orders are retained. Any existing finished file is replaced.','Datoteka se pridružuje ovoj fotografiji za izbor. Naziv, favoriti i narudžbe ostaju sačuvani. Postojeća gotova datoteka se zamjenjuje.'],
  orderPaidFinalPending:['Bezahlt · Bilder werden fertiggestellt','Paid · Images being finished','Plaćeno · Fotografije su u obradi'],
  paidFinalPending:['Die Zahlung ist bestätigt. Die Downloads folgen automatisch, sobald alle bestellten Bilder als fertige Dateien bereit sind.','Payment is confirmed. Downloads follow automatically once all ordered images have finished files.','Uplata je potvrđena. Preuzimanje slijedi automatski kada su gotove datoteke svih naručenih fotografija spremne.'],
  paidConfirm:['Nur bestätigen, wenn die Zahlung eingegangen ist. In einer Auswahlgalerie werden Downloads erst freigegeben, wenn alle bestellten fertigen Dateien bereit sind; sonst direkt nach der Zahlungsbestätigung.','Confirm only after payment has arrived. In a proofing gallery, downloads are released once all ordered finished files are ready; otherwise immediately after payment confirmation.','Potvrdi samo kada uplata stigne. U galeriji za izbor preuzimanje se omogućuje tek kada su spremne sve naručene gotove datoteke; inače odmah nakon potvrde uplate.'],
  transferFinalInstruction:['Bitte überweise den Betrag mit der Bestellnummer als Verwendungszweck. Sobald die Zahlung bestätigt ist und deine bestellten Bilder fertig bearbeitet sind, erhältst du eine E-Mail zum Download.','Transfer the amount using your order number as the reference. Once payment is confirmed and your ordered images are finished, you will receive a download email.','Uplati iznos uz broj narudžbe kao poziv na broj. Kada je uplata potvrđena i naručene fotografije obrađene, dobit ćeš e-mail za preuzimanje.'],
  finalFileChanged:['Das Bild wurde zwischenzeitlich geändert. Lade die Galerie neu und ordne die Datei erneut zu.','The image changed in the meantime. Refresh the gallery and assign the file again.','Fotografija je u međuvremenu promijenjena. Osvježi galeriju i ponovo pridruži datoteku.'],
  finalWatermarkChanged:['Die Wasserzeichen-Einstellung wurde geändert. Lade die Galerie neu und starte den Upload erneut.','The watermark setting changed. Refresh the gallery and upload again.','Postavka vodenog žiga je promijenjena. Osvježi galeriju i ponovo učitaj datoteke.']
});
Object.assign(rows,{
  "finalBatchTitle": [
    "Auswahlbilder durch fertige Fotos ersetzen",
    "Replace proofs with finished photos",
    "Zamijeni probne fotografije gotovim"
  ],
  "replacePhotosButton": [
    "Fertige Dateien zuordnen",
    "Assign finished files",
    "Poveži gotove datoteke"
  ],
  "finalBatchIntro": [
    "Wähle die bearbeiteten Dateien gemeinsam aus. Gleiche Dateinamen werden zugeordnet. Prüfe die Zuordnung und bestätige einmal.",
    "Select the edited files together. Matching filenames are assigned automatically. Review and confirm once.",
    "Odaberi obrađene datoteke zajedno. Isti nazivi se automatski povezuju. Provjeri i potvrdi jednom."
  ],
  "replaceResultHint": [
    "Die bisherigen Dateien werden ersetzt und als fertig markiert. Deine Admin-Vorschau ist dann ohne Wasserzeichen. Für Kunden erfolgt die Freigabe samt E-Mail, sobald die Bestellung bezahlt und alle bestellten Bilder fertig sind.",
    "Files are replaced and marked finished. Your admin preview has no watermark. Customers receive access and an email once payment is confirmed and every ordered photo is finished.",
    "Datoteke se zamjenjuju i označavaju gotovim. Admin prikaz je bez vodenog žiga. Klijent dobija pristup i e-mail kada je narudžba plaćena i sve naručene fotografije gotove."
  ],
  "finalExistingHint": [
    "Fotos schon fertig? Unten markieren und „Als fertig bearbeitet markieren“ wählen.",
    "Already finished? Select the photos below and choose “Mark as finished”.",
    "Već gotove? Označi fotografije ispod i izaberi „Označi kao obrađeno“."
  ],
  "uploadIntro": [
    "Für eine schnelle Anzeige erstellen wir kleine Vorschauen – auch beim Öffnen eines Bildes. Nur beim Download wird die Originaldatei geliefert.",
    "Small previews keep the gallery and opened images fast. Only downloads use the original file.",
    "Mali pregledi ubrzavaju galeriju i otvaranje fotografija. Samo preuzimanje koristi original."
  ],
  "newPhotosTitle": [
    "Neue Bilder hinzufügen",
    "Add new photos",
    "Dodaj nove fotografije"
  ],
  "finalAlreadyFinished": [
    "Diese neuen Bilder sind bereits fertig bearbeitet",
    "These new photos are already finished",
    "Ove nove fotografije su već obrađene"
  ],
  "finalAlreadyFinishedHint": [
    "Legt neue Bilder an und markiert sie als fertig. Ersetzt keine vorhandenen Bilder – auch nicht bei gleichem Dateinamen.",
    "Adds new photos and marks them finished. Does not replace existing photos, even with the same filename.",
    "Dodaje nove fotografije i označava ih gotovim. Ne zamjenjuje postojeće, čak ni s istim nazivom."
  ],
  "finalModeHint": [
    "An: Kunden wählen zuerst aus. Downloads erst nach Zahlung und Fertigstellung aller bestellten Bilder. Aus: Hochgeladene Dateien können nach Zahlung direkt ausgeliefert werden. In beiden Fällen ist auch eine manuelle Freigabe möglich; Hochladen allein gibt keinen Download frei.",
    "On: customers choose proofs; download follows payment and completion of all ordered photos. Off: uploaded files can be delivered after payment. Manual release works in either mode; uploading alone does not unlock downloads.",
    "Uključeno: klijenti biraju probne fotografije; preuzimanje nakon plaćanja i završetka svih naručenih fotografija. Isključeno: učitane datoteke mogu se isporučiti nakon plaćanja. Ručno odobrenje je moguće u oba slučaja; samo učitavanje ne otključava preuzimanje."
  ],
  "directDeliveryTitle": [
    "Direkte Auslieferung nach Zahlung",
    "Direct delivery after payment",
    "Direktna isporuka nakon plaćanja"
  ],
  "directDeliveryHint": [
    "Lade hier nur fertige Fotos hoch. Nach bezahlter Bestellung oder manueller Freigabe können Kunden sie herunterladen. Hochladen allein schaltet keine Downloads frei.",
    "Upload finished photos here. Customers can download after payment or manual release. Uploading alone does not grant access.",
    "Ovdje učitaj samo gotove fotografije. Klijenti preuzimaju nakon plaćanja ili ručnog odobrenja. Samo učitavanje ne daje pristup."
  ],
  "revokeDownloadsHint": [
    "„Freigeben“ erlaubt dem gewählten Kunden den Download. „Sperren“ entzieht ihn – auch bei bezahlten Bildern. Die Bestellung bleibt bestehen. Schon heruntergeladene Dateien bleiben beim Kunden.",
    "Release allows the selected customer to download. Block removes access, even for paid photos. The order remains. Files already downloaded remain with the customer.",
    "Odobrenje omogućava preuzimanje odabranom klijentu. Blokiranje ukida pristup, i za plaćene fotografije. Narudžba ostaje. Već preuzete datoteke ostaju kod klijenta."
  ],
  "alreadyPaidHint": [
    "Schon bezahlt, zum Beispiel bar? Bitte nicht nochmals überweisen. Emina prüft die Zahlung. Sobald die Zahlung bestätigt ist und die bestellten Dateien bereit sind, erhältst du die Download-E-Mail.",
    "Already paid, for example in cash? Please do not pay again. Emina checks the payment. You receive the download email once payment is confirmed and the ordered files are ready.",
    "Već plaćeno, npr. gotovinom? Nemoj ponovo uplatiti. Emina provjerava uplatu. E-mail za preuzimanje stiže kada je uplata potvrđena i naručene datoteke spremne."
  ],
  "deleteImage": [
    "Bild löschen",
    "Delete photo",
    "Obriši fotografiju"
  ],
  "imageOrderedError": [
    "Dieses Bild gehört zu einer Bestellung und kann nicht gelöscht werden. Ein zusätzlich hochgeladenes Duplikat ohne Bestellung kannst du löschen.",
    "This photo belongs to an order and cannot be deleted. An extra duplicate without an order can be deleted.",
    "Fotografija pripada narudžbi i ne može se obrisati. Dodatni duplikat bez narudžbe može se obrisati."
  ],
  "paidPhoto": [
    "Bezahlt",
    "Paid",
    "Plaćeno"
  ],
  "paidAwaitingDownload": [
    "Bezahlt · Download noch gesperrt",
    "Paid · Download not yet available",
    "Plaćeno · Preuzimanje još zaključano"
  ],
  "accessCustomer": [
    "Freigaben für",
    "Access for",
    "Pristup za"
  ],
  "allCustomers": [
    "Alle Kunden",
    "All customers",
    "Svi klijenti"
  ],
  "accessFilter": [
    "Bildstatus filtern",
    "Filter photo status",
    "Filtriraj status fotografija"
  ],
  "noAccessMatches": [
    "Keine passenden Bilder",
    "No matching photos",
    "Nema odgovarajućih fotografija"
  ],
  "accessFilterHint": [
    "Wähle „Alle Bilder“, um zur vollständigen Galerie zurückzukehren.",
    "Choose All photos to return to the full gallery.",
    "Odaberi Sve fotografije za cijelu galeriju."
  ]
});
Object.assign(rows,{
  retentionTitle:['Automatische Aufbewahrung','Automatic retention','Automatsko čuvanje'],
  retentionCreateGallery:['90 Tage Galeriezeit ab der ersten Veröffentlichung.','90 days of gallery access from the first publication.','90 dana pristupa galeriji od prve objave.'],
  retentionCreateUnbought:['Ungekaufte Bilddateien werden spätestens 30 Tage danach automatisch gelöscht.','Unpurchased image files are automatically deleted no later than 30 days afterwards.','Nekupljene fotografije automatski se brišu najkasnije 30 dana nakon toga.'],
  retentionCreatePurchased:['Gekaufte Auslieferungskopien werden 6 Monate ab der ersten Downloadfreigabe gespeichert und dann automatisch gelöscht.','Purchased delivery copies are stored for 6 months from their first download release, then automatically deleted.','Kupljene kopije za isporuku čuvaju se 6 mjeseci od prvog omogućavanja preuzimanja, a zatim se automatski brišu.'],
  retentionDraft:['Die Fristen starten erst, wenn du diese Galerie zum ersten Mal veröffentlichst.','The deadlines start when you publish this gallery for the first time.','Rokovi počinju tek kada prvi put objaviš ovu galeriju.'],
  retentionStarted:['Erstmals veröffentlicht: {date}','First published: {date}','Prva objava: {date}'],
  retentionGalleryCloses:['Galerie erreichbar bis','Gallery accessible until','Galerija dostupna do'],
  retentionUnboughtDeadline:['Löschfrist für ungekaufte Dateien','Deletion deadline for unpurchased files','Rok brisanja nekupljenih datoteka'],
  retentionGalleryClosed:['Die Galeriezeit ist abgelaufen. Kunden können die Galerie nicht mehr öffnen.','The gallery period has ended. Clients can no longer open this gallery.','Period pristupa galeriji je istekao. Klijenti više ne mogu otvoriti galeriju.'],
  retentionStorageOnly:['Die 6 Monate betreffen nur die gespeicherten Kopien. Der Kundenzugang endet nach 90 Tagen. Ein erneutes Veröffentlichen startet die Fristen nicht neu.','The 6 months apply only to stored copies. Client access ends after 90 days. Publishing again does not restart the deadlines.','Rok od 6 mjeseci odnosi se samo na pohranjene kopije. Pristup klijenata završava nakon 90 dana. Ponovna objava ne pokreće rokove iznova.'],
  retentionPendingProtected:['Bereits bezahlte Bilder bleiben bis zur ersten Downloadfreigabe geschützt. Erst dann beginnen ihre 6 Monate Speicherzeit.','Paid images stay protected until their first download release. Their 6 months of storage start then.','Već plaćene fotografije ostaju zaštićene do prvog odobrenja za preuzimanje. Tada počinje njihov rok čuvanja od 6 mjeseci.'],
  orderFilesExpired:['Bilddateien nach Ablauf der Speicherfrist entfernt.','Image files removed after the storage period ended.','Fotografije su uklonjene nakon isteka roka čuvanja.'],
  orderPaidFilesExpired:['Bezahlt · Bilddateien nach Ablauf der Speicherfrist entfernt','Paid · Image files removed after the storage period ended','Plaćeno · Fotografije su uklonjene nakon isteka roka čuvanja']
});
Object.assign(rows, {
  "vouchers": [
    "Gutscheine",
    "Gift vouchers",
    "Poklon bonovi"
  ],
  "voucherAdminIntro": [
    "Zahlung bestätigen, Gutschein senden und Guthaben für ein Shooting verwalten.",
    "Confirm payments, send gift vouchers and manage shooting credit.",
    "Potvrdi uplatu, pošalji poklon bon i upravljaj iznosom za fotografisanje."
  ],
  "voucherSearch": [
    "Code, Bestellnummer, Name oder E-Mail suchen",
    "Search code, order number, name or email",
    "Traži kod, broj narudžbe, ime ili e-mail"
  ],
  "voucherStatus": [
    "Status",
    "Status",
    "Status"
  ],
  "voucherAll": [
    "Alle Gutscheine",
    "All vouchers",
    "Svi bonovi"
  ],
  "voucherStatus_pending": [
    "Zahlung offen",
    "Awaiting payment",
    "Čeka se uplata"
  ],
  "voucherStatus_active": [
    "Aktiv",
    "Active",
    "Aktivan"
  ],
  "voucherStatus_spent": [
    "Vollständig eingelöst",
    "Fully redeemed",
    "U potpunosti iskorišten"
  ],
  "voucherStatus_withdrawal_requested": [
    "Rücktritt angefragt · gesperrt",
    "Withdrawal requested · blocked",
    "Zatražen raskid · blokiran"
  ],
  "voucherStatus_refunded": [
    "Rückzahlung erfasst · gesperrt",
    "Refund recorded · blocked",
    "Povrat evidentiran · blokiran"
  ],
  "voucherOriginal": [
    "Ursprünglicher Wert",
    "Original value",
    "Početna vrijednost"
  ],
  "voucherBalance": [
    "Restguthaben",
    "Remaining balance",
    "Preostali iznos"
  ],
  "voucherReserved": [
    "Davon reserviert",
    "Reserved amount",
    "Rezervisano"
  ],
  "voucherAvailable": [
    "Frei verfügbar",
    "Available credit",
    "Raspoloživo"
  ],
  "voucherOpen": [
    "Gutschein öffnen",
    "Open voucher",
    "Otvori bon"
  ],
  "voucherNoResults": [
    "Keine passenden Gutscheine vorhanden.",
    "No matching vouchers.",
    "Nema odgovarajućih bonova."
  ],
  "voucherPdf": [
    "Gutschein-PDF ansehen",
    "View voucher PDF",
    "Pogledaj PDF bona"
  ],
  "voucherDetails": [
    "Gutschein verwalten",
    "Manage voucher",
    "Upravljaj bonom"
  ],
  "voucherGiftTo": [
    "Für",
    "For",
    "Za"
  ],
  "voucherGiftFrom": [
    "Von",
    "From",
    "Od"
  ],
  "voucherMarkPaid": [
    "Zahlung erhalten",
    "Payment received",
    "Uplata primljena"
  ],
  "voucherResend": [
    "E-Mail erneut senden",
    "Resend email",
    "Ponovo pošalji e-mail"
  ],
  "voucherReserve": [
    "Guthaben reservieren",
    "Reserve credit",
    "Rezerviši iznos"
  ],
  "voucherRedeem": [
    "Guthaben einlösen",
    "Redeem credit",
    "Iskoristi iznos"
  ],
  "voucherRelease": [
    "Reservierung aufheben",
    "Release reservation",
    "Ukini rezervaciju"
  ],
  "voucherRefund": [
    "Erfolgte Rückzahlung erfassen",
    "Record completed refund",
    "Evidentiraj izvršeni povrat"
  ],
  "voucherReservations": [
    "Reservierungen",
    "Reservations",
    "Rezervacije"
  ],
  "voucherNoReservations": [
    "Keine Reservierungen.",
    "No reservations.",
    "Nema rezervacija."
  ],
  "voucherReservation_active": [
    "Reserviert",
    "Reserved",
    "Rezervisano"
  ],
  "voucherReservation_redeemed": [
    "Eingelöst",
    "Redeemed",
    "Iskorišteno"
  ],
  "voucherReservation_released": [
    "Freigegeben",
    "Released",
    "Oslobođeno"
  ],
  "voucherLedger": [
    "Verlauf des Guthabens",
    "Credit history",
    "Historija iznosa"
  ],
  "voucherNoLedger": [
    "Noch keine Guthabenbewegungen.",
    "No credit entries yet.",
    "Još nema promjena iznosa."
  ],
  "voucherLedger_paid": [
    "Zahlung bestätigt",
    "Payment confirmed",
    "Uplata potvrđena"
  ],
  "voucherLedger_issued": [
    "Gutschein aktiviert",
    "Voucher activated",
    "Bon aktiviran"
  ],
  "voucherLedger_reserve": [
    "Guthaben reserviert",
    "Credit reserved",
    "Iznos rezervisan"
  ],
  "voucherLedger_reserved": [
    "Guthaben reserviert",
    "Credit reserved",
    "Iznos rezervisan"
  ],
  "voucherLedger_redeem": [
    "Guthaben eingelöst",
    "Credit redeemed",
    "Iznos iskorišten"
  ],
  "voucherLedger_redeemed": [
    "Guthaben eingelöst",
    "Credit redeemed",
    "Iznos iskorišten"
  ],
  "voucherLedger_release": [
    "Reservierung aufgehoben",
    "Reservation released",
    "Rezervacija ukinuta"
  ],
  "voucherLedger_released": [
    "Reservierung aufgehoben",
    "Reservation released",
    "Rezervacija ukinuta"
  ],
  "voucherLedger_refund": [
    "Rückzahlung erfasst",
    "Refund recorded",
    "Povrat evidentiran"
  ],
  "voucherLedger_refunded": [
    "Rückzahlung erfasst",
    "Refund recorded",
    "Povrat evidentiran"
  ],
  "voucherLedger_withdrawal": [
    "Rücktritt angefragt",
    "Withdrawal requested",
    "Raskid zatražen"
  ],
  "voucherLedger_created": [
    "Gutschein bestellt",
    "Voucher ordered",
    "Bon naručen"
  ],
  "voucherLedger_payment": [
    "Zahlung bestätigt",
    "Payment confirmed",
    "Uplata potvrđena"
  ],
  "voucherLedger_reservation": [
    "Guthaben reserviert",
    "Credit reserved",
    "Iznos rezervisan"
  ],
  "voucherWithdrawalNotice": [
    "Der Gutschein ist wegen einer Rücktrittsanfrage gesperrt. Prüfe die Anfrage und kläre eine mögliche Rückzahlung, bevor du sie hier als erfolgt erfasst.",
    "This voucher is blocked because withdrawal was requested. Review the request and arrange any refund before recording it as completed here.",
    "Bon je blokiran zbog zahtjeva za raskid. Provjeri zahtjev i dogovori povrat prije nego što ga ovdje evidentiraš kao izvršen."
  ],
  "voucherPaidHint": [
    "Bestätige den Zahlungseingang erst nach der Kontoprüfung. Danach wird der Gutschein aktiviert und an {email} gesendet.",
    "Check your bank account before confirming receipt. The voucher will then be activated and sent to {email}.",
    "Prvo provjeri uplatu na računu. Bon se zatim aktivira i šalje na {email}."
  ],
  "voucherResendHint": [
    "Die Bestätigung oder der aktive Gutschein wird erneut an {email} gesendet. Das Guthaben ändert sich dabei nicht.",
    "The confirmation or active voucher will be sent again to {email}. The balance will not change.",
    "Potvrda ili aktivni bon ponovo se šalje na {email}. Iznos se ne mijenja."
  ],
  "voucherReserveHint": [
    "Reserviere den vereinbarten Betrag für eine verbindliche Buchung. Das Guthaben ist damit noch nicht eingelöst. Für unverbindliche Anfragen ist keine Reservierung nötig.",
    "Reserve the agreed amount for a confirmed booking. This does not redeem the credit. An enquiry does not need a reservation.",
    "Rezerviši dogovoreni iznos za potvrđenu rezervaciju. Iznos time još nije iskorišten. Za upit nije potrebna rezervacija."
  ],
  "voucherRedeemHint": [
    "Dieser Betrag wird für die Abrechnung verwendet und vom Restguthaben abgezogen. Prüfe den Betrag und die zugehörige Buchung.",
    "This amount is used for settlement and deducted from the remaining balance. Check the amount and booking.",
    "Ovaj iznos koristi se za obračun i oduzima od preostalog iznosa. Provjeri iznos i rezervaciju."
  ],
  "voucherReleaseHint": [
    "Die Reservierung über {amount} wird aufgehoben. Der Betrag ist danach wieder frei verfügbar.",
    "The reservation of {amount} will be released. That amount will be available again.",
    "Rezervacija od {amount} se ukida. Iznos ponovo postaje raspoloživ."
  ],
  "voucherRefundHint": [
    "Hier wird eine bereits erfolgte Rückzahlung von {amount} erfasst und der Gutschein gesperrt. Das Portal überweist kein Geld. Erledige die Rückzahlung vorher über deine Bank.",
    "Record a refund of {amount} already completed outside the portal and block the voucher. The portal does not transfer money. Complete the refund through your bank first.",
    "Ovdje evidentiraš već izvršen povrat od {amount} i blokiraš bon. Portal ne prenosi novac. Povrat prvo obavi preko banke."
  ],
  "voucherAmount": [
    "Betrag in Euro",
    "Amount in euros",
    "Iznos u eurima"
  ],
  "voucherBooking": [
    "Buchung / Rechnungsbezug",
    "Booking / invoice reference",
    "Rezervacija / referenca računa"
  ],
  "voucherRefundReason": [
    "Notiz zur Rückzahlung (optional)",
    "Refund note (optional)",
    "Napomena uz povrat (opcionalno)"
  ],
  "voucherPaidConfirm": [
    "Ich habe den vollständigen Zahlungseingang auf meinem Konto geprüft.",
    "I checked receipt of the full payment in my bank account.",
    "Provjerila sam prijem cijelog iznosa na svom računu."
  ],
  "voucherRefundConfirm": [
    "Ich habe das Geld bereits außerhalb des Portals zurückgezahlt.",
    "I have already refunded the money outside the portal.",
    "Novac sam već vratila izvan portala."
  ],
  "voucherRedeemConfirm": [
    "Ich möchte diesen Betrag jetzt für die angegebene Buchung einlösen.",
    "I want to redeem this amount for the specified booking now.",
    "Želim sada iskoristiti ovaj iznos za navedenu rezervaciju."
  ],
  "voucherReserveConfirm": [
    "Ich möchte diesen Betrag für die angegebene verbindliche Buchung reservieren.",
    "I want to reserve this amount for the specified confirmed booking.",
    "Želim rezervisati ovaj iznos za navedenu potvrđenu rezervaciju."
  ],
  "voucherReleaseConfirm": [
    "Ich möchte diese Reservierung aufheben.",
    "I want to release this reservation.",
    "Želim ukinuti ovu rezervaciju."
  ],
  "voucherResendConfirm": [
    "Ich möchte die E-Mail erneut an die gespeicherte Käuferadresse senden.",
    "I want to resend the email to the saved buyer address.",
    "Želim ponovo poslati e-mail na sačuvanu adresu kupca."
  ],
  "voucherSaved": [
    "Gutschein aktualisiert.",
    "Voucher updated.",
    "Bon je ažuriran."
  ],
  "voucherMailPending": [
    "Gespeichert. Die E-Mail konnte noch nicht versendet werden. Bitte später erneut senden.",
    "Saved. The email has not been sent yet. Please resend later.",
    "Sačuvano. E-mail još nije poslan. Pokušaj ponovo kasnije."
  ],
  "voucherUnavailable": [
    "Dieser Gutschein ist nicht aktiv oder nicht mehr verfügbar. Bitte aktualisieren.",
    "This voucher is not active or no longer available. Please refresh.",
    "Ovaj bon nije aktivan ili više nije dostupan. Osvježi prikaz."
  ],
  "voucherBalanceChanged": [
    "Das verfügbare Guthaben reicht dafür nicht mehr aus. Bitte aktualisieren und Betrag prüfen.",
    "The available balance is insufficient. Please refresh and check the amount.",
    "Raspoloživi iznos nije dovoljan. Osvježi prikaz i provjeri iznos."
  ],
  "voucherInvalidAmount": [
    "Bitte einen gültigen Eurobetrag mit höchstens zwei Nachkommastellen eingeben.",
    "Enter a valid euro amount with no more than two decimal places.",
    "Unesi ispravan iznos u eurima s najviše dvije decimale."
  ],
  "voucherConflict": [
    "Diese Aktion wurde mit anderen Angaben übermittelt. Bitte Gutschein neu öffnen und den Verlauf prüfen.",
    "This action was submitted with different details. Reopen the voucher and check its history.",
    "Ova radnja je poslana s drugim podacima. Ponovo otvori bon i provjeri historiju."
  ],
  "voucherReservationChanged": [
    "Diese Reservierung ist nicht mehr aktiv. Bitte Gutschein neu öffnen.",
    "This reservation is no longer active. Reopen the voucher.",
    "Ova rezervacija više nije aktivna. Ponovo otvori bon."
  ],
  "voucherRefundBlocked": [
    "Der Gutschein wurde bereits verwendet oder hat noch eine Reservierung. Bitte den Verlauf prüfen.",
    "The voucher has been used or still has a reservation. Check the history.",
    "Bon je već korišten ili još ima rezervaciju. Provjeri historiju."
  ],
  "voucherConfigMissing": [
    "Die Gutscheinverwaltung ist noch nicht vollständig eingerichtet. Bitte das Gutschein-Datenbank-Update prüfen.",
    "Voucher management is not fully configured. Check the voucher database update.",
    "Upravljanje bonovima još nije potpuno postavljeno. Provjeri ažuriranje baze bonova."
  ],
  "voucherConfirmRequired": [
    "Bitte bestätige die Aktion mit dem Häkchen.",
    "Confirm this action using the checkbox.",
    "Potvrdi radnju označavanjem polja."
  ],
  "voucherBookingRequired": [
    "Bitte die zugehörige Buchung oder Rechnung angeben.",
    "Enter the related booking or invoice reference.",
    "Navedi odgovarajuću rezervaciju ili račun."
  ]
});
Object.assign(rows, {
  "voucherSearchAll": [
    "Suchen",
    "Search",
    "Traži"
  ],
  "voucherSearchHint": [
    "Mit „Suchen“ findest du auch ältere Gutscheine. Name, E-Mail-Adresse, Code oder Bestellnummer eingeben.",
    "Use Search to find older vouchers too. Enter a name, email, code or order number.",
    "Opcija Traži pronalazi i starije bonove. Unesi ime, e-mail, kod ili broj narudžbe."
  ],
  "voucherMoreResults": [
    "Es gibt weitere passende Gutscheine. Bitte den Suchbegriff genauer eingeben.",
    "More matching vouchers exist. Please narrow your search.",
    "Postoji još odgovarajućih bonova. Suzi pretragu."
  ],
  "voucherGiftPending": [
    "Gutschein-E-Mail noch nicht versendet. Über „E-Mail erneut senden“ nachholen.",
    "Voucher email not sent yet. Use Resend email to retry.",
    "E-mail s bonom još nije poslan. Pokušaj ponovo putem opcije za ponovno slanje."
  ],
  "voucherConfirmationPending": [
    "Bestätigungs-E-Mail noch nicht versendet. Über „E-Mail erneut senden“ nachholen.",
    "Confirmation email not sent yet. Use Resend email to retry.",
    "E-mail s potvrdom još nije poslan. Pokušaj ponovo putem opcije za ponovno slanje."
  ],
  "voucherPaidBlockedHint": [
    "Die Bestellung wurde widerrufen. Erfasse einen trotzdem eingegangenen Betrag erst nach der Kontoprüfung. Der Code bleibt gesperrt; es wird kein aktiver Gutschein verschickt. Danach kannst du eine tatsächlich erfolgte Rückzahlung erfassen.",
    "This purchase was withdrawn. Check your bank before recording any payment that still arrived. The code stays blocked and no active voucher is sent. You can then record an actually completed refund.",
    "Od ove narudžbe se odustalo. Prije evidentiranja naknadne uplate provjeri račun. Kod ostaje blokiran i aktivni bon se ne šalje. Zatim možeš evidentirati stvarno izvršen povrat."
  ],
  "voucherPaymentBlockedSaved": [
    "Zahlung erfasst. Der Gutschein bleibt wegen des Rücktritts gesperrt.",
    "Payment recorded. The voucher remains blocked due to withdrawal.",
    "Uplata je evidentirana. Bon ostaje blokiran zbog odustanka."
  ]
});
export const translations = Object.fromEntries(['de','en','bs'].map((lang,index)=>[lang,Object.fromEntries(Object.entries(rows).map(([key,values])=>[key,values[index]]))]));
