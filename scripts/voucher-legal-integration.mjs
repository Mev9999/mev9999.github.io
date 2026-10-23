// The existing AGB HTML files are source documents. Keep the voucher addition
// repeatable without replacing unrelated photography terms or their layout.
const copy = {
  de: {
    title: '4a. Geschenkgutscheine', version: 'Stand: 23. Oktober 2026',
    paragraphs: [
      'Für den Onlinekauf und die Verwendung eines Wertgutscheins gelten die vor der Bestellung angezeigten und mit der Bestellbestätigung übermittelten Gutscheinbedingungen. Der Gutscheinkauf folgt dem dort beschriebenen Bestellablauf. Die Buchungs- und Stornoregeln für ein Shooting betreffen erst den später gesondert geschlossenen Shootingvertrag; der Gutschein allein bucht kein Paket und keinen Termin.',
      'Du bezahlst den gewählten Gutscheinwert per Überweisung. Nach Bestätigung des vollständigen Zahlungseingangs wird der Code freigeschaltet und der Gutschein als PDF an die Käuferadresse versandt sowie über den geschützten Bestelllink bereitgestellt. Der Wert kann auf persönlich vereinbarte Shootings angerechnet werden. Organisierte Fototage in Krippen, Kindergärten und Schulen sind ausgenommen. Bei der späteren Buchung gelten die dann angebotenen Preise und die vereinbarten Leistungen. Nicht verbrauchtes Guthaben bleibt auf dem Gutschein erhalten; für ihn wird keine kurze Verfallsfrist festgelegt. Es gilt die gesetzliche Verjährungsfrist.',
      'Ein Geschenkgutschein ist ein Zahlungsmittel für seinen Geldwert und kein Partner-Rabattcode. Eine Anfrage mit Gutscheincode löst noch keine Abbuchung aus. Etwaige Partnernachlässe auf ein späteres Shooting richten sich nach deren eigenen Bedingungen; anschließend kann Gutscheinguthaben angerechnet werden. Gesetzliche Rückzahlungsansprüche bleiben unberührt.',
      'Vom Onlinekauf des Gutscheins kannst du ohne Angabe von Gründen zurücktreten. Vor dem ersten erfolgreichen Versand des freigeschalteten Gutscheins per E-Mail ist dies jederzeit möglich; danach mindestens 14 Tage ab diesem Versand. Ein erneuter Versand startet keine neue Frist. Gesetzliche Verlängerungen oder ein späterer gesetzlicher Fristbeginn, insbesondere bei späterem Erhalt, bleiben unberührt. Die Rücktrittsinformation und ein Musterformular stehen in den Gutscheinbedingungen. Die Regelungen über die vorzeitige Bildbearbeitung oder den Verlust des Rücktrittsrechts bei digitalen Fotografien gelten nicht für den bloßen Versand oder Download der Gutschein-PDF.'
    ], link: 'Gutscheinbedingungen und Rücktrittsinformation lesen'
  },
  en: {
    title: '4a. Gift vouchers', version: 'Last updated: 23 October 2026',
    paragraphs: [
      'The voucher terms shown before ordering and provided with the order confirmation govern the online purchase and use of a monetary gift voucher. Voucher purchases follow the order process described there. Session booking and cancellation terms apply to the separate photography contract concluded later; a voucher alone does not book a package or a date.',
      'You pay the chosen voucher value by bank transfer. Once full payment is confirmed, the code is activated and the PDF voucher is emailed to the buyer and made available through the protected order link. The value can be used towards personally arranged sessions. Organised nursery, kindergarten and school photo days are excluded. The prices offered and services agreed at the later booking apply. Unused credit remains on the voucher; no short expiry period is imposed. The statutory limitation period applies.',
      'A gift voucher pays its monetary value and is not a partner discount code. An enquiry with a voucher code does not debit credit. Any partner discount on a later session follows its own terms, after which voucher credit may be applied. Statutory refund rights remain unaffected.',
      'You may withdraw from an online voucher purchase without giving any reason at any time before the activated voucher is first successfully emailed, and for at least 14 days after that. Resending does not restart the period. Statutory extensions or a later statutory start, particularly if you receive the voucher later, remain unaffected. The voucher terms include withdrawal information and a model statement. The rules on early image editing or loss of withdrawal rights for digital photographs do not apply merely because a voucher PDF is sent or downloaded.'
    ], link: 'Read the voucher terms and withdrawal information'
  },
  bs: {
    title: '4a. Poklon-bonovi', version: 'Stanje: 23. oktobar 2026.',
    paragraphs: [
      'Za online kupovinu i korištenje novčanog poklon-bona važe uslovi prikazani prije narudžbe i dostavljeni uz potvrdu narudžbe. Kupovina bona prati tamo opisani postupak. Pravila rezervacije i otkazivanja fotografisanja odnose se na poseban ugovor zaključen kasnije; sam bon ne rezerviše paket niti termin.',
      'Odabrani iznos plaćaš bankovnom uplatom. Nakon potvrde pune uplate kod se aktivira, a PDF bon šalje kupcu e-mailom i postaje dostupan preko zaštićenog linka. Iznos se može koristiti za lično dogovorena fotografisanja. Organizovani dani fotografisanja u jaslicama, vrtićima i školama su izuzeti. Pri kasnijoj rezervaciji važe tada ponuđene cijene i dogovorene usluge. Neiskorišten iznos ostaje na bonu; nema kratkog roka isteka. Primjenjuje se zakonski rok zastare.',
      'Poklon-bon služi plaćanju svog novčanog iznosa i nije partnerski kod za popust. Upit s kodom ne troši sredstva. Eventualni partnerski popust na kasnije fotografisanje zavisi od vlastitih uslova, nakon čega se može uračunati bon. Zakonska prava na povrat ostaju nepromijenjena.',
      'Od online kupovine bona možeš odustati bez navođenja razloga bilo kada prije prvog uspješnog slanja aktiviranog bona e-mailom, a zatim najmanje 14 dana od tog slanja. Ponovno slanje ne pokreće novi rok. Zakonska produženja ili kasniji zakonski početak, posebno ako bon dobiješ kasnije, ostaju nepromijenjeni. Informacije i primjer izjave o odustanku nalaze se u uslovima za bonove. Pravila o ranijoj obradi fotografija ili gubitku prava na odustanak za digitalne fotografije ne važe samo zato što je PDF bona poslan ili preuzet.'
    ], link: 'Pročitaj uslove za bonove i informacije o odustanku'
  }
};

export function integrateVoucherLegal(document, relative) {
  if (!/^agb(?:-(?:en|bs))?\.html$/.test(relative)) return;
  const language = relative.includes('-en') ? 'en' : relative.includes('-bs') ? 'bs' : 'de';
  const t = copy[language];
  let section = document.querySelector('[data-gift-legal]');
  if (!section) {
    const next = [...document.querySelectorAll('h2')].find(node => /^5\./.test(node.textContent.trim()));
    if (!next) throw new Error(`Missing section 5 in ${relative}`);
    section = document.createElement('section');
    section.id = 'gutscheine';
    section.dataset.giftLegal = '';
    next.before(section);
  }
  section.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = t.title;
  section.append(heading);
  for (const text of t.paragraphs) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    section.append(paragraph);
  }
  const paragraph = document.createElement('p'), link = document.createElement('a');
  link.href = `https://portal.liza-memories-photography.com/gutscheinbedingungen${language === 'de' ? '' : '-'+language}.html`;
  link.textContent = t.link;
  paragraph.append(link);
  section.append(paragraph);
  const version = document.querySelector('.terms-version');
  if (version) version.textContent = t.version;
}
