import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const LANGUAGES = ['de', 'en', 'bs'];
const SITE_ORIGIN = 'https://liza-memories-photography.com/';

const serviceLinks = [
  { key: 'maternity', file: 'babybauch-shooting-graz.html' },
  { key: 'newborn', file: 'newborn-fotografie-graz.html' },
  { key: 'combo', file: 'babybauch-und-neugeborenen-shooting-graz.html' },
  { key: 'family', file: 'familienfotografie-graz.html' },
  { key: 'wedding', file: 'hochzeitsfotograf-graz.html' },
  { key: 'portrait', file: 'portraitfotografie-graz.html' }
];

const copy = {
  de: {
    pageTitle: 'Pakete & Preise | LiZa Memories Photography',
    metaDescription: 'Alle Pakete und Preise für Porträt- und Produktfotografie sowie Babybauch-, Neugeborenen-, Familien- und Hochzeitsfotografie in Graz im Überblick.',
    navServices: {
      portrait: 'Porträt- und Produktfotografie',
      maternity: 'Babybauch',
      newborn: 'Neugeborene',
      family: 'Familie',
      combo: 'Babybauch & Neugeborene',
      wedding: 'Hochzeit'
    },
    breadcrumbHome: 'Startseite',
    breadcrumbCurrent: 'Pakete & Preise',
    eyebrow: 'Transparent & übersichtlich',
    title: 'Pakete & Preise',
    lead: 'Wählt den Bereich, der zu euch passt, und vergleicht Bronze, Silber und Gold ganz in Ruhe. Alle Leistungen und Preisvorteile sind klar angeführt, damit ihr genau wisst, was in eurem Paket enthalten ist.',
    inquiry: 'Jetzt anfragen',
    overview: 'Schnellübersicht',
    overviewText: 'Die günstigsten Pakete aller Bereiche auf einen Blick.',
    from: 'ab',
    details: 'Pakete ansehen',
    serviceDetails: 'Mehr zur Leistung',
    packageInquiry: 'Paket anfragen',
    savings: 'Euer Vorteil',
    tiers: { bronze: 'Bronze', silver: 'Silber', gold: 'Gold' },
    extraTitle: 'Zusatzpreise & wichtige Hinweise',
    extraCards: [
      { title: 'Zusätzliche Bilder', text: 'Ein zusätzlich bearbeitetes Bild kostet 15 €. Vorteilspakete: 5 Bilder für 60 € oder 10 Bilder für 100 €.' },
      { title: 'Shootingzeit verlängern', text: 'Mehr Zeit gewünscht? 30 Minuten zusätzlich kosten 40 €, 60 Minuten zusätzlich 70 €. Die Verlängerung gilt nur für die Shootingzeit; die im Paket enthaltene Bildanzahl bleibt gleich. Bitte bei der Buchung mit mir abstimmen.' },
      { title: 'Individuelle Wünsche', text: 'Weitere Bilder, längere Begleitungen und individuell zusammengestellte Pakete sind nach Absprache jederzeit möglich.' },
      { title: 'Preishinweis', text: 'Alle Preise sind umsatzsteuerfrei gemäß § 6 Abs. 1 Z 27 UStG. Anfahrtskosten außerhalb von Graz werden individuell berechnet.' }
    ],
    finalTitle: 'Noch unsicher, welches Paket passt?',
    finalText: 'Schreibt mir kurz, was ihr euch wünscht. Ich helfe euch gerne dabei, das passende Paket für eure Bilder auszuwählen.',
    finalButton: 'Persönlich beraten lassen'
  },
  en: {
    pageTitle: 'Packages & Pricing | LiZa Memories Photography',
    metaDescription: 'Transparent packages and pricing for portrait and product photography, maternity, newborn, family and wedding photography in Graz.',
    navServices: {
      portrait: 'Portrait & product photography',
      maternity: 'Maternity',
      newborn: 'Newborn',
      family: 'Family',
      combo: 'Maternity & Newborn',
      wedding: 'Wedding'
    },
    breadcrumbHome: 'Home',
    breadcrumbCurrent: 'Packages & Pricing',
    eyebrow: 'Transparent & easy to compare',
    title: 'Packages & Pricing',
    lead: 'Choose the photography experience that suits you and compare Bronze, Silver and Gold at your own pace. Every inclusion and package advantage is listed clearly, so you know exactly what you receive.',
    inquiry: 'Inquire now',
    overview: 'Quick overview',
    overviewText: 'The entry price for every photography category at a glance.',
    from: 'from',
    details: 'View packages',
    serviceDetails: 'Explore the service',
    packageInquiry: 'Inquire about this package',
    savings: 'Your advantage',
    tiers: { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' },
    extraTitle: 'Additional pricing & important notes',
    extraCards: [
      { title: 'Additional images', text: 'One additional edited image costs €15. Bundle options: 5 images for €60 or 10 images for €100.' },
      { title: 'Extend your session', text: 'Need more time? Add 30 minutes for €40 or 60 minutes for €70. This extends the session only; the number of images included in your package stays the same. Please arrange the extra time when booking.' },
      { title: 'Individual requests', text: 'Additional images, longer coverage and individually tailored packages are always possible by arrangement.' },
      { title: 'Pricing note', text: 'All prices are VAT-exempt under § 6 para. 1 no. 27 UStG. Travel costs outside Graz are calculated individually.' }
    ],
    finalTitle: 'Not sure which package suits you?',
    finalText: 'Send me a short message about what you have in mind. I will gladly help you choose the right package for your images.',
    finalButton: 'Get personal guidance'
  },
  bs: {
    pageTitle: 'Paketi & cijene | LiZa Memories Photography',
    metaDescription: 'Pregledni paketi i cijene za portrete i proizvode, trudnice, novorođenčad, porodice i vjenčanja u Grazu.',
    navServices: {
      portrait: 'Fotografisanje portreta i proizvoda',
      maternity: 'Trudničko',
      newborn: 'Novorođenčad',
      family: 'Porodica',
      combo: 'Trudničko & novorođenče',
      wedding: 'Vjenčanje'
    },
    breadcrumbHome: 'Početna',
    breadcrumbCurrent: 'Paketi & cijene',
    eyebrow: 'Transparentno & pregledno',
    title: 'Paketi & cijene',
    lead: 'Odaberite vrstu fotografisanja koja vam odgovara i u miru uporedite bronzani, srebrni i zlatni paket. Sve usluge i pogodnosti jasno su navedene kako biste tačno znali šta je uključeno.',
    inquiry: 'Pošalji upit',
    overview: 'Brzi pregled',
    overviewText: 'Početne cijene svih vrsta fotografisanja na jednom mjestu.',
    from: 'od',
    details: 'Pogledaj pakete',
    serviceDetails: 'Više o usluzi',
    packageInquiry: 'Pošalji upit za paket',
    savings: 'Vaša pogodnost',
    tiers: { bronze: 'Bronza', silver: 'Srebro', gold: 'Zlato' },
    extraTitle: 'Dodatne cijene & važne napomene',
    extraCards: [
      { title: 'Dodatne fotografije', text: 'Jedna dodatno obrađena fotografija košta 15 €. Paket ponude: 5 fotografija za 60 € ili 10 fotografija za 100 €.' },
      { title: 'Produžite fotografisanje', text: 'Treba vam više vremena? Dodatnih 30 minuta košta 40 €, a dodatnih 60 minuta 70 €. Produžava se samo vrijeme fotografisanja; broj fotografija uključenih u paket ostaje isti. Produženje dogovorite pri rezervaciji.' },
      { title: 'Individualne želje', text: 'Dodatne fotografije, duža pratnja i individualno prilagođeni paketi uvijek su mogući po dogovoru.' },
      { title: 'Napomena o cijenama', text: 'Sve cijene su oslobođene PDV-a prema § 6 st. 1 br. 27 UStG. Putni troškovi izvan Graza obračunavaju se individualno.' }
    ],
    finalTitle: 'Niste sigurni koji paket vam odgovara?',
    finalText: 'Napišite mi ukratko šta želite. Rado ću vam pomoći da odaberete odgovarajući paket za vaše fotografije.',
    finalButton: 'Zatraži lični savjet'
  }
};

const categories = [
  {
    id: 'portrait',
    serviceKey: 'portrait',
    start: 99,
    title: { de: 'Porträt- und Produktfotografie', en: 'Portrait & Product Photography', bs: 'Fotografisanje portreta i proizvoda' },
    intro: {
      de: 'Persönliche Porträts oder stimmige Produktbilder: Die Pakete gelten für beide Bereiche. Produktanzahl, Hintergründe, Bildvarianten und Verwendungszweck stimmen wir vor der Buchung ab; die enthaltene Bildanzahl ist keine feste Produktanzahl.',
      en: 'Personal portraits or considered product images: these packages apply to both. We agree on the products, backgrounds, image variations and intended use before booking; the number of included images is not a fixed number of products.',
      bs: 'Lični portreti ili pažljivo osmišljene fotografije proizvoda: paketi važe za oba područja. Broj proizvoda, pozadine, varijante fotografija i namjenu dogovaramo prije rezervacije; broj uključenih fotografija nije fiksni broj proizvoda.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 99,
        name: { de: 'Kleine Erinnerung', en: 'Small Memory', bs: 'Mala uspomena' },
        details: {
          de: ['20 Minuten', '3 bearbeitete Bilder', '1 Outfit bei Porträts', '1 Bildlook', 'Produktgestaltung nach Absprache'],
          en: ['20 minutes', '3 edited images', '1 outfit for portraits', '1 image look', 'Product styling by arrangement'],
          bs: ['20 minuta', '3 obrađene fotografije', '1 outfit za portrete', '1 izgled fotografije', 'Postavka proizvoda po dogovoru']
        }
      },
      {
        tier: 'silver',
        price: 119,
        name: { de: 'Lieblingsmomente', en: 'Favorite Moments', bs: 'Omiljeni trenuci' },
        details: {
          de: ['20 Minuten', '5 bearbeitete Bilder', '1 Outfit bei Porträts', '1 Bildlook', 'Produktgestaltung nach Absprache'],
          en: ['20 minutes', '5 edited images', '1 outfit for portraits', '1 image look', 'Product styling by arrangement'],
          bs: ['20 minuta', '5 obrađenih fotografija', '1 outfit za portrete', '1 izgled fotografije', 'Postavka proizvoda po dogovoru']
        },
        benefits: {
  "de": [
    "2 Bilder mehr",
    "Günstiger als Bronze + Zusatzbilder"
  ],
  "en": [
    "2 more images",
    "Less than Bronze + extra images"
  ],
  "bs": [
    "2 fotografije više",
    "Povoljnije od bronze uz dodatne fotografije"
  ]
}
      },
      {
        tier: 'gold',
        price: 154,
        name: { de: 'Porträt- & Produktvielfalt', en: 'Portrait & Product Variety', bs: 'Raznolikost portreta i proizvoda' },
        details: {
          de: ['30 Minuten', '8 bearbeitete Bilder', 'Bis zu 2 Outfits bei Porträts', 'Verschiedene Bildvarianten', 'Produktgestaltung nach Absprache'],
          en: ['30 minutes', '8 edited images', 'Up to 2 outfits for portraits', 'Different image variations', 'Product styling by arrangement'],
          bs: ['30 minuta', '8 obrađenih fotografija', 'Do 2 outfita za portrete', 'Različite varijante fotografija', 'Postavka proizvoda po dogovoru']
        },
        benefits: {
  "de": [
    "3 Bilder mehr",
    "10 Minuten mehr",
    "Bis zu 2 Outfits bei Porträts"
  ],
  "en": [
    "3 more images",
    "10 more minutes",
    "Up to 2 outfits for portraits"
  ],
  "bs": [
    "3 fotografije više",
    "10 minuta više",
    "Do 2 outfita za portrete"
  ]
}
      }
    ]
  },
  {
    id: 'babybauch',
    serviceKey: 'maternity',
    start: 179,
    title: { de: 'Babybauchshooting', en: 'Maternity Session', bs: 'Trudničko fotografisanje' },
    intro: {
      de: 'Von einer kleinen Erinnerung bis zur vielseitigen Babybauchserie mit der ganzen Familie.',
      en: 'From a small keepsake to a varied maternity series including your family.',
      bs: 'Od male uspomene do raznovrsne trudničke serije sa cijelom porodicom.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 179,
        name: { de: 'Mama & Bauch', en: 'Mama & Bump', bs: 'Mama i trbuščić' },
        details: {
          de: ['30 Minuten', '5 bearbeitete Bilder', '1 Outfit beziehungsweise Bildset'],
          en: ['30 minutes', '5 edited images', '1 outfit or image set'],
          bs: ['30 minuta', '5 obrađenih fotografija', '1 outfit odnosno set']
        }
      },
      {
        tier: 'silver',
        price: 214,
        name: { de: 'Gemeinsam warten', en: 'Waiting Together', bs: 'Zajedno u iščekivanju' },
        details: {
          de: ['45 Minuten', '8 bearbeitete Bilder', 'Bis zu 2 Outfits oder Bildsets', 'Partner inklusive'],
          en: ['45 minutes', '8 edited images', 'Up to 2 outfits or image sets', 'Partner included'],
          bs: ['45 minuta', '8 obrađenih fotografija', 'Do 2 outfita ili seta', 'Partner uključen']
        },
        benefits: {
  "de": [
    "3 Bilder mehr",
    "15 Minuten mehr",
    "Partner inklusive"
  ],
  "en": [
    "3 more images",
    "15 more minutes",
    "Partner included"
  ],
  "bs": [
    "3 fotografije više",
    "15 minuta više",
    "Partner uključen"
  ]
}
      },
      {
        tier: 'gold',
        price: 284,
        name: { de: 'Liebe im Bauch', en: 'Love Within', bs: 'Ljubav u iščekivanju' },
        details: {
          de: ['60 Minuten', '14 bearbeitete Bilder', 'Bis zu 3 Outfits oder Bildsets', 'Partner und Geschwister inklusive'],
          en: ['60 minutes', '14 edited images', 'Up to 3 outfits or image sets', 'Partner and siblings included'],
          bs: ['60 minuta', '14 obrađenih fotografija', 'Do 3 outfita ili seta', 'Partner i djeca uključeni']
        },
        benefits: {
  "de": [
    "6 Bilder mehr",
    "Bis zu 3 Outfits oder Sets",
    "Partner und Geschwister inklusive"
  ],
  "en": [
    "6 more images",
    "Up to 3 outfits or sets",
    "Partner and siblings included"
  ],
  "bs": [
    "6 fotografija više",
    "Do 3 outfita ili seta",
    "Partner i djeca uključeni"
  ]
}
      }
    ]
  },
  {
    id: 'neugeborene',
    serviceKey: 'newborn',
    start: 199,
    title: { de: 'Neugeborenen- & Babyfotografie', en: 'Newborn & Baby Photography', bs: 'Fotografisanje novorođenčadi & beba' },
    intro: {
      de: 'Ruhige Neugeborenenshootings mit vorbereiteten Bildsets und viel Zeit für euer Baby.',
      en: 'Calm newborn sessions with prepared image sets and plenty of time for your baby.',
      bs: 'Mirno fotografisanje novorođenčeta uz pripremljene setove i dovoljno vremena za bebu.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 199,
        name: { de: 'Kleines Wunder', en: 'Little Wonder', bs: 'Malo čudo' },
        details: {
          de: ['Bis zu 75 Minuten', '6 bearbeitete Bilder', '1 vorbereitetes Bildset', 'Babyaufnahmen'],
          en: ['Up to 75 minutes', '6 edited images', '1 prepared image set', 'Baby portraits'],
          bs: ['Do 75 minuta', '6 obrađenih fotografija', '1 pripremljeni set', 'Fotografije bebe']
        }
      },
      {
        tier: 'silver',
        price: 249,
        name: { de: 'Erste Erinnerungen', en: 'First Memories', bs: 'Prve uspomene' },
        details: {
          de: ['Bis zu 90 Minuten', '11 bearbeitete Bilder', '2 vorbereitete Bildsets', 'Elternbilder inklusive'],
          en: ['Up to 90 minutes', '11 edited images', '2 prepared image sets', 'Parent portraits included'],
          bs: ['Do 90 minuta', '11 obrađenih fotografija', '2 pripremljena seta', 'Fotografije s roditeljima uključene']
        },
        benefits: {
  "de": [
    "5 Bilder mehr",
    "2 vorbereitete Sets",
    "Elternbilder inklusive"
  ],
  "en": [
    "5 more images",
    "2 prepared sets",
    "Parent portraits included"
  ],
  "bs": [
    "5 fotografija više",
    "2 pripremljena seta",
    "Fotografije s roditeljima uključene"
  ]
}
      },
      {
        tier: 'gold',
        price: 329,
        name: { de: 'Willkommen, kleines Wunder', en: 'Welcome, Little Wonder', bs: 'Dobrodošlo, malo čudo' },
        details: {
          de: ['Bis zu 2 Stunden', '18 bearbeitete Bilder', '3 vorbereitete Bildsets', 'Familien- und Geschwisterbilder inklusive'],
          en: ['Up to 2 hours', '18 edited images', '3 prepared image sets', 'Family and sibling portraits included'],
          bs: ['Do 2 sata', '18 obrađenih fotografija', '3 pripremljena seta', 'Porodične fotografije i fotografije s djecom uključene']
        },
        benefits: {
  "de": [
    "7 Bilder mehr",
    "3 vorbereitete Sets",
    "Familien- und Geschwisterbilder"
  ],
  "en": [
    "7 more images",
    "3 prepared sets",
    "Family and sibling portraits"
  ],
  "bs": [
    "7 fotografija više",
    "3 pripremljena seta",
    "Porodične fotografije i fotografije s djecom"
  ]
}
      }
    ]
  },
  {
    id: 'familie',
    serviceKey: 'family',
    start: 189,
    title: { de: 'Familienshooting', en: 'Family Session', bs: 'Porodično fotografisanje' },
    intro: {
      de: 'Natürliche Familienmomente von der kleinen gemeinsamen Serie bis zu vielen Konstellationen.',
      en: 'Natural family moments, from a small shared series to a wide range of family combinations.',
      bs: 'Prirodni porodični trenuci, od male zajedničke serije do različitih porodičnih kombinacija.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 189,
        name: { de: 'Kleine Familienzeit', en: 'Little Family Time', bs: 'Malo porodično vrijeme' },
        details: {
          de: ['30 Minuten', '5 bearbeitete Bilder', 'Gemeinsame Familienaufnahmen'],
          en: ['30 minutes', '5 edited images', 'Shared family portraits'],
          bs: ['30 minuta', '5 obrađenih fotografija', 'Zajednički porodični portreti']
        }
      },
      {
        tier: 'silver',
        price: 239,
        name: { de: 'Familienmomente', en: 'Family Moments', bs: 'Porodični trenuci' },
        details: {
          de: ['45 Minuten', '9 bearbeitete Bilder', 'Verschiedene Familienkonstellationen'],
          en: ['45 minutes', '9 edited images', 'Different family combinations'],
          bs: ['45 minuta', '9 obrađenih fotografija', 'Različite porodične kombinacije']
        },
        benefits: {
  "de": [
    "4 Bilder mehr",
    "15 Minuten mehr",
    "Verschiedene Familienkonstellationen"
  ],
  "en": [
    "4 more images",
    "15 more minutes",
    "Different family combinations"
  ],
  "bs": [
    "4 fotografije više",
    "15 minuta više",
    "Različite porodične kombinacije"
  ]
}
      },
      {
        tier: 'gold',
        price: 319,
        name: { de: 'Familienzeit', en: 'Family Time', bs: 'Porodično vrijeme' },
        details: {
          de: ['60 Minuten', '16 bearbeitete Bilder', 'Familien-, Geschwister- und Einzelaufnahmen'],
          en: ['60 minutes', '16 edited images', 'Family, sibling and individual portraits'],
          bs: ['60 minuta', '16 obrađenih fotografija', 'Porodični, dječiji i pojedinačni portreti']
        },
        benefits: {
  "de": [
    "7 Bilder mehr",
    "15 Minuten mehr",
    "Auch Geschwister- und Einzelbilder"
  ],
  "en": [
    "7 more images",
    "15 more minutes",
    "Sibling and individual portraits too"
  ],
  "bs": [
    "7 fotografija više",
    "15 minuta više",
    "I dječiji i pojedinačni portreti"
  ]
}
      }
    ]
  },
  {
    id: 'kombi',
    serviceKey: 'combo',
    start: 299,
    title: { de: 'Babybauch- & Neugeborenen-Kombination', en: 'Maternity & Newborn Bundle', bs: 'Trudničko & novorođenče paket' },
    intro: {
      de: 'Zwei aufeinander abgestimmte Shootings mit deutlichem Preisvorteil gegenüber Einzelbuchungen.',
      en: 'Two coordinated sessions with clear savings compared with individual bookings.',
      bs: 'Dva usklađena fotografisanja uz jasnu uštedu u odnosu na pojedinačne rezervacije.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 299,
        name: { de: 'Zwei kleine Erinnerungen', en: 'Two Little Memories', bs: 'Dvije male uspomene' },
        details: {
          de: ['2 Shootings', 'Je 5 bearbeitete Bilder', 'Je 1 Bildset', 'Insgesamt 10 Bilder'],
          en: ['2 sessions', '5 edited images per session', '1 image set per session', '10 images in total'],
          bs: ['2 fotografisanja', 'Po 5 obrađenih fotografija', 'Po 1 set', 'Ukupno 10 fotografija']
        },
        benefits: {
  "de": [
    "Beide Shootings in einem Paket"
  ],
  "en": [
    "Both sessions in one package"
  ],
  "bs": [
    "Oba fotografisanja u jednom paketu"
  ]
}
      },
      {
        tier: 'silver',
        price: 389,
        name: { de: 'Unsere Geschichte', en: 'Our Story', bs: 'Naša priča' },
        details: {
          de: ['2 Shootings', 'Je 9 bearbeitete Bilder', 'Je bis zu 2 Bildsets', 'Insgesamt 18 Bilder'],
          en: ['2 sessions', '9 edited images per session', 'Up to 2 image sets per session', '18 images in total'],
          bs: ['2 fotografisanja', 'Po 9 obrađenih fotografija', 'Do 2 seta po fotografisanju', 'Ukupno 18 fotografija']
        },
        benefits: {
  "de": [
    "Je Shooting 4 Bilder mehr",
    "Je bis zu 2 Sets"
  ],
  "en": [
    "4 more images per session",
    "Up to 2 sets per session"
  ],
  "bs": [
    "Po 4 fotografije više",
    "Do 2 seta po fotografisanju"
  ]
}
      },
      {
        tier: 'gold',
        price: 499,
        name: { de: 'Vom Bauch ins Herz', en: 'From Bump to Heart', bs: 'Od stomaka do srca' },
        details: {
          de: ['2 Shootings', 'Je 15 bearbeitete Bilder', 'Je bis zu 3 Bildsets', 'Partner und Geschwister inklusive', 'Insgesamt 30 Bilder'],
          en: ['2 sessions', '15 edited images per session', 'Up to 3 image sets per session', 'Partner and siblings included', '30 images in total'],
          bs: ['2 fotografisanja', 'Po 15 obrađenih fotografija', 'Do 3 seta po fotografisanju', 'Partner i djeca uključeni', 'Ukupno 30 fotografija']
        },
        benefits: {
  "de": [
    "Je Shooting 6 Bilder mehr",
    "Je bis zu 3 Sets",
    "Partner und Geschwister inklusive"
  ],
  "en": [
    "6 more images per session",
    "Up to 3 sets per session",
    "Partner and siblings included"
  ],
  "bs": [
    "Po 6 fotografija više",
    "Do 3 seta po fotografisanju",
    "Partner i djeca uključeni"
  ]
}
      }
    ]
  },
  {
    id: 'hochzeit',
    serviceKey: 'wedding',
    start: 299,
    title: { de: 'Hochzeit & kleine Feiern', en: 'Wedding & Intimate Celebrations', bs: 'Vjenčanje & male proslave' },
    intro: {
      de: 'Fotografische Begleitung für Standesamt, Taufen, intime Hochzeiten und kleine Feiern.',
      en: 'Photographic coverage for civil ceremonies, baptisms, intimate weddings and small celebrations.',
      bs: 'Fotografska pratnja za vjenčanja, krštenja, intimna slavlja i male proslave.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 299,
        name: { de: 'Ja, ich will', en: 'Yes, I Do', bs: 'Da, želim' },
        details: {
          de: ['Bis zu 1 Stunde', 'Trauung und Gruppenbilder', 'Ca. 20 professionell bearbeitete Bilder', 'Private Online-Galerie'],
          en: ['Up to 1 hour', 'Ceremony and group portraits', 'Around 20 professionally edited images', 'Private online gallery'],
          bs: ['Do 1 sat', 'Ceremonija i grupne fotografije', 'Oko 20 profesionalno obrađenih fotografija', 'Privatna online galerija']
        }
      },
      {
        tier: 'silver',
        price: 449,
        name: { de: 'Unser Moment', en: 'Our Moment', bs: 'Naš trenutak' },
        details: {
          de: ['Bis zu 2 Stunden', 'Trauung, Paar- und Gruppenfotos', 'Ca. 30 Highlightbilder', 'Zusätzliche grundoptimierte Reportagebilder'],
          en: ['Up to 2 hours', 'Ceremony, couple and group portraits', 'Around 30 highlight images', 'Additional basic-optimized reportage images'],
          bs: ['Do 2 sata', 'Ceremonija, fotografije para i grupne fotografije', 'Oko 30 istaknutih fotografija', 'Dodatne osnovno optimizirane reportažne fotografije']
        },
        benefits: {
  "de": [
    "Bis zu 2 Stunden",
    "Paarfotos inklusive",
    "Zusätzliche Reportagebilder"
  ],
  "en": [
    "Up to 2 hours",
    "Couple portraits included",
    "Additional reportage images"
  ],
  "bs": [
    "Do 2 sata",
    "Fotografije para uključene",
    "Dodatne reportažne fotografije"
  ]
}
      },
      {
        tier: 'gold',
        price: 639,
        name: { de: 'Unser besonderer Tag', en: 'Our Special Day', bs: 'Naš poseban dan' },
        details: {
          de: ['Bis zu 3 Stunden', 'Zeremonie, Paarfotos, Gruppenbilder und kleine Feier', 'Ca. 35 Highlightbilder', 'Ca. 65 zusätzliche grundoptimierte Reportagebilder'],
          en: ['Up to 3 hours', 'Ceremony, couple portraits, group photos and intimate celebration', 'Around 35 highlight images', 'Around 65 additional basic-optimized reportage images'],
          bs: ['Do 3 sata', 'Ceremonija, fotografije para, grupne fotografije i mala proslava', 'Oko 35 istaknutih fotografija', 'Oko 65 dodatnih osnovno optimiziranih reportažnih fotografija']
        },
        benefits: {
  "de": [
    "Bis zu 3 Stunden",
    "Kleine Feier inklusive",
    "Ca. 65 Reportagebilder zusätzlich"
  ],
  "en": [
    "Up to 3 hours",
    "Intimate celebration included",
    "Around 65 additional reportage images"
  ],
  "bs": [
    "Do 3 sata",
    "Mala proslava uključena",
    "Oko 65 dodatnih reportažnih fotografija"
  ]
}
      }
    ]
  }
];

