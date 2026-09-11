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
    metaDescription: 'Alle Pakete und Preise für Porträt-, Babybauch-, Neugeborenen-, Familien- und Hochzeitsfotografie in Graz transparent im Überblick.',
    navServices: {
      portrait: 'Porträt',
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
      { title: 'Individuelle Wünsche', text: 'Weitere Bilder, längere Begleitungen und individuell zusammengestellte Pakete sind nach Absprache jederzeit möglich.' },
      { title: 'Preishinweis', text: 'Alle Preise sind umsatzsteuerfrei gemäß § 6 Abs. 1 Z 27 UStG. Anfahrtskosten außerhalb von Graz werden individuell berechnet.' }
    ],
    finalTitle: 'Noch unsicher, welches Paket passt?',
    finalText: 'Schreibt mir kurz, was ihr euch wünscht. Ich helfe euch gerne dabei, das passende Paket für eure Erinnerungen auszuwählen.',
    finalButton: 'Persönlich beraten lassen'
  },
  en: {
    pageTitle: 'Packages & Pricing | LiZa Memories Photography',
    metaDescription: 'Transparent packages and pricing for portrait, maternity, newborn, family and wedding photography in Graz.',
    navServices: {
      portrait: 'Portrait',
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
      { title: 'Individual requests', text: 'Additional images, longer coverage and individually tailored packages are always possible by arrangement.' },
      { title: 'Pricing note', text: 'All prices are VAT-exempt under § 6 para. 1 no. 27 UStG. Travel costs outside Graz are calculated individually.' }
    ],
    finalTitle: 'Not sure which package suits you?',
    finalText: 'Send me a short message about what you have in mind. I will gladly help you choose the right package for your memories.',
    finalButton: 'Get personal guidance'
  },
  bs: {
    pageTitle: 'Paketi & cijene | LiZa Memories Photography',
    metaDescription: 'Pregledni paketi i cijene za portretno, trudničko, fotografisanje novorođenčadi, porodica i vjenčanja u Grazu.',
    navServices: {
      portrait: 'Portret',
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
      { title: 'Individualne želje', text: 'Dodatne fotografije, duža pratnja i individualno prilagođeni paketi uvijek su mogući po dogovoru.' },
      { title: 'Napomena o cijenama', text: 'Sve cijene su oslobođene PDV-a prema § 6 st. 1 br. 27 UStG. Putni troškovi izvan Graza obračunavaju se individualno.' }
    ],
    finalTitle: 'Niste sigurni koji paket vam odgovara?',
    finalText: 'Napišite mi ukratko šta želite. Rado ću vam pomoći da odaberete odgovarajući paket za vaše uspomene.',
    finalButton: 'Zatraži lični savjet'
  }
};

const categories = [
  {
    id: 'portrait',
    serviceKey: 'portrait',
    start: 99,
    title: { de: 'Porträtshooting', en: 'Portrait Session', bs: 'Portretno fotografisanje' },
    intro: {
      de: 'Persönliche Porträts mit ruhiger Anleitung und unterschiedlichen Bildlooks.',
      en: 'Personal portraits with calm guidance and a choice of image looks.',
      bs: 'Lični portreti uz mirno vođenje i različite izglede fotografija.'
    },
    packages: [
      {
        tier: 'bronze',
        price: 99,
        name: { de: 'Kleine Erinnerung', en: 'Small Memory', bs: 'Mala uspomena' },
        details: {
          de: ['20 Minuten', '3 bearbeitete Bilder', '1 Outfit', '1 Bildlook'],
          en: ['20 minutes', '3 edited images', '1 outfit', '1 image look'],
          bs: ['20 minuta', '3 obrađene fotografije', '1 outfit', '1 izgled fotografije']
        }
      },
      {
        tier: 'silver',
        price: 119,
        name: { de: 'Lieblingsmomente', en: 'Favorite Moments', bs: 'Omiljeni trenuci' },
        details: {
          de: ['20 Minuten', '5 bearbeitete Bilder', '1 Outfit', '1 Bildlook'],
          en: ['20 minutes', '5 edited images', '1 outfit', '1 image look'],
          bs: ['20 minuta', '5 obrađenih fotografija', '1 outfit', '1 izgled fotografije']
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
        name: { de: 'Porträt Vielfalt', en: 'Portrait Variety', bs: 'Raznolikost portreta' },
        details: {
          de: ['30 Minuten', '8 bearbeitete Bilder', 'Bis zu 2 Outfits', 'Verschiedene Bildvarianten'],
          en: ['30 minutes', '8 edited images', 'Up to 2 outfits', 'Different image variations'],
          bs: ['30 minuta', '8 obrađenih fotografija', 'Do 2 outfita', 'Različite varijante fotografija']
        },
        benefits: {
  "de": [
    "3 Bilder mehr",
    "10 Minuten mehr",
    "Bis zu 2 Outfits"
  ],
  "en": [
    "3 more images",
    "10 more minutes",
    "Up to 2 outfits"
  ],
  "bs": [
    "3 fotografije više",
    "10 minuta više",
    "Do 2 outfita"
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

async function createPortraitTemplates() {
  await Promise.all(LANGUAGES.map(async (lang) => {
    const currentFile = localizedFile('portraitfotografie-graz.html', lang);
    const template = await fs.readFile(path.join(ROOT, currentFile), 'utf8');
    const dom = new JSDOM(template);
    const { document } = dom.window;

    document.body.className = 'portrait-page';
    document.querySelector('#gallery-showcase')?.remove();
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
