// Versioned declarations shared by checkout and immutable receipt snapshots.
export const ORDER_CONSENT_VERSION = "portal-digital-2026-10-19-consent-v4";
export const orderConsent = {
  "de": {
    "title": "Deine Zustimmung zum vorzeitigen Beginn",
    "start": "Ich verlange ausdrücklich, dass Emina nach Erhalt meiner Vertragsbestätigung schon vor Ablauf der 14-tägigen Rücktrittsfrist mit der Ausführung meiner Bestellung beginnt. Das umfasst die gegebenenfalls noch erforderliche Bearbeitung und die Bereitstellung der bestellten digitalen Fotos.",
    "loss": "Ich bestätige, dass ich mein Rücktrittsrecht für die digitalen Fotos verliere, sobald nach Erhalt der Vertragsbestätigung mit ihrer Bereitstellung begonnen wird. Die Bearbeitung allein lässt das Rücktrittsrecht nicht erlöschen.",
    "hint": "Beide Erklärungen werden mit deiner Bestellung gespeichert und in der Bestätigungs-E-Mail dokumentiert. Die Download-Freigabe erfolgt nach bestätigter Zahlung und Fertigstellung.",
    "compensation": "Bereits bearbeitete Bilder: Wenn du den sofortigen Beginn wünschst und später von der Bestellung zurücktrittst, können bereits fertig bearbeitete Bilder anteilig berechnet werden, sofern die gesetzlichen Voraussetzungen dafür erfüllt sind."
  },
  "en": {
    "title": "Your consent to starting early",
    "start": "I expressly request that, after I receive my contract confirmation, Emina starts fulfilling my order before the 14-day withdrawal period ends. This includes any editing still required and the supply of the digital photographs ordered.",
    "loss": "I acknowledge that I lose my right of withdrawal for the digital photographs once their supply begins after I receive the contract confirmation. Editing alone does not end the right of withdrawal.",
    "hint": "Both declarations are saved with your order and documented in the confirmation email. Downloads are released after payment is confirmed and the images are finished.",
    "compensation": "Already edited photographs: If you request an immediate start and later withdraw from your order, photographs already fully edited may be charged proportionately, provided the legal requirements are met."
  },
  "bs": {
    "title": "Tvoja saglasnost za raniji početak",
    "start": "Izričito zahtijevam da Emina, nakon što primim potvrdu ugovora, počne izvršavati moju narudžbu prije isteka roka od 14 dana za odustanak. To uključuje eventualnu preostalu obradu i isporuku naručenih digitalnih fotografija.",
    "loss": "Potvrđujem da gubim pravo na odustanak za digitalne fotografije kada, nakon primitka potvrde ugovora, počne njihova isporuka. Sama obrada fotografija ne ukida pravo na odustanak.",
    "hint": "Obje izjave čuvaju se uz narudžbu i potvrđuju u e-mailu. Preuzimanje se omogućava nakon potvrde uplate i završetka fotografija.",
    "compensation": "Već obrađene fotografije: Ako želiš da rad počne odmah, a kasnije odustaneš od narudžbe, već završene fotografije mogu se razmjerno naplatiti ako su ispunjeni zakonski uslovi."
  }
};
const versionThreeOrderConsent = {
  "de": {
    "title": "Deine Zustimmung zum vorzeitigen Beginn",
    "start": "Ich verlange ausdrücklich, dass Emina nach Erhalt meiner Vertragsbestätigung schon vor Ablauf der 14-tägigen Rücktrittsfrist mit der Ausführung meiner Bestellung beginnt. Das umfasst die gegebenenfalls noch erforderliche Bearbeitung und die Bereitstellung der bestellten digitalen Fotos.",
    "loss": "Ich bestätige, dass ich mein Rücktrittsrecht für die digitalen Fotos verliere, sobald nach Erhalt der Vertragsbestätigung mit ihrer Bereitstellung begonnen wird. Die Bearbeitung allein lässt das Rücktrittsrecht nicht erlöschen.",
    "hint": "Beide Erklärungen werden mit deiner Bestellung gespeichert und in der Bestätigungs-E-Mail dokumentiert. Die Download-Freigabe erfolgt nach bestätigter Zahlung und Fertigstellung.",
    "compensation": "Soweit die vereinbarte Bildbearbeitung rechtlich als Dienstleistung abzurechnen ist, gilt: Verlangst du ausdrücklich den Beginn vor Ablauf der Rücktrittsfrist und trittst du anschließend wirksam zurück, ist die bis zum Eingang deiner Rücktrittserklärung tatsächlich erbrachte Bearbeitungsleistung im gesetzlich zulässigen Umfang anteilig zu bezahlen. Voraussetzung ist, dass du vor der Bestellung über diese Zahlungspflicht und dein Rücktrittsrecht informiert wurdest. Der Betrag richtet sich nach dem erbrachten Anteil am vereinbarten Umfang und der dafür vereinbarten Vergütung; bei einem unverhältnismäßig hohen Preis nach dem Marktwert. Es fällt keine pauschale Stornogebühr an. Diese Regel begründet keinen Wertersatz für digitale Inhalte, für die gesetzlich kein solcher Anspruch besteht."
  },
  "en": {
    "title": "Your consent to starting early",
    "start": "I expressly request that, after I receive my contract confirmation, Emina starts fulfilling my order before the 14-day withdrawal period ends. This includes any editing still required and the supply of the digital photographs ordered.",
    "loss": "I acknowledge that I lose my right of withdrawal for the digital photographs once their supply begins after I receive the contract confirmation. Editing alone does not end the right of withdrawal.",
    "hint": "Both declarations are saved with your order and documented in the confirmation email. Downloads are released after payment is confirmed and the images are finished.",
    "compensation": "To the extent that the agreed image editing is legally chargeable as a service: if you expressly request work to begin before the withdrawal period ends and subsequently validly withdraw, the editing actually performed before your withdrawal notice is received is payable proportionately, insofar as permitted by law. This requires that you were informed of this payment obligation and your right of withdrawal before ordering. The amount reflects the proportion performed relative to the agreed scope and the remuneration agreed for it; if the price is disproportionately high, market value applies. There is no flat cancellation fee. This rule does not create a compensation claim for digital content where the law provides no such claim."
  },
  "bs": {
    "title": "Tvoja saglasnost za raniji početak",
    "start": "Izričito zahtijevam da Emina, nakon što primim potvrdu ugovora, počne izvršavati moju narudžbu prije isteka roka od 14 dana za odustanak. To uključuje eventualnu preostalu obradu i isporuku naručenih digitalnih fotografija.",
    "loss": "Potvrđujem da gubim pravo na odustanak za digitalne fotografije kada, nakon primitka potvrde ugovora, počne njihova isporuka. Sama obrada fotografija ne ukida pravo na odustanak.",
    "hint": "Obje izjave čuvaju se uz narudžbu i potvrđuju u e-mailu. Preuzimanje se omogućava nakon potvrde uplate i završetka fotografija.",
    "compensation": "U mjeri u kojoj se ugovorena obrada fotografija pravno obračunava kao usluga: ako izričito zahtijevaš početak rada prije isteka roka za odustanak, a zatim valjano odustaneš, stvarno izvršena obrada do primitka izjave o odustanku plaća se razmjerno, u zakonom dopuštenom obimu. Uslov je da prije narudžbe budeš obaviještena o toj obavezi plaćanja i pravu na odustanak. Iznos odgovara izvršenom dijelu ugovorenog obima i naknadi ugovorenoj za njega; kod nesrazmjerno visoke cijene primjenjuje se tržišna vrijednost. Nema paušalne naknade za otkazivanje. Ovo pravilo ne stvara pravo na naknadu za digitalni sadržaj za koji zakon ne predviđa takvo pravo."
  }
};
const previousOrderConsent = {
  "de": {
    "title": "Deine Zustimmung zum vorzeitigen Beginn",
    "start": "Ich verlange ausdrücklich, dass Emina nach Erhalt meiner Vertragsbestätigung schon vor Ablauf der 14-tägigen Rücktrittsfrist mit der Ausführung meiner Bestellung beginnt. Das umfasst die gegebenenfalls noch erforderliche Bearbeitung und die Bereitstellung der bestellten digitalen Fotos.",
    "loss": "Ich bestätige, dass ich mein Rücktrittsrecht für die digitalen Fotos verliere, sobald nach Erhalt der Vertragsbestätigung mit ihrer Bereitstellung begonnen wird. Die Bearbeitung allein lässt das Rücktrittsrecht nicht erlöschen.",
    "hint": "Beide Erklärungen werden mit deiner Bestellung gespeichert und in der Bestätigungs-E-Mail dokumentiert. Die Download-Freigabe erfolgt nach bestätigter Zahlung und Fertigstellung."
  },
  "en": {
    "title": "Your consent to starting early",
    "start": "I expressly request that, after I receive my contract confirmation, Emina starts fulfilling my order before the 14-day withdrawal period ends. This includes any editing still required and the supply of the digital photographs ordered.",
    "loss": "I acknowledge that I lose my right of withdrawal for the digital photographs once their supply begins after I receive the contract confirmation. Editing alone does not end the right of withdrawal.",
    "hint": "Both declarations are saved with your order and documented in the confirmation email. Downloads are released after payment is confirmed and the images are finished."
  },
  "bs": {
    "title": "Tvoja saglasnost za raniji početak",
    "start": "Izričito zahtijevam da Emina, nakon što primim potvrdu ugovora, počne izvršavati moju narudžbu prije isteka roka od 14 dana za odustanak. To uključuje eventualnu preostalu obradu i isporuku naručenih digitalnih fotografija.",
    "loss": "Potvrđujem da gubim pravo na odustanak za digitalne fotografije kada, nakon primitka potvrde ugovora, počne njihova isporuka. Sama obrada fotografija ne ukida pravo na odustanak.",
    "hint": "Obje izjave čuvaju se uz narudžbu i potvrđuju u e-mailu. Preuzimanje se omogućava nakon potvrde uplate i završetka fotografija."
  }
};
export function consentForVersion(version) {
 const [key,language] = String(version || '').split(':');
 const texts = key === ORDER_CONSENT_VERSION ? orderConsent : key === 'portal-digital-2026-10-19-consent-v3' ? versionThreeOrderConsent : key === 'portal-digital-2026-10-19-consent-v2' ? previousOrderConsent : null;
 return texts && Object.hasOwn(texts,language) ? {...texts[language],language} : null;
}