function localizedFile(fileName, lang) {
  if (fileName === '/' || /^index(?:-(?:en|bs))?\.html$/i.test(fileName)) {
    return lang === 'de' ? '/' : `index-${lang}.html`;
  }
  const baseFile = fileName.replace(/-(?:en|bs)\.html$/i, '.html');
  return lang === 'de' ? baseFile : baseFile.replace(/\.html$/, `-${lang}.html`);
}

function pricingFile(lang) {
  return lang === 'de' ? 'preise.html' : `preise-${lang}.html`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function priceText(amount, lang, withPrefix = false) {
  if (lang === 'en') {
    return `${withPrefix ? 'from ' : ''}€${amount}`;
  }
  const prefix = withPrefix ? `${copy[lang].from} ` : '';
  return `${prefix}${amount} €`;
}

function renderPackageCard(category, packageInfo, lang) {
  const strings = copy[lang];
  const imageIndex = category.id === 'kombi' ? packageInfo.details[lang].length - 1 : category.id === 'hochzeit' ? 2 : 1;
  const orderedDetails = [...packageInfo.details[lang]];
  orderedDetails.unshift(...orderedDetails.splice(imageIndex, 1));
  const details = orderedDetails
    .map((detail) => `<li>${escapeHtml(detail)}</li>`)
    .join('');
  const comparison = category.id === 'hochzeit' ? null : packageInfo.tier === 'silver' ? strings.tiers.bronze : packageInfo.tier === 'gold' ? strings.tiers.silver : null;
  const advantageLabel = comparison ? ({de:'Mehr als ',en:'More than ',bs:'Više od paketa '}[lang] + comparison) : strings.savings;
  const saving = packageInfo.benefits?.[lang]
    ? `<div class="package-saving"><strong>${escapeHtml(advantageLabel)}</strong><ul class="package-benefits">${packageInfo.benefits[lang].map(benefit => `<li>${escapeHtml(benefit)}</li>`).join('')}</ul></div>`
    : '';
  const inquiryHref = `${localizedFile('index.html', lang)}?service=${category.serviceKey}&package=${packageInfo.tier}&source=${pricingFile(lang)}#contact-form-card`;

  return `<article class="package-card package-card--${packageInfo.tier}">
    <span class="package-tier">${escapeHtml(strings.tiers[packageInfo.tier])}</span>
    <h3>${escapeHtml(packageInfo.name[lang])}</h3>
    <div class="num" data-promo-price>${priceText(packageInfo.price, lang)}</div>
    <ul class="package-details">${details}</ul>
    ${saving}
    <a class="btn primary" href="${inquiryHref}">${escapeHtml(strings.packageInquiry)}</a>
  </article>`;
}

function renderPricingMain(lang) {
  const strings = copy[lang];
  const overview = categories.map((category) => `<article class="price-overview-card">
    <span class="label">${escapeHtml(strings.from)}</span>
    <h3>${escapeHtml(category.title[lang])}</h3>
    <div class="num" data-promo-price>${priceText(category.start, lang, true)}</div>
    <a href="#${category.id}">${escapeHtml(strings.details)} →</a>
  </article>`).join('');

  const jumpLinks = categories
    .map((category) => `<a href="#${category.id}">${escapeHtml(category.title[lang])}</a>`)
    .join('');

  const sections = categories.map((category) => {
    const service = serviceLinks.find((item) => item.key === category.serviceKey);
    const serviceHref = localizedFile(service.file, lang);
    const cards = category.packages
      .map((packageInfo) => renderPackageCard(category, packageInfo, lang))
      .join('');

    return `<section class="package-section" id="${category.id}">
      <div class="container">
        <div class="package-section-head">
          <div>
            <h2>${escapeHtml(category.title[lang])}</h2>
            <p>${escapeHtml(category.intro[lang])}</p>
            <a class="service-detail-link" href="${serviceHref}">${escapeHtml(strings.serviceDetails)} →</a>
          </div>
          <div class="starting-price" data-promo-price>${priceText(category.start, lang, true)}</div>
        </div>
        <div class="package-grid">${cards}</div>
      </div>
    </section>`;
  }).join('');

  const notes = strings.extraCards
    .map((card) => `<article class="price-note"><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.text)}</p></article>`)
    .join('');

  return `<main>
    <section class="pricing-hero">
      <div class="container">
        <span class="eyebrow">${escapeHtml(strings.eyebrow)}</span>
        <h1>${escapeHtml(strings.title)}</h1>
        <p class="lead">${escapeHtml(strings.lead)}</p>
        <div class="pricing-hero-actions">
          <a class="btn primary" href="${localizedFile('index.html', lang)}#contact-form-card">${escapeHtml(strings.inquiry)}</a>
          <a class="btn secondary" href="#overview">${escapeHtml(strings.overview)}</a>
        </div>
      </div>
    </section>
    <div class="price-jump-wrap" aria-label="${escapeHtml(strings.overview)}">
      <nav class="container price-jump">${jumpLinks}</nav>
    </div>
    <section class="price-overview-section" id="overview">
      <div class="container section-head">
        <h2>${escapeHtml(strings.overview)}</h2>
        <p>${escapeHtml(strings.overviewText)}</p>
      </div>
      <div class="container price-overview">${overview}</div>
    </section>
    ${sections}
    <section class="price-notes">
      <div class="container section-head">
        <h2>${escapeHtml(strings.extraTitle)}</h2>
      </div>
      <div class="container price-note-grid">${notes}</div>
    </section>
    <section class="pricing-final-cta">
      <div class="container cta-band">
        <h2>${escapeHtml(strings.finalTitle)}</h2>
        <p>${escapeHtml(strings.finalText)}</p>
        <div class="hero-actions">
          <a class="btn primary" href="${localizedFile('index.html', lang)}#contact-form-card">${escapeHtml(strings.finalButton)}</a>
        </div>
      </div>
    </section>
  </main>`;
}

function setMeta(document, selector, content) {
  const node = document.querySelector(selector);
  if (node) {
    node.setAttribute('content', content);
  }
}

function ensureServiceNavigation(document, lang) {
  const labels = copy[lang].navServices;
  const menu = document.querySelector('.services-dropdown .nav-dropdown-menu');
  if (menu) {
    menu.innerHTML = serviceLinks
      .map((service) => `<a href="${localizedFile(service.file, lang)}" data-service-key="${service.key}">${escapeHtml(labels[service.key])}</a>`)
      .join('');
  }

  const footer = document.querySelector('.footer-primary-links');
  const portfolioLink = footer?.querySelector('a');
  if (footer) {
    const portfolio = portfolioLink
      ? `<a href="${localizedFile('index.html', lang)}#portfolio">${escapeHtml(portfolioLink.textContent)}</a>`
      : '';
    footer.innerHTML = portfolio + serviceLinks
      .map((service) => `<a href="${localizedFile(service.file, lang)}" data-service-key="${service.key}">${escapeHtml(labels[service.key])}</a>`)
      .join('');
  }
}

async function createHomeTemplates() {
  const template = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');

  await Promise.all(['en', 'bs'].map((lang) => (
    fs.writeFile(path.join(ROOT, localizedFile('index.html', lang)), template, 'utf8')
  )));
}


// The portrait URL remains stable; both photography services share these packages.
const portraitCopy = {
  de: {
    name: 'Porträt- und Produktfotografie',
    title: 'Porträt- und Produktfotografie in Graz | LiZa Memories Photography',
    description: 'Natürliche Porträts und sorgfältig gestaltete Produktfotos in Graz. Bildstil, Hintergründe und Verwendungszweck stimmen wir persönlich ab. Pakete ab 99 €.',
    heroTitle: 'Porträt- und Produktfotografie in Graz – persönlich und passend zu deinem Stil.',
    lead: 'Ob natürliche Porträts oder Bilder für deine Produkte: Gemeinsam stimmen wir Bildstil, Hintergrund und Verwendungszweck ab. Beim Porträtshooting begleite ich dich mit ruhiger Anleitung; bei Produktaufnahmen achten wir auf Form, Details und eine passende Präsentation. So entstehen Bilder, die zu dir oder deinem Angebot passen.',
    points: [
      ['Dauer', 'Je nach Paket 20 oder 30 Minuten; Verlängerung nach Absprache'],
      ['Bildgestaltung', 'Outfits bei Porträts; Produkte, Hintergründe und Bildvarianten nach Absprache'],
      ['Deine Bilder', 'Sorgfältig ausgewählt und bearbeitet in deiner persönlichen Online-Galerie']
    ],
    detailsTitle: 'Porträts mit Persönlichkeit. Produkte mit klarer Bildsprache.',
    detailsLead: 'Wir bereiten dein Shooting passend zum Motiv vor – mit einem klaren Plan für die Bilder, die du brauchst.',
    cardTitle: 'Dein Motiv im Mittelpunkt',
    items: [
      'Natürliche Porträts mit ruhiger Anleitung, passenden Posen und persönlichen Bildlooks.',
      'Produktfotos für die Präsentation deines Angebots, etwa auf deiner Website oder in sozialen Medien.',
      'Produktanzahl, Perspektiven, Hintergründe und Bildgestaltung besprechen wir vor der Buchung.',
      'Deine ausgewählten Bilder werden sorgfältig und professionell bearbeitet.'
    ],
    flowTitle: 'Einfach vorbereitet',
    steps: [
      'Schreib mir dein Wunschdatum und ob du Porträts oder Produktfotos möchtest. Nenne auch den geplanten Verwendungszweck.',
      'Wir stimmen Kleidung oder Produkte, gewünschte Ansichten, Hintergründe und das passende Paket ab.',
      'Beim Shooting setzen wir den vereinbarten Bildstil um. Anschließend wählst du deine Bilder für die Bearbeitung aus.'
    ],
    faqTitle: 'Häufige Fragen zur Porträt- und Produktfotografie',
    faqLead: 'Alles Wichtige zu Vorbereitung, Bildauswahl und der passenden Gestaltung für Menschen und Produkte.',
    faqs: [
      ['Brauche ich Erfahrung vor der Kamera?', 'Nein. Beim Porträtshooting erkläre ich dir in Ruhe, was gut funktioniert, und leite dich so an, dass Haltung und Ausdruck natürlich bleiben.'],
      ['Wie bereiten wir das Shooting vor?', 'Erzähl mir, ob du Porträts oder Produktfotos möchtest, wofür du die Bilder brauchst und welche Wirkung du dir wünschst. Danach stimmen wir Kleidung oder Produkte, Hintergrund, Perspektiven und Bildstil ab.'],
      ['Wie lange dauert das Shooting und kann ich Zeit dazubuchen?', 'Je nach Paket sind 20 oder 30 Minuten vorgesehen. Du kannst nach Absprache 30 Minuten für 40 € oder 60 Minuten für 70 € ergänzen. Damit verlängert sich nur die Shootingzeit; die im Paket enthaltene Bildanzahl bleibt gleich.'],
      ['Wie viele bearbeitete Bilder sind enthalten?', 'Je nach Paket bekommst du 3, 5 oder 8 professionell bearbeitete Bilder. Ein zusätzliches Bild kostet 15 €, 5 zusätzliche Bilder kosten 60 € und 10 zusätzliche Bilder 100 €.'],
      ['Wie viele Outfits oder Bildvarianten sind möglich?', 'Für Porträts sind im Bronze- und Silber-Paket ein Outfit und ein Bildlook vorgesehen; im Gold-Paket bis zu zwei Outfits und verschiedene Bildvarianten. Bei Produktfotos stimmen wir Gestaltung, Hintergründe und Ansichten vorab passend zur verfügbaren Shootingzeit ab.'],
      ['Was soll ich mitbringen?', 'Für Porträts bring bitte passende Kleidung und bei Bedarf kleine Accessoires mit. Produkte sollten sauber und vollständig sein; gewünschte Verpackungen oder passende Requisiten besprechen wir vorher. Fotos deiner Auswahl helfen bei der Vorbereitung.'],
      ['Wie viele Produkte können fotografiert werden?', 'Das hängt von Größe, Material, Aufbau und den gewünschten Perspektiven ab. Schick mir vor der Buchung die Produktanzahl und nach Möglichkeit Fotos der Produkte. Wir klären gemeinsam, was im gewählten Zeitrahmen möglich ist. Die Paket-Bildanzahl ist keine feste Produktanzahl.'],
      ['Welche Angaben brauchst du für Produktfotos?', 'Hilfreich sind Fotos und Maße der Produkte, gewünschte Ansichten und Hintergründe sowie der geplante Einsatz, zum Beispiel Website, Onlineshop oder soziale Medien. Formatvorgaben und besondere Wünsche klären wir vor der Buchung; die geschäftliche Nutzung und den Umfang der Nutzungsrechte vereinbaren wir vorab schriftlich.'],
      ['Kann ich Beispielbilder oder eine gewünschte Bildstimmung schicken?', 'Sehr gerne. Beispiele helfen mir zu verstehen, welche Stimmung und Gestaltung du magst. Gemeinsam entwickeln wir daraus eine passende Bildserie für dich oder deine Produkte.'],
      ['Was, wenn ich mich beim Porträtshooting unsicher fühle?', 'Wir starten ruhig, probieren kleine Veränderungen und schauen, was sich für dich gut anfühlt. Du musst nichts vorspielen – mein Ziel sind persönliche Porträts, auf denen du dich wiedererkennst.']
    ],
    ctaTitle: 'Porträt- und Produktfotografie in Graz anfragen',
    ctaText: 'Die Pakete starten bei <strong data-promo-price>99 €</strong> für 20 Minuten Shooting und 3 bearbeitete Bilder. Bei Porträts sind ein Outfit und ein Bildlook vorgesehen; den Umfang deiner Produktaufnahmen stimmen wir vorher gemeinsam ab.',
    cta: 'Porträt- oder Produktshooting anfragen'
  },
  en: {
    name: 'Portrait & product photography',
    title: 'Portrait & Product Photography in Graz | LiZa Memories Photography',
    description: 'Natural portraits and thoughtfully styled product photographs in Graz. We agree on the image style, backgrounds and intended use together. Packages from €99.',
    heroTitle: 'Portrait & product photography in Graz – personal and true to your style.',
    lead: 'Whether you want natural portraits or photographs of your products, we agree on the image style, background and intended use together. I offer calm guidance for portraits and focus on shape, detail and suitable presentation for product photographs. The result is a set of images that fits you or your offering.',
    points: [
      ['Duration', '20 or 30 minutes, depending on the package; extra time by arrangement'],
      ['Image styling', 'Outfits for portraits; products, backgrounds and image variations by arrangement'],
      ['Your images', 'Carefully selected and edited in your private online gallery']
    ],
    detailsTitle: 'Portraits with personality. Products with a clear visual style.',
    detailsLead: 'We prepare your session around the subject, with a clear plan for the images you need.',
    cardTitle: 'Your subject takes centre stage',
    items: [
      'Natural portraits with calm guidance, comfortable poses and a personal visual style.',
      'Product photographs to present your offering, for example on your website or social media.',
      'We discuss the number of products, angles, backgrounds and styling before booking.',
      'Your selected images are carefully and professionally edited.'
    ],
    flowTitle: 'Easy preparation',
    steps: [
      'Tell me your preferred date, whether you need portraits or product photographs, and how you plan to use the images.',
      'Together we agree on clothing or products, desired views, backgrounds and a suitable package.',
      'During the session we create the agreed visual style. You then choose your images for editing.'
    ],
    faqTitle: 'Portrait & product photography FAQs',
    faqLead: 'What to know about preparation, image selection and styling for people and products.',
    faqs: [
      ['Do I need experience in front of the camera?', 'No. During a portrait session I calmly explain what works and guide you towards natural posture and expression.'],
      ['How do we prepare for the session?', 'Tell me whether you need portraits or product photographs, how you will use them and the impression you want to create. We then agree on clothing or products, backgrounds, angles and image style.'],
      ['How long is the session and can I book extra time?', 'Packages include 20 or 30 minutes. By arrangement, you can add 30 minutes for €40 or 60 minutes for €70. This only extends the session time; the number of images included in the package stays the same.'],
      ['How many edited images are included?', 'Depending on the package, you receive 3, 5 or 8 professionally edited images. One extra image costs €15, 5 extra images cost €60 and 10 extra images cost €100.'],
      ['How many outfits or image variations are possible?', 'For portraits, Bronze and Silver include one outfit and one image look; Gold allows up to two outfits and different image variations. For product photographs, we agree on styling, backgrounds and views to suit the available session time.'],
      ['What should I bring?', 'For portraits, bring suitable clothes and small accessories if needed. Products should be clean and complete; we discuss packaging or props beforehand. Photos of your choices help with preparation.'],
      ['How many products can be photographed?', 'This depends on their size, materials, setup and the views you want. Before booking, send me the number of products and, if possible, photos of them. We agree on what is possible in the chosen time. The package image count is not a fixed product count.'],
      ['What information do you need for product photographs?', 'Photos and dimensions of the products, desired views and backgrounds, and their intended use are helpful, for example a website, online shop or social media. We discuss format requirements and special requests before booking; commercial use and the scope of usage rights must be agreed in writing beforehand.'],
      ['Can I send examples or a preferred image mood?', 'Absolutely. Examples help me understand the atmosphere and styling you like. Together we use them as a starting point for a suitable series for you or your products.'],
      ['What if I feel unsure during my portrait session?', 'We start calmly, try small changes and see what feels comfortable. You do not need to act a part – I aim for personal portraits in which you recognise yourself.']
    ],
    ctaTitle: 'Enquire about portrait & product photography in Graz',
    ctaText: 'Packages start at <strong data-promo-price>€99</strong> for a 20-minute session and 3 edited images. Portrait sessions include one outfit and one image look; we agree on the scope of product photographs together beforehand.',
    cta: 'Enquire about portraits or products'
  },
  bs: {
    name: 'Fotografisanje portreta i proizvoda',
    title: 'Fotografisanje portreta i proizvoda u Grazu | LiZa Memories Photography',
    description: 'Prirodni portreti i pažljivo oblikovane fotografije proizvoda u Grazu. Stil, pozadine i namjenu fotografija dogovaramo zajedno. Paketi od 99 €.',
    heroTitle: 'Fotografisanje portreta i proizvoda u Grazu – lično i u tvom stilu.',
    lead: 'Želiš prirodne portrete ili fotografije svojih proizvoda? Zajedno dogovaramo stil, pozadinu i namjenu fotografija. Pri portretnom fotografisanju pružam mirno vođenje, a kod proizvoda pažnju posvećujemo obliku, detaljima i odgovarajućoj prezentaciji. Tako nastaju fotografije koje odgovaraju tebi ili tvojoj ponudi.',
    points: [
      ['Trajanje', '20 ili 30 minuta, zavisno od paketa; produženje po dogovoru'],
      ['Stil fotografija', 'Odjeća za portrete; proizvodi, pozadine i varijante po dogovoru'],
      ['Tvoje fotografije', 'Pažljivo odabrane i obrađene u tvojoj privatnoj online galeriji']
    ],
    detailsTitle: 'Portreti s ličnošću. Proizvodi s jasnim vizuelnim stilom.',
    detailsLead: 'Fotografisanje pripremamo prema motivu, uz jasan plan za fotografije koje su ti potrebne.',
    cardTitle: 'Tvoj motiv u centru pažnje',
    items: [
      'Prirodni portreti uz mirno vođenje, ugodne poze i lični stil fotografija.',
      'Fotografije proizvoda za predstavljanje tvoje ponude, naprimjer na web-stranici ili društvenim mrežama.',
      'Broj proizvoda, uglove, pozadine i stil dogovaramo prije rezervacije.',
      'Tvoje odabrane fotografije se pažljivo i profesionalno obrađuju.'
    ],
    flowTitle: 'Jednostavna priprema',
    steps: [
      'Napiši željeni datum, da li želiš portrete ili fotografije proizvoda i kako planiraš koristiti fotografije.',
      'Zajedno dogovaramo odjeću ili proizvode, željene prikaze, pozadine i odgovarajući paket.',
      'Tokom fotografisanja ostvarujemo dogovoreni stil. Nakon toga biraš fotografije za obradu.'
    ],
    faqTitle: 'Česta pitanja o fotografisanju portreta i proizvoda',
    faqLead: 'Priprema, odabir fotografija i odgovarajući stil za ljude i proizvode.',
    faqs: [
      ['Treba li mi iskustvo pred kamerom?', 'Ne. Tokom portretnog fotografisanja mirno objašnjavam šta dobro funkcioniše i vodim te prema prirodnom držanju i izrazu lica.'],
      ['Kako pripremamo fotografisanje?', 'Reci mi da li želiš portrete ili fotografije proizvoda, za šta ćeš ih koristiti i kakav utisak želiš postići. Zatim dogovaramo odjeću ili proizvode, pozadine, uglove i stil fotografija.'],
      ['Koliko traje fotografisanje i mogu li rezervisati dodatno vrijeme?', 'Paketi uključuju 20 ili 30 minuta. Po dogovoru možeš dodati 30 minuta za 40 € ili 60 minuta za 70 €. Produžava se samo vrijeme fotografisanja; broj fotografija uključenih u paket ostaje isti.'],
      ['Koliko obrađenih fotografija je uključeno?', 'Zavisno od paketa dobijaš 3, 5 ili 8 profesionalno obrađenih fotografija. Jedna dodatna fotografija košta 15 €, 5 dodatnih fotografija 60 €, a 10 dodatnih fotografija 100 €.'],
      ['Koliko outfita ili varijanti fotografija je moguće?', 'Za portrete bronzani i srebrni paket uključuju jedan outfit i jedan izgled fotografija; zlatni omogućava do dva outfita i različite varijante. Za proizvode unaprijed dogovaramo stil, pozadine i prikaze prema raspoloživom vremenu.'],
      ['Šta trebam ponijeti?', 'Za portrete ponesi odgovarajuću odjeću i po potrebi manje dodatke. Proizvodi trebaju biti čisti i potpuni; ambalažu ili rekvizite dogovaramo unaprijed. Fotografije tvojih opcija olakšavaju pripremu.'],
      ['Koliko proizvoda se može fotografisati?', 'To zavisi od veličine, materijala, postavke i željenih prikaza. Prije rezervacije pošalji broj proizvoda i, ako je moguće, njihove fotografije. Zajedno dogovaramo šta je moguće u odabranom vremenu. Broj fotografija u paketu nije fiksni broj proizvoda.'],
      ['Koje informacije trebaju za fotografije proizvoda?', 'Korisne su fotografije i dimenzije proizvoda, željeni prikazi i pozadine te namjena, naprimjer web-stranica, online prodavnica ili društvene mreže. Formate i posebne želje dogovaramo prije rezervacije; poslovnu upotrebu i obim prava korištenja unaprijed dogovaramo pisanim putem.'],
      ['Mogu li poslati primjere ili željenu atmosferu fotografija?', 'Naravno. Primjeri mi pomažu da razumijem atmosferu i stil koji ti se sviđaju. Zajedno ih koristimo kao polazište za seriju koja odgovara tebi ili tvojim proizvodima.'],
      ['Šta ako se osjećam nesigurno tokom portretnog fotografisanja?', 'Počinjemo mirno, isprobavamo male promjene i gledamo šta ti odgovara. Ne moraš glumiti – cilj su lični portreti na kojima prepoznaješ sebe.']
    ],
    ctaTitle: 'Pošalji upit za fotografisanje portreta i proizvoda u Grazu',
    ctaText: 'Paketi počinju od <strong data-promo-price>99 €</strong> za 20 minuta fotografisanja i 3 obrađene fotografije. Za portrete su predviđeni jedan outfit i jedan izgled fotografija; obim fotografisanja proizvoda dogovaramo unaprijed.',
    cta: 'Upit za portrete ili proizvode'
  }
};

function applyPortraitContent(document, lang) {
  const text = portraitCopy[lang];
  const setText = (selector, value) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value;
  };
  document.title = text.title;
  setMeta(document, 'meta[name="description"]', text.description);
  setMeta(document, 'meta[property="og:title"]', text.title);
  setMeta(document, 'meta[property="og:description"]', text.description);
  setText('.breadcrumbs [aria-current="page"]', `${text.name} ${lang === 'de' ? 'in Graz' : lang === 'en' ? 'in Graz' : 'u Grazu'}`);
  setText('.hero .eyebrow', text.name);
  setText('.hero h1', text.heroTitle);
  setText('.hero .lead', text.lead);
  document.querySelectorAll('.hero-points > div').forEach((node, index) => {
    const point = text.points[index];
    if (point) node.innerHTML = `<strong>${escapeHtml(point[0])}</strong><span>${escapeHtml(point[1])}</span>`;
  });
  setText('#shooting-details .section-head h2', text.detailsTitle);
  setText('#shooting-details .section-head p', text.detailsLead);
  const cards = document.querySelectorAll('#shooting-details .card');
  if (cards[0]) {
    cards[0].querySelector('h3').textContent = text.cardTitle;
    cards[0].querySelector('.list').innerHTML = text.items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }
  if (cards[1]) {
    cards[1].querySelector('h3').textContent = text.flowTitle;
    cards[1].querySelector('.timeline').innerHTML = text.steps.map((step, i) => `<div class="step"><span class="num">${i + 1}</span><div>${escapeHtml(step)}</div></div>`).join('');
  }
  setText('#faq h2', text.faqTitle);
  setText('#faq .hd p', text.faqLead);
  const faqList = document.querySelector('#faq .faq-list');
  if (faqList) faqList.innerHTML = text.faqs.map(([question, answer], i) => `<article class="faq-item"><button class="faq-question" type="button" aria-expanded="false" aria-controls="portrait-faq-answer-${i + 1}"><span>${escapeHtml(question)}</span><span class="faq-icon" aria-hidden="true">+</span></button><div class="faq-answer" id="portrait-faq-answer-${i + 1}"><p>${escapeHtml(answer)}</p></div></article>`).join('');
  setText('.cta-band h2', text.ctaTitle);
  const ctaText = document.querySelector('.cta-band p');
  if (ctaText) ctaText.innerHTML = text.ctaText;
  document.querySelectorAll('.hero .hero-actions > a.primary, .cta-band .hero-actions > a.primary').forEach(link => { link.textContent = text.cta; });
  document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    const schema = JSON.parse(script.textContent);
    if (schema['@type'] === 'Service') {
      schema.name = `${text.name} ${lang === 'bs' ? 'u Grazu' : 'in Graz'}`;
      schema.serviceType = text.name;
      schema.description = text.description;
    } else if (schema['@type'] === 'FAQPage') {
      schema.mainEntity = text.faqs.map(([question, answer]) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } }));
    } else if (schema['@type'] === 'BreadcrumbList') {
      const current = schema.itemListElement.at(-1);
      if (current) current.name = `${text.name} ${lang === 'bs' ? 'u Grazu' : 'in Graz'}`;
    }
    script.textContent = JSON.stringify(schema);
  });
}

async function createPortraitTemplates() {
  await Promise.all(LANGUAGES.map(async (lang) => {
    const currentFile = localizedFile('portraitfotografie-graz.html', lang);
    const template = await fs.readFile(path.join(ROOT, currentFile), 'utf8');
    const dom = new JSDOM(template);
    const { document } = dom.window;

    document.body.className = 'portrait-page';
    applyPortraitContent(document, lang);
    // Start the portfolio with existing, already-public portraits. Preserve any
    // gallery added later so new portrait or product work can be included here.
    if (!document.querySelector('#gallery-showcase')) {
      const familyHtml = await fs.readFile(path.join(ROOT, localizedFile('familienfotografie-graz.html', lang)), 'utf8');
      const familyDom = new JSDOM(familyHtml);
      const gallery = document.createElement('section');
      gallery.id = 'gallery-showcase';
      gallery.className = 'gallery-showcase';
      const labels = {
        de: ['Porträt- & Produktgalerie', 'Einblicke in meine Porträtfotografie. Für eure Produktaufnahmen stimmen wir Bildstil, Hintergrund und Perspektiven persönlich ab.'],
        en: ['Portrait & product gallery', 'A glimpse of my portrait photography. For your product images, we discuss style, backgrounds and perspectives together.'],
        bs: ['Galerija portreta i proizvoda', 'Uvid u moje portretne fotografije. Za fotografije vaših proizvoda zajedno dogovaramo stil, pozadine i perspektive.']
      }[lang];
      gallery.innerHTML = `<div class="container section-head"><h2 data-gallery-title>${escapeHtml(labels[0])}</h2><p data-gallery-sub>${escapeHtml(labels[1])}</p></div><div class="container gallery-grid"></div>`;
      for (const src of ['galerie-familie-dsc02524.webp', 'galerie-familie-dsc02410-2.webp', 'galerie-familie-dsc02504.webp']) {
        const figure = familyDom.window.document.querySelector(`#gallery-showcase img[src="${src}"]`)?.closest('figure');
        if (!figure) throw new Error(`Missing public portrait for gallery: ${src}`);
        gallery.querySelector('.gallery-grid').append(document.importNode(figure, true));
      }
      document.querySelector('#faq').before(gallery);
      familyDom.window.close();
    }
    document.querySelectorAll('.lang-option').forEach((link) => {
      link.setAttribute('href', localizedFile('portraitfotografie-graz.html', link.dataset.lang || 'de'));
    });

    const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`
      .replace(/^[ \t]+$/gm, '');
    await fs.writeFile(path.join(ROOT, currentFile), html, 'utf8');
    dom.window.close();
  }));
}

async function createComboTemplates() {
  await Promise.all(LANGUAGES.map(async (lang) => {
    const currentFile = localizedFile('babybauch-und-neugeborenen-shooting-graz.html', lang);
    const template = await fs.readFile(path.join(ROOT, currentFile), 'utf8');
    const dom = new JSDOM(template);
    const { document } = dom.window;

    document.querySelectorAll('.lang-option').forEach((link) => {
      link.setAttribute('href', localizedFile('babybauch-und-neugeborenen-shooting-graz.html', link.dataset.lang || 'de'));
    });

    const html = `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`
      .replace(/^[ \t]+$/gm, '');
    await fs.writeFile(path.join(ROOT, currentFile), html, 'utf8');
    dom.window.close();
  }));
}

async function createPricingPage(lang) {
  const templateFile = localizedFile('familienfotografie-graz.html', lang);
  const template = await fs.readFile(path.join(ROOT, templateFile), 'utf8');
  const dom = new JSDOM(template);
  const { document } = dom.window;
  const strings = copy[lang];
  const currentFile = pricingFile(lang);
  const pageUrl = new URL(currentFile, SITE_ORIGIN).toString();

  document.documentElement.lang = lang;
  document.documentElement.dataset.staticLang = lang;
  document.body.className = 'pricing-page';
  document.title = strings.pageTitle;
  setMeta(document, 'meta[name="description"]', strings.metaDescription);
  setMeta(document, 'meta[property="og:title"]', strings.pageTitle);
  setMeta(document, 'meta[property="og:description"]', strings.metaDescription);
  setMeta(document, 'meta[property="og:url"]', pageUrl);

  document.querySelectorAll('link[rel="canonical"], link[rel="alternate"]').forEach((node) => node.remove());
  document.head.insertAdjacentHTML('beforeend', `<link rel="canonical" href="${pageUrl}">
    <link rel="alternate" hreflang="de" href="${new URL('preise.html', SITE_ORIGIN)}">
    <link rel="alternate" hreflang="en" href="${new URL('preise-en.html', SITE_ORIGIN)}">
    <link rel="alternate" hreflang="bs" href="${new URL('preise-bs.html', SITE_ORIGIN)}">
    <link rel="alternate" hreflang="x-default" href="${new URL('preise.html', SITE_ORIGIN)}">`);

  if (!document.querySelector('link[href^="pricing-page.css"]')) {
    document.head.insertAdjacentHTML('beforeend', '<link rel="stylesheet" href="pricing-page.css?v=20260911-benefits">');
  }
  document.querySelector('link[href^="pricing-page.css"]').setAttribute('href', 'pricing-page.css?v=20260911-benefits');
  document.querySelector('link[rel="preload"][as="image"]')?.remove();

  document.querySelectorAll('script[src*="service-page.js"], script[src*="home-promo.js"]').forEach((script) => script.remove());
  document.head.insertAdjacentHTML('beforeend', '<script src="scripts/home-promo.js?v=20260729-1" defer></script><script src="pricing-page.js?v=20260729-1" defer></script>');

  document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => script.remove());
  const catalog = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: strings.title,
    url: pageUrl,
    itemListElement: categories.map((category) => ({
      '@type': 'OfferCatalog',
      name: category.title[lang],
      itemListElement: category.packages.map((packageInfo) => ({
        '@type': 'Offer',
        name: `${strings.tiers[packageInfo.tier]} - ${packageInfo.name[lang]}`,
        price: packageInfo.price,
        priceCurrency: 'EUR',
        url: `${pageUrl}#${category.id}`
      }))
    }))
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: strings.breadcrumbHome, item: new URL(localizedFile('index.html', lang), SITE_ORIGIN).toString() },
      { '@type': 'ListItem', position: 2, name: strings.breadcrumbCurrent, item: pageUrl }
    ]
  };
  document.head.insertAdjacentHTML('beforeend', `<script type="application/ld+json" data-schema-key="primary">${JSON.stringify(catalog)}</script><script type="application/ld+json" data-schema-key="breadcrumbs">${JSON.stringify(breadcrumbs)}</script>`);

  ensureServiceNavigation(document, lang);

  const primaryLinks = Array.from(document.querySelectorAll('.nav-links > a'))
    .filter((link) => !link.matches('.service-page-link, .portfolio-page-link, .price-page-link, .faq-page-link, .nav-icon-link'));
  document.querySelectorAll('.nav-links > a, .nav-links > .nav-dropdown > a').forEach((link) => link.classList.remove('active'));
  if (primaryLinks[0]) primaryLinks[0].setAttribute('href', localizedFile('index.html', lang));
  if (primaryLinks[1]) primaryLinks[1].setAttribute('href', localizedFile('ueber-mich.html', lang));
  if (primaryLinks[2]) primaryLinks[2].setAttribute('href', `${localizedFile('index.html', lang)}#direct-contact-card`);
  document.querySelector('.services-dropdown > a')?.setAttribute('href', `${localizedFile('index.html', lang)}#services`);
  document.querySelector('.portfolio-dropdown > a')?.setAttribute('href', `${localizedFile('index.html', lang)}#portfolio`);
  const pricingLink = document.querySelector('.price-dropdown > a');
  pricingLink?.setAttribute('href', currentFile);
  pricingLink?.classList.add('active');
  document.querySelector('.faq-dropdown > a')?.setAttribute('href', `${localizedFile('index.html', lang)}#faq`);

  document.querySelectorAll('.portfolio-dropdown .nav-dropdown-menu a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const [base, hash = 'gallery-showcase'] = href.split('#');
    link.setAttribute('href', `${localizedFile(base || 'index.html', lang)}#${hash}`);
  });

  document.querySelectorAll('[data-header-cta], [data-footer-cta]').forEach((link) => {
    link.setAttribute('href', `${localizedFile('index.html', lang)}#contact-form-card`);
  });
  const footerContact = document.querySelector('.footer-secondary-links a');
  footerContact?.setAttribute('href', `${localizedFile('index.html', lang)}#direct-contact-card`);

  const breadcrumbsNode = document.querySelector('.breadcrumbs');
  if (breadcrumbsNode) {
    breadcrumbsNode.innerHTML = `<div class="container"><ol>
      <li><a href="${localizedFile('index.html', lang)}">${escapeHtml(strings.breadcrumbHome)}</a></li>
      <li aria-current="page">${escapeHtml(strings.breadcrumbCurrent)}</li>
    </ol></div>`;
  }

  document.querySelector('main')?.replaceWith(JSDOM.fragment(renderPricingMain(lang)));

  document.querySelectorAll('.lang-option').forEach((link) => {
    const optionLang = link.dataset.lang || 'de';
    link.setAttribute('href', pricingFile(optionLang));
    link.classList.toggle('active', optionLang === lang);
  });
  const currentLanguage = document.getElementById('langCurrent');
  if (currentLanguage) {
    currentLanguage.textContent = lang.toUpperCase();
  }

  const accessibilityStyles = document.querySelector('link[href*="accessibility-fixes.css"]');
  if (accessibilityStyles) document.head.append(accessibilityStyles);

  const output = `<!DOCTYPE html>\n${document.documentElement.outerHTML}\n`
    .replace(/^[ \t]+$/gm, '');
  await fs.writeFile(path.join(ROOT, currentFile), output, 'utf8');
  dom.window.close();
}

await createHomeTemplates();
await createPortraitTemplates();
await createComboTemplates();
for (const lang of LANGUAGES) {
  await createPricingPage(lang);
}
