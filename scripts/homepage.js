// ---------- Utilities ----------
    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    // ---------- Image & form UX ----------
    $$('img').forEach(img => {
      if(!img.hasAttribute('decoding')) img.setAttribute('decoding', 'async');
      if(img.getAttribute('src') !== 'hero-bild.webp' && !img.hasAttribute('loading')){
        img.setAttribute('loading', 'lazy');
      }
    });

    const dateInput = $('#date');
    if(dateInput){
      dateInput.min = new Date().toISOString().split('T')[0];
    }

    // ---------- Scroll reveal ----------
    const revealTargets = $$('.price.card, .testimonial, .process-card, .faq-item, .aside, .insta-grid a, .masonry .item, .story-band-lightbox');
    revealTargets.forEach(node => node.classList.add('reveal'));

    if('IntersectionObserver' in window){
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if(entry.isIntersecting){
            entry.target.classList.add('in-view');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      revealTargets.forEach(node => revealObserver.observe(node));
    }else{
      revealTargets.forEach(node => node.classList.add('in-view'));
    }

    // ---------- Year in footer ----------
    const yearNode = $('#year');
    if(yearNode){
      yearNode.textContent = new Date().getFullYear();
    }

    // ---------- Smooth scroll for internal links ----------
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        if (a.classList.contains('skip-link')) {
          e.preventDefault();
          const main = document.getElementById('main-content');
          main?.focus({preventScroll:true});
          main?.scrollIntoView({block:'start'});
          return;
        }
        const href = a.getAttribute('href');
        if(href.length > 1){
          e.preventDefault();
          document.querySelector(href)?.scrollIntoView({ behavior:'smooth', block:'start' });
          $$('nav.primary a').forEach(x => x.classList.remove('active'));
          const navLink = $$('nav.primary a').find(n => n.getAttribute('href') === href);
          if(navLink) navLink.classList.add('active');
        }
      });
    });

    // ---------- Lightbox ----------
    const lightbox = $('#lightbox');
    const lbImg = $('#lightbox img');
    const prev = $('#lightbox .prev');
    const next = $('#lightbox .next');
    const close = $('#lightbox .close');
    const galleryItems = Array.from($$('#gallery img, .story-band-lightbox img, .hero-lightbox img'));

    let lightboxOpener = null;
    const lightboxLabels = ({de:['Bildvergrößerung','Bild schließen','Vorheriges Bild','Nächstes Bild'],en:['Photo viewer','Close photo','Previous photo','Next photo'],bs:['Uvećana fotografija','Zatvori fotografiju','Prethodna fotografija','Sljedeća fotografija']})[document.documentElement.lang] || ['Photo viewer','Close photo','Previous photo','Next photo'];
    lightbox.setAttribute('aria-label', lightboxLabels[0]);
    close.setAttribute('aria-label', lightboxLabels[1]);
    prev.setAttribute('aria-label', lightboxLabels[2]);
    next.setAttribute('aria-label', lightboxLabels[3]);
    close.setAttribute('autofocus', '');
    lightbox.addEventListener('cancel', event => {event.preventDefault();closeLightbox();});
    lightbox.addEventListener('close', () => {
      lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true');
      if (lightboxOpener?.isConnected) lightboxOpener.focus({preventScroll:true});
      lightboxOpener = null;
    });
    lightbox.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...lightbox.querySelectorAll('button')].filter(button => !button.hidden && !button.disabled);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
    });

    let currentIndex = -1;

    function openLightbox(index, trigger){
      currentIndex = index;
      const src = galleryItems[index].getAttribute('src');
      const alt = galleryItems[index].getAttribute('alt') || '';
      lbImg.setAttribute('src', src);
      lbImg.setAttribute('alt', alt);
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      if (!lightbox.open) {
        lightboxOpener = trigger || document.activeElement;
        lightbox.showModal();
        close.focus({preventScroll:true});
      }
    }
    function closeLightbox(){ if(lightbox.open) lightbox.close(); }
    function prevImg(){ if(currentIndex <= 0) currentIndex = galleryItems.length; openLightbox((currentIndex-1) % galleryItems.length); }
    function nextImg(){ openLightbox((currentIndex+1) % galleryItems.length); }

    $$('#gallery .item').forEach(item => {
      const img = item.querySelector('img');
      const index = galleryItems.indexOf(img);
      if(index === -1) return;
      item.addEventListener('click', event => openLightbox(index, event.currentTarget));
      item.addEventListener('keydown', event => {
        if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); openLightbox(index); }
      });
      item.style.cursor = 'zoom-in';
    });

    $$('.story-band-lightbox').forEach(card => {
      const img = card.querySelector('img');
      const index = galleryItems.indexOf(img);
      if(index === -1) return;
      card.addEventListener('click', event => openLightbox(index, event.currentTarget));
      card.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openLightbox(index);
        }
      });
      card.style.cursor = 'zoom-in';
    });

    $$('.hero-lightbox').forEach(card => {
      const img = card.querySelector('img');
      const index = galleryItems.indexOf(img);
      if(index === -1) return;
      card.setAttribute('aria-label', `${img.getAttribute('alt') || 'Bild'} öffnen`);
      card.addEventListener('click', event => openLightbox(index, event.currentTarget));
      card.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          openLightbox(index);
        }
      });
      card.style.cursor = 'zoom-in';
    });

    galleryItems.forEach(img => {
      img.style.cursor = 'zoom-in';
    });
    close.addEventListener('click', closeLightbox);
    prev.addEventListener('click', prevImg);
    next.addEventListener('click', nextImg);
    lightbox.addEventListener('click', (e) => { if(e.target === lightbox) closeLightbox(); });
    window.addEventListener('keydown', (e) => {
      if(!lightbox.classList.contains('open')) return;
      if(e.key === 'Escape') closeLightbox();
      if(e.key === 'ArrowLeft') prevImg();
      if(e.key === 'ArrowRight') nextImg();
    });

    // ---------- Simple i18n ----------
    const i18n = {
  de: {
        faq_link_general:"Allgemeine FAQs",
    faq_link_maternity:"Babybauch-FAQ",
    faq_link_newborn:"Neugeborenen-FAQ",
    faq_link_family:"Familien-FAQ",
    faq_link_wedding:"Hochzeits-FAQ",
    faq_link_combo:"Babybauch & Neugeborenen-FAQ",
    faq_link_portrait:"Porträt-FAQ",
    nav_faq_link_general:"Allgemeine Fragen",
    nav_faq_link_maternity:"Babybauch",
    nav_faq_link_newborn:"Neugeborene",
    nav_faq_link_combo:"Babybauch + Neugeborene",
    nav_faq_link_family:"Familie",
    nav_faq_link_wedding:"Hochzeit",
    nav_faq_link_portrait:"Porträt",
    price_link_all:"Übersicht",
    price_link_maternity:"Babybauch",
    price_link_newborn:"Neugeborene",
    price_link_family:"Familie",
    price_link_wedding:"Hochzeit",
    price_link_combo:"Babybauch + Neugeborene",
    price_link_portrait:"Porträt",
    nav_home:"Home",
    nav_about:"Über mich",
    nav_services:"Leistungen",
    nav_service_0:"Porträt",
    nav_service_1:"Babybauch",
    nav_service_2:"Neugeborene",
    nav_service_3:"Familie",
    nav_service_4:"Hochzeit",
    nav_service_5:"Babybauch & Neugeborene",
    nav_portfolio:"Portfolio",
    nav_gallery_1:"Babybauchfotos Galerie",
    nav_gallery_2:"Neugeborenenfotos Galerie",
    nav_gallery_3:"Familienfotos Galerie",
    nav_gallery_4:"Hochzeitsfotos Galerie",
    nav_pricing:"Preise",
    nav_faq:"Häufige Fragen",
    nav_contact:"Kontakt",
    header_cta:"Jetzt anfragen",
    lang_label:"Sprache",
    seo_title:"Fotografin Graz – Babybauch, Neugeborenenfotografie & Familienfotografie | LiZa Memories Photography",
    seo_description:"Professionelle Fotografin in Graz für Babybauch, Neugeborenenfotografie, Familien & Hochzeiten. Emotionale und natürliche Bilder – jetzt Shooting anfragen.",
    seo_og_title:"LiZa Memories Photography",
    seo_og_description:"Babybauch, Neugeborenenfotografie & Familienfotografie in Graz – natürliche, emotionale und zeitlose Erinnerungen.",

    hero_chip:"LiZa Memories Photography",
    hero_title:"Fotografin in Graz für Babybauch, Neugeborene und Familienfotografie",
    hero_cta_1:"Shooting buchen",
    hero_cta_2:"Portfolio ansehen",
    hero_cta_3:"Shooting ansehen",
    video_eyebrow:"Hinter den Kulissen",
    video_title:"So läuft ein Shooting bei LiZa Memories ab",
    video_text:"Werft einen kleinen Blick in die ruhige, persönliche Atmosphäre während eines Shootings.",
    hero_lead:"Liebevolle Babybauch-, Neugeborenen- und Familienfotografie in Graz und Umgebung. Authentisch, emotional und zeitlos.",
    hero_proof_label_1:"Standort",
    hero_proof_value_1:"Ich fotografiere euch in meinem Studio in Graz Straßgang. Andere Locations sind nach Absprache gerne möglich.",
    hero_proof_label_2:"Antwortzeit",
    hero_proof_value_2:"Ich antworte euch innerhalb von 24 Stunden. Gemeinsam finden wir in Ruhe einen passenden Termin.",
    hero_proof_label_3:"Bildlieferung",
    hero_proof_value_3:"Ich bin bei der Bearbeitung meistens sehr flott. Wie lange es genau dauert, hängt von der Art des Shootings, der Bildanzahl und meiner aktuellen Auslastung ab.",
    hero_proof_label_4:"Begleitung",
    hero_proof_value_4:"Ich nehme mir Zeit für euch und gehe einfühlsam auf eure Wünsche ein. So entstehen natürliche, emotionale Erinnerungen.",

    about_title:"Über mich",
    about_sub:"Authentische Bilder, die Geschichten erzählen.",
    about_p1:"Hallo, ich bin Emina – Fotografin mit Herz für echte Momente und die kleinen Details, die Erinnerungen so besonders machen. Mein Fokus liegt auf liebevoller Babybauch-, Neugeborenen- und Familienfotografie, bei der nicht nur Bilder entstehen, sondern bleibende Erinnerungen.<br><br>Ich weiß aus eigener Erfahrung, wie wertvoll solche Momente sind – wie schnell sie vergehen und wie wichtig es ist, sie festzuhalten. Genau deshalb ist es mir eine Herzensangelegenheit, für jede Familie Bilder zu schaffen, die man auch Jahre später noch mit einem Lächeln anschaut.",
    about_p2:"Bei jedem Shooting gebe ich mein Bestes – ohne Kompromisse. Mit viel Geduld, Feingefühl und einem Auge für das Schöne und Echte entsteht eine entspannte Atmosphäre, in der ihr euch wohlfühlen könnt. Denn genau dann entstehen die ehrlichsten und schönsten Bilder.<br><br>Mein Stil ist natürlich, ruhig und zeitlos. Ich begleite euch unaufdringlich und halte echte Emotionen fest – so wie sie sind. Für Erinnerungen, die ein Leben lang bleiben.",
    process_title:"So läuft dein Shooting ab",
    process_sub:"Klar, entspannt und professionell vom ersten Kontakt bis zu euren fertigen Bildern.",
    process_card_1_title:"Unkompliziert anfragen",
    process_card_1_text:"Du kannst ganz einfach über das Kontaktformular, per E-Mail, Instagram oder Telefon anfragen. Ich melde mich schnell mit verfügbaren Terminen zurück – nach deiner Bestätigung ist dein Shooting fix gebucht.",
    process_card_2_title:"Entspanntes Shooting",
    process_card_2_text:"Wir schauen uns Inspirationsfotos gemeinsam an, probieren verschiedene Posen aus und finden die passende Variante für euer Foto. Wenn ihr möchtet, sind auch Outfitwechsel und kleine Pausen jederzeit möglich - alles in entspannter Atmosphäre und ohne Zeitdruck.",
    process_card_3_title:"Liebevoll bearbeitet & schnell geliefert",
    process_card_3_text:"Ich wähle die schönsten Bilder für euch aus und bearbeite sie mit viel Sorgfalt. Wie lange die Bearbeitung dauert, hängt von der Art des Shootings, der Bildanzahl und meiner aktuellen Auslastung ab. Sobald eure Galerie fertig ist, bekommt ihr natürlich sofort Bescheid.",
    signature_title:"Ausgewählte Leistungen",
    signature_sub:"Entdecke die Leistungen, die am besten zu euch passen, und finde alle wichtigen Details auf einen Blick.",
    signature_card_1_kicker:"Babybauchfotos",
    signature_card_1_title:"Liebe im Bauch",
    signature_card_1_text:"Natürliches Babybauch Shooting in Graz mit emotionalen Babybauchfotos, ruhiger Begleitung und echter Vorfreude.",
    signature_card_1_meta_1:"Mehrere Looks",
    signature_card_1_meta_2:"Partner auf Wunsch",
    signature_card_2_kicker:"Neugeborenenfotos",
    signature_card_2_title:"Willkommen, kleines Wunder",
    signature_card_2_text:"Sanfte Neugeborenenfotografie in Graz mit liebevollen Neugeborenenfotos, viel Geduld und sicherem Ablauf für euer Baby.",
    signature_card_2_meta_1:"Ohne Zeitdruck",
    signature_card_2_meta_2:"Familienbilder möglich",
    signature_card_3_kicker:"Familienfotos",
    signature_card_3_title:"Natürliche Familienmomente",
    signature_card_3_text:"Familienfotos in Graz mit natürlichem Familienshooting, echter Nähe und Bildern, die sich niemals künstlich anfühlen.",
    signature_card_3_meta_1:"Entspannte Begleitung",
    signature_card_3_meta_2:"Zeitlose Bildsprache",
    signature_card_4_kicker:"Hochzeitsfotos",
    signature_card_4_title:"Kleine Hochzeit, große Erinnerung",
    signature_card_4_text:"Edle Begleitung für standesamtliche Trauungen und kleine Feiern mit Fokus auf Emotion, Details und Stimmung.",
    signature_card_4_meta_1:"Emotion & Details",
    signature_card_4_meta_2:"Paarfotos inklusive",
    signature_link:"Mehr erfahren",
    story_band_title:"Echte Momente mit zeitloser Ästhetik",
    story_band_sub:"Nicht nur einzelne starke Bilder, sondern eine Bilderwelt, die sich hochwertig, weich und zeitlos anfühlt.",
    story_band_label_1:"Babybauchfotos",
    story_band_copy_1:"Sanfte Eleganz, Vorfreude und sichtbare Liebe.",
    story_band_label_2:"Neugeborenenfotos",
    story_band_copy_2:"Geborgenheit, kleine Details und echte Nähe.",
    story_band_label_3:"Familienfotos",
    story_band_copy_3:"Intime, echte und spontane Momente statt starrer Posen.",
    stories_title:"Shooting Einblicke",
    stories_sub:"Ruhe, Feingefühl und echte Emotionen prägen jedes Shooting.",
    stories_card_1_title:"Liebe im Bauch",
    stories_card_1_text:"Ein ruhiges Babybauch Shooting mit natürlichen Babybauchfotos, mehreren Looks und sanfter Führung ohne Hektik.",
    stories_card_1_li1:"Mehrere Looks ohne Hektik",
    stories_card_1_li2:"Partner und Geschwister auf Wunsch dabei",
    stories_card_1_li3:"Eleganter, weicher Bildstil",
    stories_card_2_title:"Willkommen, kleines Wunder",
    stories_card_2_text:"Ein entspanntes Neugeborenen-Shooting mit liebevollen Neugeborenenfotos, viel Ruhe für euer Baby und einer Galerie voller Geborgenheit.",
    stories_card_2_li1:"Idealer Zeitraum: 5 bis 14 Tage nach der Geburt",
    stories_card_2_li2:"Familienbilder inklusive möglich",
    stories_card_2_li3:"Liebevolle Details und zarte Momente",
    stories_card_3_title:"Familienzeit",
    stories_card_3_text:"Ein natürliches Familienshooting mit echter Einfühlsamkeit, viel Feingefühl für Kinder und ehrlichen Familienfotos.",
    stories_card_3_li1:"Auch mit kleinen Kindern entspannt",
    stories_card_3_li2:"Spielerische, liebevolle Begleitung",
    stories_card_3_li3:"Bilder mit echter Nähe und Wärme",
    stories_cta:"Galerie ansehen",

    portfolio_title:"Portfolio",
    portfolio_sub:"Eine Auswahl aus Babybauch-, Neugeborenen- und Familienfotografie.",

    portfolio_maternity:"Babybauch",
portfolio_newborn:"Neugeborene",
portfolio_family:"Familie",
portfolio_more:"Mehr Bilder anzeigen",
portfolio_less:"Weniger Bilder anzeigen",
portfolio_all:"Zur vollst\u00e4ndigen Galerie",
portfolio_open:"Bild vergr\u00f6\u00dfern",
portfolio_photo_dsc02038:"Babybauch \u2013 Liebe, die w\u00e4chst",
portfolio_photo_dsc02054:"Babybauch \u2013 Bl\u00fchende Vorfreude",
portfolio_photo_dsc01844:"Neugeborene \u2013 Ein kleines Wunder",
portfolio_photo_dsc03101:"Neugeborene \u2013 Ganz nah bei Mama",
portfolio_photo_dsc03113:"Neugeborene \u2013 In Liebe geborgen",
portfolio_photo_dsc03332:"Neugeborene \u2013 Kleine H\u00e4nde, gro\u00dfe Liebe",
portfolio_photo_dsc03353:"Neugeborene \u2013 Kuschelige Tr\u00e4ume",
portfolio_photo_dsc02461:"Familie \u2013 In Papas Armen",
portfolio_photo_dsc02484:"Familie \u2013 Seifenblasen und Kinderlachen",
portfolio_photo_dsc02524:"Familie \u2013 Kleine Augenblicke",
portfolio_photo_dsc02690:"Familie \u2013 Zusammen gl\u00fccklich",
portfolio_photo_dsc03265:"Familie \u2013 Ein Kuss voller Liebe",
portfolio_photo_dsc01230:"Babybauch \u2013 Wir warten auf dich",
portfolio_photo_dsc03285_2:"Familie \u2013 Unser kleines Gl\u00fcck",
portfolio_photo_dsc03416_2:"Familie \u2013 Gemeinsam angekommen",
google_review_text:"Wie war das Shooting? Wie haben sich die Familien bei mir gef\u00fchlt? Lest ihre pers\u00f6nlichen Erfahrungen direkt auf meinem Google-Profil.",
google_review_link:"Bewertungen auf Google lesen",
google_review_label:"Eure Erfahrungen",
google_review_title:"Eure Worte bedeuten mir wirklich sehr viel.",
google_review_note:"Danke von Herzen an alle, die sich Zeit für eine Bewertung nehmen. ♥",
gallery_1:"Familie – Gemeinsamkeit",
gallery_2:"Babybauch – Innigkeit",
gallery_3:"Familie – Mutter-Tochter-Liebe",
gallery_4:"Babybauch – Kleine Details",
gallery_5:"Familie – Geschwisterliebe",
gallery_6:"Babybauch – Sanfte Blüten",
gallery_7:"Babybauch – Silhouette",
gallery_8:"Babybauch – Vorfreude",
gallery_9:"Neugeborene – Mutterliebe",
gallery_10:"Neugeborene \u2013 Mamas N\u00e4he",
gallery_11:"Babybauch – Elegant",
gallery_12:"Familie – Zarte Momente",
gallery_13:"Babybauch – Erwartung",
gallery_14:"Babybauch – Sanfte Eleganz",
gallery_15:"Babybauch – Papa liebt mit",
gallery_16:"Neugeborene \u2013 Rosige Tr\u00e4ume",
gallery_17:"Neugeborene – Geborgenheit",
gallery_18:"Familie \u2013 Vaterliebe",
gallery_19:"Neugeborene – Ganz behütet",
gallery_20:"Neugeborene – Süße Träume",
gallery_21:"Neugeborene – Innige Nähe",

    testimonials_title:"Eure Erfahrungen auf Google",
testimonials_sub:"Echte Bewertungen. Direkt von den Menschen, die vor meiner Kamera standen.",

















    pricing_title:"Pakete & Preise",
    pricing_sub:"Transparente Angebote – flexibel anpassbar an eure Bedürfnisse.",
    price1_chip:"Porträt",
    price1_title:"Mini Session",
    price1_li1:"30 Minuten, 1 Location",
    price1_li2:"10 bearbeitete Fotos (Web & Print)",
    price1_li3:"Online-Galerie & Download",
    price2_chip:"Wedding",
    price2_title:"Standesamt",
    price2_li1:"2 Stunden Begleitung",
    price2_li2:"Auswahl & Retusche von 120+ Bildern",
    price2_li3:"Private Online-Galerie",
    price3_title:"Team Porträts",
    price3_li1:"On-Location Setup",
    price3_li2:"Individuelle Retusche",
    price3_li3:"Lizenz für Web & Print",
    price_cta:"Pakete ansehen",
    price_more_cta:"Mehr zur Leistung",
    price_combo_more:"Mehr zu Babybauch & Neugeborenen-Shooting",
    pricing_note:"Alle Preise inkl. MwSt. – Reisekosten außerhalb Graz auf Anfrage.",
    price_badge_top:"Am beliebtesten",
price_badge_save:"Bestes Angebot",
    pricing_title_new:"Pakete & Preise",

pricing_fast_new:"Hier findet ihr die günstigsten Einstiegspakete. Über „Pakete ansehen“ kommt ihr direkt zur vollständigen Bronze-, Silber- und Goldübersicht.",

price1_chip_new:"Porträtfotos",
price1_title_new:"Porträt Shooting",
price1_li1_new:"20 bis 30 Minuten je nach Paket",
price1_li2_new:"Ab 3 bearbeitete Bilder",
price1_li4_new:"Ein bis zwei Outfits und verschiedene Bildlooks möglich",

price2_chip_new:"Babybauchfotos",
price2_title_new:"Babybauch Shooting",
price2_li1_new:"30 bis 60 Minuten je nach Paket",
price2_li2_new:"Ab 5 bearbeitete Bilder",
price2_li3_new:"Partner und Geschwister je nach Paket inklusive",
price2_li4_new:"Bis zu 3 Outfits oder Bildsets möglich",

price3_chip_new:"Familienfotos",
price3_title_new:"Familien Shooting",
price3_li1_new:"30 bis 60 Minuten je nach Paket",
price3_li2_new:"Ab 5 bearbeitete Bilder",
price3_li3_new:"Gemeinsame Familienmomente und verschiedene Konstellationen",
price3_li4_new:"Familien-, Geschwister- und Einzelaufnahmen je nach Paket",

price4_chip_new:"Neugeborenenfotos",
price4_title_new:"Neugeborenen Shooting",
price4_li1_new:"75 Minuten bis 2 Stunden je nach Paket",
price4_li2_new:"Ab 6 bearbeitete Bilder",
price4_li3_new:"Ein bis drei vorbereitete Bildsets",
price4_li4_new:"Eltern, Familie und Geschwister je nach Paket inklusive",

price5_chip_new:"Babybauch- & Babyfotos",
price5_title_new:"Babybauch & Neugeborenen Shooting",
price5_li1_new:"2 aufeinander abgestimmte Shootings",
price5_li2_new:"Ab 10 bearbeitete Bilder insgesamt",
price5_li3_new:"Preisvorteil gegenüber zwei Einzelbuchungen",
price5_li4_new:"Bis zu 3 Bildsets je Shooting möglich",

price6_chip_new:"Hochzeits- & Eventfotos",
price6_title_new:"Hochzeiten & Feiern",
price6_li1_new:"1 bis 3 Stunden Begleitung je nach Paket",
price6_li2_new:"Ab ca. 20 professionell bearbeitete Bilder",
price6_li3_new:"Für Standesamt, Taufen und kleine Feiern",
price6_li4_new:"Zeremonie, Paarfotos und Gruppenbilder je nach Paket",
price6_li5_new:"Private Online-Galerie inklusive",

pricing_note_new:"Alle Preise sind umsatzsteuerfrei gemäß § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung). Reisekosten außerhalb von Graz auf Anfrage. Weitere Bilder sowie individuelle Pakete sind jederzeit möglich.",
pricing_extra_images_new:"Zusätzliche bearbeitete Bilder: 15 € pro Bild. <br>Vorteilspakete: 5 Bilder für 60 € • 10 Bilder für 100 €.",

opt_portrait_new:"Porträt",
    opt_choose:"Bitte auswählen",
opt_maternity:"Babybauch Shooting",
opt_newborn:"Neugeborenenfotos",
opt_combo:"Babybauch + Neugeborenen-Kombi",
opt_civil:"Standesamt / kleine Feier",

    faq_title:"Häufige Fragen",
faq_sub:"Hier findet ihr ehrliche Antworten auf die wichtigsten allgemeinen Fragen rund um eure Anfrage, Buchung und fertigen Bilder.",

faq_q1:"Wie früh sollten wir unseren Termin buchen?",
faq_a1:"Auch wenn euer Wunschtermin schon bald ist, fragt bitte trotzdem gerne an. Kurzfristige Termine vergebe ich nach Möglichkeit, wenn etwas frei ist, und wir schauen gemeinsam, was für beide Seiten gut passt. Ideal ist eine Anfrage etwa zwei bis drei Monate im Voraus, besonders für beliebte Termine - aber eine spontane Anfrage lohnt sich immer.",

faq_q2:"Wie läuft eine Anfrage und Buchung bei dir ab?",
faq_a2:"Ihr könnt mich anrufen, mir über WhatsApp oder per E-Mail schreiben, aber auch direkt über das Formular auf meiner Webseite anfragen. Nennt mir bitte die gewünschte Shooting-Art, euren ungefähren Wunschtermin und alles, was euch wichtig ist. Ich melde mich persönlich, beantworte eure Fragen und wir finden gemeinsam den passenden Termin und das passende Paket. Wenn alles besprochen ist, bekommt ihr eine Bestätigungs-E-Mail mit den AGB und allen Angaben zum Termin. Sobald ihr diese E-Mail bestätigt, gilt der Termin als verbindlich gebucht.",

faq_q3:"Wo findet das Shooting statt?",
faq_a3:"Grundsätzlich finden alle Shootings in meinem Studio in der Mela-Spira-Str. 32b in Graz-Straßgang statt, außer wir vereinbaren ein Outdoor-Shooting oder eine andere Wunschlocation. Direkt rechts neben der Tiefgarageneinfahrt seht ihr mein Firmenschild. Folgt dem Weg ungefähr 40 Meter; am Eingang ist noch einmal ein Schild angebracht. Vor dem Gebäude gibt es genügend kostenlose Parkplätze. Sollte ausnahmsweise alles voll sein, schreibt mir kurz oder ruft an, dann öffne ich euch die Tiefgarage.",

faq_q4:"Was passiert, wenn wir krank werden oder den Termin verschieben müssen?",
faq_a4:"Bitte sagt mir so früh wie möglich Bescheid, wenn ihr krank werdet oder etwas dazwischenkommt. Gerade mit Kindern ist das ganz verständlich. Bisher haben wir immer eine gute Lösung gefunden, und ein Ausfallhonorar musste ich noch nie berechnen. Wir finden gemeinsam eine Möglichkeit für einen Ersatztermin. Der Vollständigkeit halber: Laut AGB kann bei einer Absage weniger als 48 Stunden vor dem Termin ein Ausfallhonorar von 50 % anfallen; bei Nichterscheinen ohne Absage kann das volle Honorar verrechnet werden. Meldet euch also einfach bei mir, damit wir alles in Ruhe besprechen können.",

faq_q5:"Welches Paket passt am besten zu uns?",
faq_a5:"Schaut euch die Pakete auf der Preisseite gerne in Ruhe an. Ich habe bewusst verschiedene Varianten zusammengestellt, damit sowohl für wenige Lieblingsbilder als auch für eine größere Auswahl etwas Passendes dabei ist. Die jeweiligen Vorteile und Ersparnisse sind dort transparent angeführt. Wenn ihr trotzdem unsicher seid, erzählt mir einfach, welche Bilder und Konstellationen ihr euch wünscht - ich helfe euch ehrlich und ohne Druck bei der Auswahl.",

faq_q6:"Können wir zusätzliche Bilder auswählen?",
faq_a6:"Ja, sehr gerne. Je nach gebuchtem Paket wähle und bearbeite ich die darin enthaltene Anzahl eurer stärksten Bilder. Alle weiteren gelungenen Aufnahmen seht ihr in eurer Online-Galerie als niedrig aufgelöste Vorschau mit Wasserzeichen. Wenn dort noch ein Lieblingsbild dabei ist, bearbeite ich es gerne zusätzlich für euch: ein Bild kostet 15 €, fünf Bilder 60 € und zehn Bilder 100 €. Deshalb lohnt es sich, die Pakete schon vorab zu vergleichen und ungefähr zu überlegen, wie viele fertige Bilder ihr möchtet - ein größeres Paket kann für euch günstiger sein.",

faq_q7:"Wie werden die Bilder ausgewählt und geliefert?",
faq_a7:"Ich wähle die stärksten und schönsten Aufnahmen sorgfältig aus und bearbeite die im Paket enthaltenen Bilder in meinem natürlichen, zeitlosen Stil. Sobald eure Galerie fertig ist, bekommt ihr eine E-Mail. In der Online-Galerie könnt ihr alle professionell bearbeiteten Bilder hochauflösend herunterladen. Weitere gelungene Aufnahmen stehen euch dort als niedrig aufgelöste Vorschau mit Wasserzeichen zur Verfügung, falls ihr noch zusätzliche Bilder auswählen möchtet.",

faq_q8:"Bekommen wir auch unbearbeitete Bilder oder RAW-Dateien?",
faq_a8:"Unbearbeitete Dateien und RAW-Dateien gebe ich grundsätzlich nicht heraus. Die sorgfältige Auswahl und Bearbeitung gehören zu meiner fotografischen Handschrift und sorgen dafür, dass ihr ein stimmiges, hochwertiges Ergebnis bekommt.",

faq_q9:"Wann erhalten wir unsere fertigen Bilder?",
faq_a9:"Ich bin bei der Bearbeitung meistens sehr flott. Wie lange es genau dauert, hängt aber von der Art des Shootings, der Anzahl eurer Bilder und meiner aktuellen Auslastung ab. Sobald eure Galerie fertig ist, bekommt ihr natürlich sofort Bescheid.",

faq_q10:"Können wir eigene Wünsche oder Inspirationsbilder mitbringen?",
faq_a10:"Sehr gerne. Wenn für eure Idee ein bestimmter Aufbau, Hintergrund oder ein Requisit vorbereitet werden muss, schickt mir die Inspirationsbilder bitte schon vor dem Shooting. Geht es nur um eine Pose oder eine Idee, die keine Vorbereitung braucht, könnt ihr sie mir auch ganz entspannt direkt vor Ort zeigen. Ich schaue dann, was zu euch, zur gebuchten Leistung und zu meinem natürlichen Bildstil passt.",

faq_q11:"Werden unsere Fotos veröffentlicht?",
faq_a11:"Nur, wenn ihr das ausdrücklich erlaubt. Ohne eure Zustimmung veröffentliche ich keine Bilder auf meiner Website, auf Instagram oder für Werbezwecke. Eure Privatsphäre und euer Vertrauen sind mir sehr wichtig.",

faq_q12:"Wie können wir bezahlen?",
faq_a12:"Ihr könnt direkt nach dem Shooting bar bezahlen oder nach Rechnungslegung überweisen. Die Rechnung bekommt ihr per E-Mail. Die finale Bearbeitung und Auslieferung erfolgen grundsätzlich nach vollständigem Zahlungseingang.",

faq_q13:"Gibt es saisonale Aktionen oder Mini-Shootings?",
faq_a13:"Ja, zu ausgewählten Terminen gibt es besondere Aktionen oder Mini-Shootings. Aktuelle Angebote kündige ich auf meiner Website und auf Instagram an. Wenn ihr nichts verpassen möchtet, schaut dort gerne regelmäßig vorbei.",

    contact_title:"Direkt anfragen",
    contact_sub:"Schreib mir kurz, worum es geht – ich melde mich in 24h zurück.",
    form_name_label:"Dein Name",
    form_email_label:"E-Mail",
    form_phone_label:"Telefon",
    form_service_label:"Art des Shootings",
    form_date_label:"Wunschtermin",
    form_location_label:"Ort / Wunschlocation",
    form_partner_code_label:"Partner-Vorteilscode (optional)",
    form_partner_code_placeholder:"Code vom Flyer eingeben",
    form_partner_code_hint:"Der Vorteil wird nach Prüfung bei deinem Angebot berücksichtigt.",
    form_msg_label:"Nachricht",
    form_submit:"Senden",
    opt_portrait:"Porträt",
    opt_wedding:"Hochzeit",
    opt_family:"Familienfotos",
    opt_business:"Business",
    opt_other:"Sonstiges",
    aside_title:"Direkt buchen?",
    aside_text:"Gerne erstelle ich ein individuelles Angebot. Für kurzfristige Termine schreib mir am besten via WhatsApp oder Instagram.",

    aside_title_new:"Kontakt",
aside_heading_new:"Ich freue mich auf eure Nachricht",
    aside_text_new_1:"Gerne erstelle ich euch ein individuelles Angebot.",
    aside_text_new_2:"Für kurzfristige Termine erreicht ihr mich am schnellsten telefonisch.",
aside_email_label:"E-Mail",
aside_instagram_label:"Instagram",
aside_phone_label:"Telefon",
aside_location_label:"Standort",
    aside_location_value:"8054 Graz",
aside_note_1:"Shootings nach Vereinbarung in Graz und Umgebung.",
aside_note_2:"Homestory-, Outdoor- und individuelle Wunschlocations sind möglich.",
    form_name_placeholder:"Dein Name",
form_email_placeholder:"dein@email.at",
form_phone_placeholder:"+43 ...",
form_location_placeholder:"z. B. Graz, Outdoor oder bei euch zuhause",
form_msg_placeholder:"Was stellst du dir vor? Location, Anzahl Personen, Stil ...",

    insta_title:"Folge mir auf Instagram",
insta_sub:"Noch mehr Einblicke, echte Shootings und aktuelle Arbeiten findest du auf Instagram.",
insta_button:"@liza.memories.photography folgen",

    footer_copy:"© {year} LiZa Memories Photography. Alle Rechte vorbehalten.",
    footer_portfolio:"Portfolio",
    footer_contact:"Kontakt",
    footer_imprint:"Impressum",
    footer_privacy:"Datenschutz",
    footer_terms:"AGB"
  },

  en: {
        faq_link_general:"General FAQs",
    faq_link_maternity:"Maternity FAQ",
    faq_link_newborn:"Newborn FAQ",
    faq_link_family:"Family FAQ",
    faq_link_wedding:"Wedding FAQ",
    faq_link_combo:"Maternity & Newborn FAQ",
    faq_link_portrait:"Portrait FAQ",
    nav_faq_link_general:"General questions",
    nav_faq_link_maternity:"Maternity",
    nav_faq_link_newborn:"Newborn",
    nav_faq_link_combo:"Maternity + Newborn",
    nav_faq_link_family:"Family",
    nav_faq_link_wedding:"Wedding",
    nav_faq_link_portrait:"Portrait",
    price_link_all:"Overview",
    price_link_maternity:"Maternity",
    price_link_newborn:"Newborn",
    price_link_family:"Family",
    price_link_wedding:"Wedding",
    price_link_combo:"Maternity + Newborn",
    price_link_portrait:"Portrait",
    nav_home:"Home",
    nav_about:"About",
    nav_services:"Services",
    nav_service_0:"Portrait",
    nav_service_1:"Maternity",
    nav_service_2:"Newborn",
    nav_service_3:"Family",
    nav_service_4:"Wedding",
    nav_service_5:"Maternity & Newborn",
    nav_portfolio:"Portfolio",
    nav_gallery_1:"Maternity Gallery",
    nav_gallery_2:"Newborn Gallery",
    nav_gallery_3:"Family Gallery",
    nav_gallery_4:"Wedding Gallery",
    nav_pricing:"Pricing",
    nav_faq:"FAQs",
    nav_contact:"Contact",
    header_cta:"Inquire now",
    lang_label:"Language",
    seo_title:"Maternity, Newborn & Family Photography in Graz | LiZa Memories Photography",
    seo_description:"Maternity, newborn and family photography in Graz and the surrounding area. Authentic, emotional and timeless images by LiZa Memories Photography.",
    seo_og_title:"LiZa Memories Photography",
    seo_og_description:"Maternity, newborn and family photography in Graz – authentic, emotional and timeless imagery.",

    hero_chip:"LiZa Memories Photography",
    hero_title:"Maternity, Newborn & Family Photographer in Graz",
    hero_cta_1:"Book your session",
    hero_cta_2:"View portfolio",
    hero_cta_3:"Watch a session",
    video_eyebrow:"Behind the scenes",
    video_title:"See what a session at LiZa Memories is like",
    video_text:"Take a glimpse into the calm, personal atmosphere of a photography session.",
    hero_lead:"Loving maternity, newborn and family photography in Graz and the surrounding area. Authentic, emotional and timeless.",
    hero_proof_label_1:"Location",
    hero_proof_value_1:"I photograph you in my studio in Graz Straßgang. Other locations are of course possible by arrangement.",
    hero_proof_label_2:"Response time",
    hero_proof_value_2:"I reply within 24 hours. Together we’ll find a date that suits you.",
    hero_proof_label_3:"Delivery",
    hero_proof_value_3:"I am usually very quick with editing. The exact turnaround depends on the type of session, the number of images and my current workload.",
    hero_proof_label_4:"Approach",
    hero_proof_value_4:"I take time for you and gently adapt the session to your wishes. This is how natural, emotional memories unfold.",

    about_title:"About",
    about_sub:"Authentic images that tell stories.",
    about_p1:"Hi, I'm Emina – a photographer with a love for real moments and the little details that make memories feel special. My focus is on heartfelt maternity, newborn and family photography that feels natural and true to you.<br><br>From my own experience, I know how quickly these seasons of life pass and how valuable it is to hold on to them. That is why it matters so much to me to create images you will still love years from now.",
    about_p2:"In every session I take my time, guide you gently and create a relaxed atmosphere where you can simply be yourselves. That is when the most honest and beautiful images come to life.<br><br>My style is calm, natural and timeless. I photograph real emotions in a soft and unobtrusive way, so your memories keep their true feeling.",
    process_title:"How your session works",
    process_sub:"Clear, relaxed and professional from your first message to your finished images.",
    process_card_1_title:"Simple inquiry",
    process_card_1_text:"You can easily get in touch via the contact form, email, Instagram or phone. I’ll get back to you quickly with available dates – once you confirm, your session is booked.",
    process_card_2_title:"Relaxed session",
    process_card_2_text:"We look at inspiration together, try different poses and find what feels most natural for you. If you like, outfit changes and short breaks are always possible too, all in a relaxed atmosphere and without time pressure.",
    process_card_3_title:"Carefully edited & delivered fast",
    process_card_3_text:"I carefully select and edit your strongest images. The turnaround depends on the type of session, the number of images and my current workload. As soon as your gallery is ready, I will let you know straight away.",
    signature_title:"Signature Services",
    signature_sub:"Explore the services that fit you best and see all the key details at a glance.",
    signature_card_1_kicker:"Maternity photos",
    signature_card_1_title:"Growing Love",
    signature_card_1_text:"Emotional maternity photography in Graz with elegant imagery, calm guidance and real moments.",
    signature_card_1_meta_1:"Multiple looks",
    signature_card_1_meta_2:"Partner welcome",
    signature_card_2_kicker:"Newborn",
    signature_card_2_title:"Welcome, little wonder",
    signature_card_2_text:"Gentle newborn photography with time, patience and a safe, relaxed experience for your baby.",
    signature_card_2_meta_1:"No time pressure",
    signature_card_2_meta_2:"Family portraits",
    signature_card_3_kicker:"Family",
    signature_card_3_title:"Natural family moments",
    signature_card_3_text:"Family photography with genuine closeness, loving interaction and images that never feel artificial.",
    signature_card_3_meta_1:"Relaxed guidance",
    signature_card_3_meta_2:"Timeless imagery",
    signature_card_4_kicker:"Wedding photos",
    signature_card_4_title:"Small wedding, lasting memory",
    signature_card_4_text:"Elegant coverage for civil ceremonies and intimate celebrations with a focus on emotion, detail and atmosphere.",
    signature_card_4_meta_1:"Emotion & detail",
    signature_card_4_meta_2:"Couple portraits included",
    signature_link:"Learn more",
    story_band_title:"Real moments with a timeless aesthetic",
    story_band_sub:"Not just strong individual images, but a full visual world that feels refined, soft and timeless.",
    story_band_label_1:"Maternity photos",
    story_band_copy_1:"Gentle elegance, anticipation and visible love.",
    story_band_label_2:"Newborn",
    story_band_copy_2:"Comfort, tiny details and genuine closeness.",
    story_band_label_3:"Family",
    story_band_copy_3:"Intimate, genuine and spontaneous moments instead of stiff poses.",
    stories_title:"Shooting Stories",
    stories_sub:"Calm guidance, sensitivity and genuine emotion shape every shoot.",
    stories_card_1_title:"Growing Love",
    stories_card_1_text:"A calm maternity session with multiple looks, gentle guidance and images that are feminine and natural at once.",
    stories_card_1_li1:"Multiple looks without rush",
    stories_card_1_li2:"Partner and siblings welcome",
    stories_card_1_li3:"Elegant and soft visual style",
    stories_card_2_title:"Welcome, little wonder",
    stories_card_2_text:"A relaxed newborn session without time pressure, with plenty of calm for your baby and a gallery full of comfort.",
    stories_card_2_li1:"Ideal timeframe: 5 to 14 days after birth",
    stories_card_2_li2:"Family portraits possible",
    stories_card_2_li3:"Loving details and tender moments",
    stories_card_3_title:"Family time",
    stories_card_3_text:"With real empathy, great sensitivity for children and a relaxed atmosphere.",
    stories_card_3_li1:"Relaxed even with little children",
    stories_card_3_li2:"Playful and loving guidance",
    stories_card_3_li3:"Images full of warmth and closeness",
    stories_cta:"View gallery",

    portfolio_title:"Portfolio",
    portfolio_sub:"A selection of maternity, newborn, and family photography.",

    portfolio_maternity:"Maternity",
portfolio_newborn:"Newborn",
portfolio_family:"Family",
portfolio_more:"Show more photos",
portfolio_less:"Show fewer photos",
portfolio_all:"View the full gallery",
portfolio_open:"Enlarge photo",
portfolio_photo_dsc02038:"Maternity \u2013 Growing Love",
portfolio_photo_dsc02054:"Maternity \u2013 Blossoming Anticipation",
portfolio_photo_dsc01844:"Newborn \u2013 A Little Miracle",
portfolio_photo_dsc03101:"Newborn \u2013 Close to Mum",
portfolio_photo_dsc03113:"Newborn \u2013 Wrapped in Love",
portfolio_photo_dsc03332:"Newborn \u2013 Tiny Hands, Endless Love",
portfolio_photo_dsc03353:"Newborn \u2013 Cosy Dreams",
portfolio_photo_dsc02461:"Family \u2013 In Dad\u2019s Arms",
portfolio_photo_dsc02484:"Family \u2013 Bubbles and Laughter",
portfolio_photo_dsc02524:"Family \u2013 Little Moments",
portfolio_photo_dsc02690:"Family \u2013 Happy Together",
portfolio_photo_dsc03265:"Family \u2013 A Kiss Full of Love",
portfolio_photo_dsc01230:"Maternity \u2013 Waiting for You",
portfolio_photo_dsc03285_2:"Family \u2013 Our Little Joy",
portfolio_photo_dsc03416_2:"Family \u2013 Together at Last",
google_review_text:"What was the session like? How did families feel? Read their personal experiences directly on my Google profile.",
google_review_link:"Read reviews on Google",
google_review_label:"Your experiences",
google_review_title:"Your words really mean so much to me.",
google_review_note:"A heartfelt thank you to everyone who takes the time to leave a review. ♥",
gallery_1:"Family – Togetherness",
gallery_2:"Maternity – Intimacy",
gallery_3:"Family – Mother-Daughter Love",
gallery_4:"Maternity – Little Details",
gallery_5:"Family – Sibling Love",
gallery_6:"Maternity – Soft Florals",
gallery_7:"Maternity – Silhouette",
gallery_8:"Maternity – Anticipation",
gallery_9:"Newborn – Mother’s Love",
gallery_10:"Newborn \u2013 Close to Mum",
gallery_11:"Maternity – Elegant",
gallery_12:"Family – Tender Moments",
gallery_13:"Maternity – Expectation",
gallery_14:"Maternity – Gentle Elegance",
gallery_15:"Maternity – Dad’s Love",
gallery_16:"Newborn \u2013 Rosy Dreams",
gallery_17:"Newborn – Comfort",
gallery_18:"Family \u2013 Father\u2019s Love",
gallery_19:"Newborn – Safe in Loving Arms",
gallery_20:"Newborn – Sweet Dreams",
gallery_21:"Newborn – Intimate Bond",

    testimonials_title:"Your experiences on Google",
testimonials_sub:"Genuine reviews from the people who have been in front of my camera.",

















    pricing_title:"Packages & pricing",
    pricing_sub:"Transparent offers – easily tailored to your needs.",
    price1_chip:"Portrait",
    price1_title:"Mini session",
    price1_li1:"30 minutes, 1 location",
    price1_li2:"10 edited photos (web & print)",
    price1_li3:"Online gallery & download",
    price2_chip:"Wedding",
    price2_title:"Civil ceremony",
    price2_li1:"2 hours coverage",
    price2_li2:"Curation & retouch of 120+ photos",
    price2_li3:"Private online gallery",
    price3_title:"Team portraits",
    price3_li1:"On-location setup",
    price3_li2:"Individual retouch",
    price3_li3:"License for web & print",
    price_cta:"View packages",
    price_more_cta:"Explore the service",
    price_combo_more:"More about maternity & newborn",
    pricing_note:"All prices are VAT-exempt under § 6 para. 1 no. 27 UStG. Travel costs outside Graz on request.",
    price_badge_top:"Most popular",
price_badge_save:"Best value",
    pricing_title_new:"Packages & pricing",

pricing_fast_new:"Here you will find the most affordable entry package for each category. Select “View packages” for the complete Bronze, Silver and Gold overview.",

price1_chip_new:"Portrait photos",
price1_title_new:"Portrait session",
price1_li1_new:"20 to 30 minutes depending on the package",
price1_li2_new:"From 3 edited images",
price1_li4_new:"One or two outfits and different image looks available",

price2_chip_new:"Maternity photos",
price2_title_new:"Maternity session",
price2_li1_new:"30 to 60 minutes depending on the package",
price2_li2_new:"From 5 edited images",
price2_li3_new:"Partner and siblings included depending on the package",
price2_li4_new:"Up to 3 outfits or image sets available",

price3_chip_new:"Family photos",
price3_title_new:"Family session",
price3_li1_new:"30 to 60 minutes depending on the package",
price3_li2_new:"From 5 edited images",
price3_li3_new:"Shared family moments and different family combinations",
price3_li4_new:"Family, sibling and individual portraits depending on the package",

price4_chip_new:"Newborn photos",
price4_title_new:"Newborn session",
price4_li1_new:"75 minutes to 2 hours depending on the package",
price4_li2_new:"From 6 edited images",
price4_li3_new:"One to three prepared image sets",
price4_li4_new:"Parents, family and siblings included depending on the package",

price5_chip_new:"Bump & baby photos",
price5_title_new:"Maternity & newborn sessions",
price5_li1_new:"2 coordinated photography sessions",
price5_li2_new:"From 10 edited images in total",
price5_li3_new:"Package savings compared with two individual bookings",
price5_li4_new:"Up to 3 image sets per session available",

price6_chip_new:"Wedding & event photos",
price6_title_new:"Weddings & celebrations",
price6_li1_new:"1 to 3 hours of coverage depending on the package",
price6_li2_new:"From around 20 professionally edited images",
price6_li3_new:"For civil ceremonies, baptisms and small celebrations",
price6_li4_new:"Ceremony, couple and group portraits depending on the package",
price6_li5_new:"Private online gallery included",

pricing_note_new:"All prices are exempt from VAT under § 6 para. 1 no. 27 UStG (small business regulation). Travel costs outside Graz are calculated separately on request. Additional images and custom packages are always possible.",
pricing_extra_images_new:"Additional edited images: €15 per image. <br>Bundle options: 5 images for €60 • 10 images for €100.",

opt_portrait_new:"Portrait",
    opt_choose:"Please select",
opt_maternity:"Maternity",
opt_newborn:"Newborn",
opt_combo:"Maternity + Newborn Bundle",
opt_civil:"Civil Ceremony / Small Event",

    faq_title:"Frequently asked questions",
faq_sub:"Here you will find honest answers to the most important general questions about inquiries, bookings and your finished images.",

faq_q1:"How early should we book our session?",
faq_a1:"Even if your preferred date is coming up soon, please still get in touch. I am happy to offer short-notice appointments whenever I have availability, and we will look for an option that works well for both sides. Ideally, inquire around two to three months in advance, especially for popular dates - but a spontaneous inquiry is always worthwhile.",

faq_q2:"How does an inquiry and booking work?",
faq_a2:"You can call me or write to me via WhatsApp or email. You can also send an inquiry directly through the form on my website. Please tell me which type of session you would like, your approximate preferred date and anything that matters to you. I will reply personally, answer your questions and help you choose the right date and package. Once we have agreed on everything, you will receive a confirmation email with the terms and conditions and all appointment details. The booking becomes binding as soon as you confirm this email.",

faq_q3:"Where does the session take place?",
faq_a3:"As a rule, all sessions take place in my studio at Mela-Spira-Str. 32b in Graz-Straßgang, unless we arrange an outdoor session or another location of your choice. You will see my business sign directly to the right of the underground garage entrance. Follow the path for around 40 metres; there is another sign at the studio entrance. Plenty of free parking is available in front of the building. In the unlikely event that every space is occupied, send me a message or call me and I will open the underground garage for you.",

faq_q4:"What happens if we are ill or need to reschedule?",
faq_a4:"Please let me know as early as possible if you become ill or something comes up. Especially with children, that is completely understandable. So far, we have always found a good solution, and I have never had to charge a cancellation fee. Together we will find a way to arrange a replacement date. For completeness: under the terms and conditions, cancellations less than 48 hours before the appointment may incur a 50% fee; the full fee may be charged for a no-show without notice. Just get in touch so we can talk everything through calmly.",

faq_q5:"Which package is right for us?",
faq_a5:"Take your time looking through the packages on the pricing page. I have deliberately created several options, so there is a suitable choice whether you only want a few favourite images or a larger collection. The benefits and savings of each package are listed transparently. If you are still unsure, simply tell me which photographs and groupings you would like - I will help you choose honestly and without pressure.",

faq_q6:"Can we choose additional images?",
faq_a6:"Yes, absolutely. Depending on the package you book, I select and professionally edit the included number of your strongest images. You will see all other successful photographs in your online gallery as low-resolution, watermarked previews. If you discover another favourite, I will gladly edit it for you: one image costs €15, five images €60 and ten images €100. It is therefore worth comparing the packages beforehand and considering roughly how many finished photographs you would like, as a larger package may offer better value.",

faq_q7:"How are the images selected and delivered?",
faq_a7:"I carefully select the strongest and most beautiful photographs and edit the images included in your package in my natural, timeless style. You will receive an email as soon as your gallery is ready. All professionally edited photographs can be downloaded in high resolution from the online gallery. Further successful images are available there as low-resolution, watermarked previews in case you would like to select additional photographs.",

faq_q8:"Will we receive unedited images or RAW files?",
faq_a8:"I do not generally provide unedited images or RAW files. Careful selection and editing are part of my photographic signature and ensure that you receive a coherent, high-quality result.",

faq_q9:"When will we receive our finished images?",
faq_a9:"I am usually very quick with editing. The exact turnaround depends on the type of session, the number of images and my current workload. As soon as your gallery is ready, I will of course let you know straight away.",

faq_q10:"Can we bring our own ideas or inspiration images?",
faq_a10:"Absolutely. If your idea requires a particular setup, background or prop, please send me your inspiration images before the session. If it is simply a pose or an idea that needs no preparation, you can also show it to me at the studio. I will then consider what fits you, the service you booked and my natural photographic style.",

faq_q11:"Will our photos be published?",
faq_a11:"Only with your explicit permission. Without your consent, I will not publish your images on my website, Instagram or in advertising. Your privacy and trust are very important to me.",

faq_q12:"How can we pay?",
faq_a12:"You can pay in cash directly after the session or by bank transfer once the invoice has been issued. You will receive the invoice by email. Final editing and delivery generally take place after full payment has been received.",

faq_q13:"Do you offer seasonal promotions or mini sessions?",
faq_a13:"Yes. Special promotions or mini sessions are available on selected dates. I announce current offers on my website and Instagram, so feel free to check there regularly.",

    contact_title:"Inquire now",
    contact_sub:"Tell me a little about what you have in mind – I usually reply within 24 hours.",
    form_name_label:"Your name",
    form_email_label:"Email",
    form_phone_label:"Phone",
    form_service_label:"Type of shoot",
    form_date_label:"Preferred date",
    form_location_label:"Location / preferred place",
    form_partner_code_label:"Partner benefit code (optional)",
    form_partner_code_placeholder:"Enter the code from the flyer",
    form_partner_code_hint:"The benefit will be applied to your quote after verification.",
    form_msg_label:"Message",
    form_submit:"Send",
    opt_portrait:"Portrait",
    opt_wedding:"Wedding",
    opt_family:"Family",
    opt_business:"Business",
    opt_other:"Other",
    aside_title:"Ready to book?",
    aside_text:"I’m happy to put together a custom offer for you. For last-minute dates, feel free to message me on WhatsApp or Instagram.",

    aside_title_new:"Contact",
aside_heading_new:"I’m looking forward to your message",
    aside_text_new_1:"I’d be happy to put together a personalised offer for you.",
    aside_text_new_2:"For short-notice appointments, the best way to reach me is by phone.",
aside_email_label:"Email",
aside_instagram_label:"Instagram",
aside_phone_label:"Phone",
aside_location_label:"Location",
    aside_location_value:"8054 Graz",
aside_note_1:"Sessions are available by appointment in Graz and the surrounding area.",
aside_note_2:"Homestory sessions, outdoor sessions and custom locations are all possible.",
    form_name_placeholder:"Your name",
form_email_placeholder:"your@email.com",
form_phone_placeholder:"+43 ...",
form_location_placeholder:"e.g. Graz, outdoor or your home",
form_msg_placeholder:"What do you have in mind? Location, number of people, style...",

    insta_title:"Follow me on Instagram",
insta_sub:"See more behind the scenes, real sessions and my latest work on Instagram.",
insta_button:"Follow @liza.memories.photography",

    footer_copy:"© {year} LiZa Memories Photography. All rights reserved.",
    footer_portfolio:"Portfolio",
    footer_contact:"Contact",
    footer_imprint:"Imprint",
    footer_privacy:"Privacy Policy",
    footer_terms:"Terms"
  },

  bs: {
        faq_link_general:"Opća pitanja",
    faq_link_maternity:"Trudnički FAQ",
    faq_link_newborn:"FAQ o novorođenčadi",
    faq_link_family:"Porodični FAQ",
    faq_link_wedding:"FAQ za vjenčanja",
    faq_link_combo:"Trudnoća i novorođenče FAQ",
    faq_link_portrait:"Portretni FAQ",
    nav_faq_link_general:"Opća pitanja",
    nav_faq_link_maternity:"Trudničko",
    nav_faq_link_newborn:"Novorođenčad",
    nav_faq_link_combo:"Trudničko + novorođenče",
    nav_faq_link_family:"Porodica",
    nav_faq_link_wedding:"Vjenčanje",
    nav_faq_link_portrait:"Portret",
    price_link_all:"Pregled",
    price_link_maternity:"Trudničko",
    price_link_newborn:"Novorođenčad",
    price_link_family:"Porodica",
    price_link_wedding:"Vjenčanje",
    price_link_combo:"Trudnoća + novorođenče",
    price_link_portrait:"Portret",
    nav_home:"Početna",
    nav_about:"O meni",
    nav_services:"Usluge",
    nav_service_0:"Portret",
    nav_service_1:"Trudničko",
    nav_service_2:"Novorođenčad",
    nav_service_3:"Porodica",
    nav_service_4:"Vjenčanje",
    nav_service_5:"Trudničko & novorođenče",
    nav_portfolio:"Portfolio",
    nav_gallery_1:"Trudnička galerija",
    nav_gallery_2:"Galerija novorođenčadi",
    nav_gallery_3:"Porodična galerija",
    nav_gallery_4:"Galerija vjenčanja",
    nav_pricing:"Cijene",
    nav_faq:"Česta pitanja",
    nav_contact:"Kontakt",
    header_cta:"Pošalji upit",
    lang_label:"Jezik",
    seo_title:"Trudničko, novorođenčad i porodično fotografisanje u Grazu | LiZa Memories Photography",
    seo_description:"Trudničko fotografisanje, fotografisanje novorođenčadi i porodično fotografisanje u Grazu i okolini. Autentične, emotivne i bezvremenske uspomene.",
    seo_og_title:"LiZa Memories Photography",
    seo_og_description:"Trudničko, novorođenčad i porodično fotografisanje u Grazu – autentične, emotivne i bezvremenske uspomene.",

    hero_chip:"LiZa Memories Photography",
    hero_title:"Fotografkinja u Grazu za trudničko, novorođenčad i porodično fotografisanje",
    hero_cta_1:"Rezerviši termin",
    hero_cta_2:"Pogledaj portfolio",
    hero_cta_3:"Pogledaj fotografisanje",
    video_eyebrow:"Iza kulisa",
    video_title:"Ovako izgleda fotografisanje kod LiZa Memories",
    video_text:"Pogledajte mali uvid u mirnu i ličnu atmosferu tokom fotografisanja.",
    hero_lead:"Nježno trudničko fotografisanje, fotografisanje novorođenčadi i porodično fotografisanje u Grazu i okolini. Autentično, emotivno i prirodno.",
    hero_proof_label_1:"Lokacija",
    hero_proof_value_1:"Fotografišem vas u svom studiju u Graz Straßgangu, a druge lokacije su moguće po dogovoru.",
    hero_proof_label_2:"Odgovor",
    hero_proof_value_2:"Odgovaram vam u roku od 24 sata. Zajedno ćemo u miru pronaći termin koji vam odgovara.",
    hero_proof_label_3:"Isporuka",
    hero_proof_value_3:"Najčešće sam vrlo brza s obradom. Tačno trajanje zavisi od vrste fotografisanja, broja fotografija i moje trenutne zauzetosti.",
    hero_proof_label_4:"Pristup",
    hero_proof_value_4:"Odvajam dovoljno vremena za vas i pažljivo se prilagođavam vašim željama. Tako nastaju prirodne i emotivne uspomene.",

    about_title:"O meni",
    about_sub:"Autentične fotografije koje pričaju priče.",
    about_p1:"Zdravo, ja sam Emina – fotografkinja koja voli stvarne trenutke i male detalje koji uspomene čine posebnima. Moj fokus je na nježnom trudničkom fotografisanju, fotografisanju novorođenčadi i porodičnom fotografisanju koje djeluje prirodno i nenametljivo.<br><br>Iz vlastitog iskustva znam koliko brzo ove životne faze prolaze i koliko je dragocjeno sačuvati ih. Zato mi je posebno važno stvarati fotografije koje će vam i godinama kasnije izmamiti osmijeh.",
    about_p2:"Na svakom fotografisanju odvajam vrijeme za vas, vodim vas nježno i stvaram opuštenu atmosferu u kojoj možete biti svoji. Upravo tada nastaju najiskrenije i najljepše fotografije.<br><br>Moj stil je miran, prirodan i profinjen. Bilježim stvarne emocije na nježan i nenametljiv način, kako bi vaše uspomene zadržale pravi osjećaj.",
    process_title:"Kako izgleda fotografisanje",
    process_sub:"Jasno, opušteno i profesionalno od prve poruke do gotovih fotografija.",
    process_card_1_title:"Jednostavan upit",
    process_card_1_text:"Možete mi se jednostavno javiti putem formulara, e-maila, Instagrama ili telefona. Brzo vam šaljem slobodne termine, a nakon vaše potvrde termin je rezervisan.",
    process_card_2_title:"Opušteno fotografisanje",
    process_card_2_text:"Zajedno prolazimo kroz ideje, nježno vas usmjeravam i pronalazimo ono što vam najviše odgovara. Ako želite, moguće su i promjene outfita i kratke pauze – sve u opuštenoj atmosferi i bez vremenskog pritiska.",
    process_card_3_title:"Pažljivo obrađene i brzo isporučene",
    process_card_3_text:"Pažljivo biram i obrađujem vaše najljepše fotografije. Trajanje obrade zavisi od vrste fotografisanja, broja fotografija i moje trenutne zauzetosti. Čim galerija bude spremna, odmah ću vam se javiti.",
    signature_title:"Izdvojene usluge",
    signature_sub:"Istražite usluge koje vam najviše odgovaraju i na jednom mjestu pronađite sve važne detalje.",
    signature_card_1_kicker:"Trudničke fotografije",
    signature_card_1_title:"Ljubav u iščekivanju",
    signature_card_1_text:"Emotivno trudničko fotografisanje u Grazu sa elegantnim stilom, mirnim vođenjem i stvarnim trenucima.",
    signature_card_1_meta_1:"Više outfita",
    signature_card_1_meta_2:"Partner po želji",
    signature_card_2_kicker:"Novorođenčad",
    signature_card_2_title:"Dobrodošlo, malo čudo",
    signature_card_2_text:"Fotografisanje novorođenčadi bez vremenskog pritiska, sa puno strpljenja i mirnom, sigurnom atmosferom za vašu bebu.",
    signature_card_2_meta_1:"Bez pritiska",
    signature_card_2_meta_2:"Porodične fotografije",
    signature_card_3_kicker:"Porodica",
    signature_card_3_title:"Prirodni porodični trenuci",
    signature_card_3_text:"Porodično fotografisanje sa stvarnom bliskošću, toplim interakcijama i fotografijama koje nikada ne djeluju umjetno.",
    signature_card_3_meta_1:"Opušteno vođenje",
    signature_card_3_meta_2:"Prirodan stil",
    signature_card_4_kicker:"Fotografije vjenčanja",
    signature_card_4_title:"Malo vjenčanje, velika uspomena",
    signature_card_4_text:"Fotografska pratnja za vjenčanja i male proslave sa fokusom na emociju, detalje i pozitivnu atmosferu.",
    signature_card_4_meta_1:"Emocija i detalji",
    signature_card_4_meta_2:"Fotografije parova uključene",
    signature_link:"Saznaj više",
    story_band_title:"Stvarni trenuci s nježnom i profinjenom estetikom",
    story_band_sub:"Ne radi se samo o pojedinačnim lijepim fotografijama, nego o cijeloj galeriji koja djeluje profinjeno, nježno i skladno.",
    story_band_label_1:"Trudničke fotografije",
    story_band_copy_1:"Nježna elegancija, iščekivanje i vidljiva ljubav.",
    story_band_label_2:"Novorođenčad",
    story_band_copy_2:"Sigurnost, mali detalji i stvarna bliskost.",
    story_band_label_3:"Porodica",
    story_band_copy_3:"Bliski, iskreni i spontani trenuci umjesto namještenih poza.",
    stories_title:"Priče sa fotografisanja",
    stories_sub:"Svako fotografisanje obilježavaju mir, pažljivo vođenje i iskrene emocije.",
    stories_card_1_title:"Ljubav u iščekivanju",
    stories_card_1_text:"Mirno trudničko fotografisanje sa više outfita, nježnim vođenjem i fotografijama koje su ženstvene i prirodne.",
    stories_card_1_li1:"Više outfita bez žurbe",
    stories_card_1_li2:"Partner i djeca po želji uključeni",
    stories_card_1_li3:"Elegantna i mekana vizuelna obrada",
    stories_card_2_title:"Dobrodošlo, malo čudo",
    stories_card_2_text:"Opušteno fotografisanje novorođenčadi bez pritiska, sa puno mira za vašu bebu i galerijom punom topline.",
    stories_card_2_li1:"Idealno: 5 do 14 dana nakon rođenja",
    stories_card_2_li2:"Moguće i porodične fotografije",
    stories_card_2_li3:"Pažljivi detalji i nježni trenuci",
    stories_card_3_title:"Porodično vrijeme",
    stories_card_3_text:"Sa stvarnom empatijom, puno osjećaja za djecu i opuštenom atmosferom.",
    stories_card_3_li1:"Opušteno i s malom djecom",
    stories_card_3_li2:"Razigrano i nježno vođenje",
    stories_card_3_li3:"Fotografije pune topline i bliskosti",
    stories_cta:"Pogledaj galeriju",

    portfolio_title:"Portfolio",
    portfolio_sub:"Izbor trudničkog fotografisanja, fotografisanja novorođenčadi i porodičnog fotografisanja.",

   portfolio_maternity:"Trudno\u0107a",
portfolio_newborn:"Novoro\u0111en\u010dad",
portfolio_family:"Porodica",
portfolio_more:"Prika\u017ei vi\u0161e fotografija",
portfolio_less:"Prika\u017ei manje fotografija",
portfolio_all:"Pogledaj cijelu galeriju",
portfolio_open:"Uve\u0107aj fotografiju",
portfolio_photo_dsc02038:"Trudno\u0107a \u2013 Ljubav koja raste",
portfolio_photo_dsc02054:"Trudno\u0107a \u2013 I\u0161\u010dekivanje u cvatu",
portfolio_photo_dsc01844:"Novoro\u0111en\u010dad \u2013 Malo \u010dudo",
portfolio_photo_dsc03101:"Novoro\u0111en\u010dad \u2013 Blizu mame",
portfolio_photo_dsc03113:"Novoro\u0111en\u010dad \u2013 Okru\u017eeni ljubavlju",
portfolio_photo_dsc03332:"Novoro\u0111en\u010dad \u2013 Male ruke, velika ljubav",
portfolio_photo_dsc03353:"Novoro\u0111en\u010dad \u2013 U\u0161u\u0161kani snovi",
portfolio_photo_dsc02461:"Porodica \u2013 U tatinom zagrljaju",
portfolio_photo_dsc02484:"Porodica \u2013 Mjehuri\u0107i i dje\u010diji smijeh",
portfolio_photo_dsc02524:"Porodica \u2013 Mali trenuci",
portfolio_photo_dsc02690:"Porodica \u2013 Sretni zajedno",
portfolio_photo_dsc03265:"Porodica \u2013 Poljubac pun ljubavi",
portfolio_photo_dsc01230:"Trudno\u0107a \u2013 \u010cekamo te",
portfolio_photo_dsc03285_2:"Porodica \u2013 Na\u0161a mala sre\u0107a",
portfolio_photo_dsc03416_2:"Porodica \u2013 Napokon zajedno",
google_review_text:"Kako je proteklo fotografisanje? Kako su se porodice osje\u0107ale? Pro\u010ditajte njihova iskustva direktno na mom Google profilu.",
google_review_link:"Pro\u010ditajte recenzije na Googleu",
google_review_label:"Vaša iskustva",
google_review_title:"Vaše riječi mi zaista mnogo znače.",
google_review_note:"Od srca hvala svima koji odvoje vrijeme da napišu recenziju. ♥",
gallery_1:"Porodica – Zajedništvo",
gallery_2:"Trudničko – Bliskost",
gallery_3:"Porodica – Ljubav majke i kćerke",
gallery_4:"Trudničko – Mali detalji",
gallery_5:"Porodica – Ljubav između braće i sestara",
gallery_6:"Trudničko – Nježni cvjetovi",
gallery_7:"Trudničko – Silueta",
gallery_8:"Trudničko – Iščekivanje",
    gallery_9:"Novorođenčad – Majčina ljubav",
    gallery_10:"Novoro\u0111en\u010dad \u2013 Mamina blizina",
gallery_11:"Trudničko – Elegantno",
gallery_12:"Porodica – Nježni trenuci",
gallery_13:"Trudničko – Iščekivanje",
gallery_14:"Trudničko – Nježna elegancija",
gallery_15:"Trudničko – Tatina ljubav",
    gallery_16:"Novoro\u0111en\u010dad \u2013 Ru\u017ei\u010dasti snovi",
    gallery_17:"Novorođenčad – Sigurnost",
    gallery_18:"Porodica \u2013 O\u010deva ljubav",
    gallery_19:"Novorođenčad – U sigurnim rukama",
    gallery_20:"Novorođenčad – Slatki snovi",
    gallery_21:"Novorođenčad – Bliska povezanost",

    testimonials_title:"Va\u0161a iskustva na Googleu",
testimonials_sub:"Iskrene recenzije ljudi koji su bili ispred mog objektiva.",

















    pricing_title:"Paketi i cijene",
    pricing_sub:"Transparentne ponude – lako prilagodljive vašim potrebama.",
    price1_chip:"Portret",
    price1_title:"Mini sesija",
    price1_li1:"30 minuta, 1 lokacija",
    price1_li2:"10 obrađenih fotografija (web & print)",
    price1_li3:"Online galerija i download",
    price2_chip:"Vjenčanje",
    price2_title:"Vjenčanje",
    price2_li1:"2 sata pratnje",
    price2_li2:"Selekcija i retuš 120+ fotografija",
    price2_li3:"Privatna online galerija",
    price3_title:"Tim portreti",
    price3_li1:"Set na lokaciji",
    price3_li2:"Individualni retuš",
    price3_li3:"Licenca za web i print",
    price_cta:"Pogledaj pakete",
    price_more_cta:"Više o usluzi",
    price_combo_more:"Više o trudničkom i novorođenčadi",
    pricing_note:"Sve cijene su oslobođene PDV-a prema § 6 st. 1 br. 27 UStG. Putni troškovi van Graza na upit.",
    price_badge_top:"Najpopularnije",
price_badge_save:"Najbolja ponuda",
    pricing_title_new:"Paketi i cijene",

pricing_fast_new:"Ovdje ćete pronaći najpovoljniji početni paket za svaku vrstu fotografisanja. Odaberite „Pogledaj pakete“ za potpuni pregled bronzanih, srebrnih i zlatnih paketa.",

price1_chip_new:"Portretne fotografije",
price1_title_new:"Portretno fotografisanje",
price1_li1_new:"20 do 30 minuta, zavisno od paketa",
price1_li2_new:"Od 3 obrađene fotografije",
price1_li4_new:"Jedan ili dva outfita i različiti izgledi fotografija",

price2_chip_new:"Trudničke fotografije",
price2_title_new:"Trudničko fotografisanje",
price2_li1_new:"30 do 60 minuta, zavisno od paketa",
price2_li2_new:"Od 5 obrađenih fotografija",
price2_li3_new:"Partner i djeca uključeni, zavisno od paketa",
price2_li4_new:"Moguća su do 3 outfita ili seta",

price3_chip_new:"Porodične fotografije",
price3_title_new:"Porodično fotografisanje",
price3_li1_new:"30 do 60 minuta, zavisno od paketa",
price3_li2_new:"Od 5 obrađenih fotografija",
price3_li3_new:"Zajednički porodični trenuci i različite kombinacije",
price3_li4_new:"Porodični, dječiji i pojedinačni portreti, zavisno od paketa",

    price4_chip_new:"Fotografije novorođenčadi",
price4_title_new:"Fotografisanje novorođenčeta",
price4_li1_new:"75 minuta do 2 sata, zavisno od paketa",
price4_li2_new:"Od 6 obrađenih fotografija",
price4_li3_new:"Jedan do tri pripremljena seta",
price4_li4_new:"Roditelji, porodica i djeca uključeni, zavisno od paketa",

price5_chip_new:"Trudničke i bebine fotografije",
    price5_title_new:"Trudničko i novorođenačko fotografisanje",
    price5_li1_new:"2 međusobno usklađena fotografisanja",
price5_li2_new:"Od ukupno 10 obrađenih fotografija",
price5_li3_new:"Povoljnija cijena od dvije pojedinačne rezervacije",
price5_li4_new:"Moguća su do 3 seta po fotografisanju",

price6_chip_new:"Fotografije vjenčanja i proslava",
price6_title_new:"Vjenčanja i proslave",
price6_li1_new:"1 do 3 sata pratnje, zavisno od paketa",
price6_li2_new:"Od oko 20 profesionalno obrađenih fotografija",
price6_li3_new:"Za vjenčanja, krštenja i male proslave",
price6_li4_new:"Ceremonija, fotografije para i grupe, zavisno od paketa",
price6_li5_new:"Privatna online galerija uključena",

pricing_note_new:"Sve cijene su oslobođene PDV-a prema § 6 st. 1 br. 27 UStG (pravilo za male poduzetnike). Putni troškovi van Graza na upit. Dodatne fotografije i individualni paketi su uvijek mogući.",
pricing_extra_images_new:"Dodatne obrađene fotografije: 15 € po fotografiji. <br>Paket ponude: 5 fotografija za 60 € • 10 fotografija za 100 €.",

opt_portrait_new:"Portret",
    opt_choose:"Molimo odaberite",
opt_maternity:"Trudničko",
    opt_newborn:"Novorođenčad",
    opt_combo:"Trudnički + novorođenački paket",
opt_civil:"Vjenčanje / mala proslava",

    faq_title:"Česta pitanja",
faq_sub:"Ovdje ćete pronaći iskrene odgovore na najvažnija opća pitanja o upitu, rezervaciji i gotovim fotografijama.",

    faq_q1:"Koliko ranije trebamo rezervisati termin?",
    faq_a1:"Čak i ako je vaš željeni termin uskoro, svakako mi se javite. Kratkoročne termine rado dodjeljujem kada imam slobodan termin, a zajedno ćemo pokušati pronaći rješenje koje odgovara objema stranama. Idealno je poslati upit dva do tri mjeseca unaprijed, posebno za popularne termine - ali spontani upit se uvijek isplati.",

faq_q2:"Kako izgleda slanje upita i rezervacija?",
faq_a2:"Možete me nazvati ili mi pisati putem WhatsAppa ili e-maila. Upit možete poslati i direktno preko obrasca na mojoj web-stranici. Napišite koju vrstu fotografisanja želite, okvirni željeni termin i sve što vam je važno. Lično ću vam odgovoriti, razjasniti pitanja i pomoći da zajedno odaberemo odgovarajući termin i paket. Kada sve dogovorimo, dobit ćete e-mail potvrdu s uslovima poslovanja i svim podacima o terminu. Termin se smatra obavezujuće rezervisanim čim potvrdite taj e-mail.",

faq_q3:"Gdje se održava fotografisanje?",
faq_a3:"Sva fotografisanja se u pravilu održavaju u mom studiju na adresi Mela-Spira-Str. 32b u Graz-Straßgangu, osim ako dogovorimo fotografisanje na otvorenom ili drugu lokaciju po vašoj želji. Desno od ulaza u podzemnu garažu vidjet ćete moju poslovnu oznaku. Pratite put oko 40 metara; na ulazu u studio nalazi se još jedna oznaka. Ispred zgrade ima dovoljno besplatnih parking mjesta. Ako su izuzetno sva zauzeta, pošaljite mi poruku ili nazovite pa ću vam otvoriti podzemnu garažu.",

faq_q4:"Šta ako se razbolimo ili moramo pomjeriti termin?",
faq_a4:"Javite mi što ranije ako se razbolite ili vam nešto iskrsne. Posebno s djecom, to je sasvim razumljivo. Do sada smo uvijek pronašli dobro rješenje i nikada nisam morala naplatiti naknadu za otkazivanje. Zajedno ćemo pronaći mogućnost za zamjenski termin. Radi potpunih informacija: prema uslovima poslovanja, otkazivanje manje od 48 sati prije termina može podrazumijevati naknadu od 50%, a nedolazak bez najave puni iznos. Slobodno mi se javite kako bismo sve dogovorili u miru.",

faq_q5:"Koji paket nam najbolje odgovara?",
faq_a5:"Pakete na stranici s cijenama možete u miru detaljno pogledati. Namjerno sam pripremila više opcija kako bi se pronašlo nešto prikladno i za nekoliko omiljenih fotografija i za veću kolekciju. Prednosti i uštede svakog paketa jasno su navedene. Ako ipak niste sigurni, samo mi recite kakve fotografije i koje kombinacije osoba želite - iskreno ću vam i bez pritiska pomoći pri izboru.",

faq_q6:"Možemo li odabrati dodatne fotografije?",
    faq_a6:"Da, naravno. Zavisno od rezervisanog paketa biram i profesionalno obrađujem uključeni broj vaših najjačih fotografija. Sve ostale uspjele snimke vidjet ćete u online galeriji kao preglede niske rezolucije s vodenim žigom. Ako tamo pronađete još neku omiljenu fotografiju, rado ću je dodatno obraditi: jedna fotografija košta 15 €, pet fotografija 60 €, a deset 100 €. Zato se isplati unaprijed uporediti pakete i okvirno razmisliti koliko gotovih fotografija želite, jer veći paket može biti povoljniji.",

faq_q7:"Kako se fotografije biraju i isporučuju?",
    faq_a7:"Pažljivo biram najjače i najljepše snimke te fotografije uključene u paket obrađujem u svom prirodnom i bezvremenskom stilu. Čim galerija bude spremna, dobit ćete obavijest e-mailom. Sve profesionalno obrađene fotografije možete preuzeti iz online galerije u visokoj rezoluciji. Ostale uspjele snimke tamo ćete vidjeti kao preglede niske rezolucije s vodenim žigom ako poželite odabrati dodatne fotografije.",

faq_q8:"Dobijamo li neobrađene fotografije ili RAW datoteke?",
faq_a8:"Neobrađene fotografije i RAW datoteke u pravilu ne predajem. Pažljiv odabir i obrada dio su mog fotografskog potpisa i osiguravaju da dobijete skladan i kvalitetan rezultat.",

faq_q9:"Kada dobijamo gotove fotografije?",
faq_a9:"Najčešće sam vrlo brza s obradom. Tačno trajanje ipak zavisi od vrste fotografisanja, broja vaših fotografija i moje trenutne zauzetosti. Čim galerija bude spremna, odmah ću vam se javiti.",

faq_q10:"Možemo li donijeti vlastite ideje ili inspirativne fotografije?",
    faq_a10:"Naravno. Ako vaša ideja zahtijeva poseban raspored, pozadinu ili rekvizit, pošaljite mi inspirativne fotografije prije termina. Ako se radi samo o pozi ili ideji koja ne zahtijeva pripremu, možete mi je sasvim opušteno pokazati i direktno u studiju. Zatim ću pogledati šta odgovara vama, rezervisanoj usluzi i mom prirodnom fotografskom stilu.",

faq_q11:"Hoće li naše fotografije biti objavljene?",
faq_a11:"Samo uz vašu izričitu dozvolu. Bez vaše saglasnosti neću objaviti fotografije na web-stranici, Instagramu niti ih koristiti u reklamne svrhe. Vaša privatnost i povjerenje veoma su mi važni.",

faq_q12:"Kako možemo platiti?",
faq_a12:"Možete platiti gotovinom direktno nakon fotografisanja ili bankovnom uplatom nakon izdavanja računa. Račun ćete dobiti e-mailom. Završna obrada i isporuka u pravilu slijede nakon potpune uplate.",

faq_q13:"Postoje li sezonske akcije ili mini-fotografisanja?",
faq_a13:"Da. U odabranim terminima postoje posebne akcije ili mini-fotografisanja. Aktuelne ponude objavljujem na web-stranici i Instagramu, pa tamo slobodno povremeno provjerite novosti.",

    contact_title:"Pošaljite upit",
    contact_sub:"Napišite mi ukratko – obično odgovaram u roku od 24h.",
    form_name_label:"Vaše ime",
    form_email_label:"E-mail",
    form_phone_label:"Telefon",
    form_service_label:"Vrsta fotografisanja",
    form_date_label:"Željeni datum",
    form_location_label:"Lokacija / željeno mjesto",
    form_partner_code_label:"Partnerski kod pogodnosti (opcionalno)",
    form_partner_code_placeholder:"Unesite kod sa letka",
    form_partner_code_hint:"Pogodnost će nakon provjere biti uračunata u vašu ponudu.",
    form_msg_label:"Poruka",
    form_submit:"Pošalji",
    opt_portrait:"Portret",
    opt_wedding:"Vjenčanje",
    opt_family:"Porodica",
    opt_business:"Biznis",
    opt_other:"Ostalo",
    aside_title:"Želite rezervisati termin?",
    aside_text:"Rado ću vam pripremiti individualnu ponudu. Za hitne termine javite mi se putem WhatsAppa ili Instagrama.",

    aside_title_new:"Kontakt",
aside_heading_new:"Radujem se vašoj poruci",
    aside_text_new_1:"Rado ću vam pripremiti individualnu ponudu.",
    aside_text_new_2:"Za kratkoročne termine najbolje je da me pozovete telefonom.",
aside_email_label:"E-mail",
aside_instagram_label:"Instagram",
aside_phone_label:"Telefon",
aside_location_label:"Lokacija",
    aside_location_value:"8054 Graz",
aside_note_1:"Fotografisanja po dogovoru u Grazu i okolini.",
aside_note_2:"Fotografisanje kod vas kući, u prirodi i na lokaciji po želji je moguće.",
    form_name_placeholder:"Vaše ime",
form_email_placeholder:"vas@email.com",
form_phone_placeholder:"+43 ...",
form_location_placeholder:"npr. Graz, u prirodi ili kod vas kući",
form_msg_placeholder:"Šta imate na umu? Lokacija, broj osoba, stil...",

    insta_title:"Zapratite me na Instagramu",
insta_sub:"Još više uvida u moj rad, dosadašnja fotografisanja i nove objave možete vidjeti na Instagramu.",
insta_button:"Zapratite @liza.memories.photography",

    footer_copy:"© {year} LiZa Memories Photography. Sva prava zadržana.",
    footer_portfolio:"Portfolio",
    footer_contact:"Kontakt",
    footer_imprint:"Impresum",
    footer_privacy:"Zaštita podataka",
    footer_terms:"Uslovi"
  }
};

    const DEFAULT_LANG = 'de';
    const SUPPORTED_LANGS = ['de', 'en', 'bs'];
    const SITE_ORIGIN = 'https://liza-memories-photography.com/';
    const LANGUAGE_SUFFIX_PATTERN = /-(en|bs)\.html$/i;
    const currentFileName = window.location.pathname.split('/').pop() || 'index.html';
    const baseFileName = stripLanguageSuffix(currentFileName);

    function stripLanguageSuffix(fileName){
      return fileName.replace(LANGUAGE_SUFFIX_PATTERN, '.html');
    }

    function normalizeHtmlPath(fileName){
      return (fileName || '').replace(/^\/+/, '') || 'index.html';
    }

    function getLanguageFromFile(fileName){
      const match = normalizeHtmlPath(fileName).match(LANGUAGE_SUFFIX_PATTERN);
      return match ? match[1].toLowerCase() : DEFAULT_LANG;
    }

    function isHomeFile(fileName){
      return stripLanguageSuffix(normalizeHtmlPath(fileName)).toLowerCase() === 'index.html';
    }

    function buildLocalizedFileName(fileName, lang){
      const normalizedFile = stripLanguageSuffix(normalizeHtmlPath(fileName));
      if(isHomeFile(normalizedFile)){
        return lang === DEFAULT_LANG ? 'index.html' : `index-${lang}.html`;
      }
      if(lang === DEFAULT_LANG){
        return normalizedFile;
      }
      return normalizedFile.replace(/\.html$/i, `-${lang}.html`);
    }

    function buildLocalizedHref(fileName, lang){
      if(isHomeFile(fileName)){
        return lang === DEFAULT_LANG ? '/' : `index-${lang}.html`;
      }
      return buildLocalizedFileName(fileName, lang);
    }

    function buildAbsoluteUrlForLanguage(fileName, lang){
      return new URL(buildLocalizedHref(fileName, lang), SITE_ORIGIN).toString();
    }

    function localizeHref(href, lang){
      if(!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')){
        return href;
      }

      const [pathAndQuery, hashFragment] = href.split('#', 2);
      const [pathName, queryString] = pathAndQuery.split('?', 2);
      const normalizedPath = normalizeHtmlPath(pathName);

      if(pathName === '/' || isHomeFile(normalizedPath)){
        const localizedPath = buildLocalizedHref('index.html', lang);
        const queryPart = queryString ? `?${queryString}` : '';
        const hashPart = hashFragment ? `#${hashFragment}` : '';
        return `${localizedPath}${queryPart}${hashPart}`;
      }

      if(!/\.html$/i.test(pathName)){
        return href;
      }

      const localizedPath = buildLocalizedHref(pathName, lang);
      const queryPart = queryString ? `?${queryString}` : '';
      const hashPart = hashFragment ? `#${hashFragment}` : '';
      return `${localizedPath}${queryPart}${hashPart}`;
    }

    function updateInternalLinks(lang){
      document.querySelectorAll('a[href]').forEach(link => {
        if(link.classList.contains('lang-option')){
          return;
        }
        const href = link.getAttribute('href');
        const localizedHref = localizeHref(href, lang);
        if(localizedHref !== href){
          link.setAttribute('href', localizedHref);
        }
      });
    }

    function setMetaContent(selector, value){
      const node = document.querySelector(selector);
      if(node && value){
        node.setAttribute('content', value);
      }
    }

    function ensureAlternateLink(lang, href){
      let link = document.querySelector(`link[rel="alternate"][hreflang="${lang}"]`);
      if(!link){
        link = document.createElement('link');
        link.setAttribute('rel', 'alternate');
        link.setAttribute('hreflang', lang);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    }

    function updateSeoTags(lang){
      const strings = i18n[lang] || i18n.de;
      const currentUrl = buildAbsoluteUrlForLanguage(baseFileName, lang);

      document.title = strings.seo_title;
      setMetaContent('meta[name="description"]', strings.seo_description);
      setMetaContent('meta[property="og:title"]', strings.seo_og_title);
      setMetaContent('meta[property="og:description"]', strings.seo_og_description);
      setMetaContent('meta[property="og:url"]', currentUrl);
      setMetaContent('meta[name="twitter:title"]', strings.seo_og_title);
      setMetaContent('meta[name="twitter:description"]', strings.seo_og_description);

      const canonicalLink = document.querySelector('link[rel="canonical"]');
      if(canonicalLink){
        canonicalLink.setAttribute('href', currentUrl);
      }

      ensureAlternateLink('de', buildAbsoluteUrlForLanguage(baseFileName, 'de'));
      ensureAlternateLink('en', buildAbsoluteUrlForLanguage(baseFileName, 'en'));
      ensureAlternateLink('bs', buildAbsoluteUrlForLanguage(baseFileName, 'bs'));
      ensureAlternateLink('x-default', buildAbsoluteUrlForLanguage(baseFileName, 'de'));
    }

    function updateHomeSchema(lang){
      const strings = i18n[lang] || i18n.de;
      const currentUrl = buildAbsoluteUrlForLanguage(baseFileName, lang);
      const faqEntities = $('.faq-list .faq-item').map((item) => {
        const question = item.querySelector('.faq-question > span:first-child')?.textContent.trim();
        const answer = item.querySelector('.faq-answer p')?.textContent.trim();
        if(!question || !answer){
          return null;
        }
        return {
          '@type': 'Question',
          name: question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: answer
          }
        };
      }).filter(Boolean);

      const schemaScript = document.querySelector('script[type="application/ld+json"]');
      if(!schemaScript){
        return;
      }

      schemaScript.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ProfessionalService',
            '@id': `${SITE_ORIGIN}#business`,
            name: 'LiZa Memories Photography',
            image: [
              'https://liza-memories-photography.com/hero-bild.webp',
              'https://liza-memories-photography.com/13.webp',
              'https://liza-memories-photography.com/33.webp'
            ],
            url: currentUrl,
            telephone: '+4368181942780',
            email: 'info@liza-memories-photography.com',
            priceRange: '$$',
            areaServed: ['Graz', 'Graz-Umgebung', 'Steiermark'],
            sameAs: ['https://instagram.com/liza.memories.photography'],
            address: {
              '@type': 'PostalAddress',
              streetAddress: 'Mela-Spira-Str. 32b',
              postalCode: '8054',
              addressLocality: 'Graz',
              addressCountry: 'AT'
            },
            description: strings.seo_description
          },
          {
            '@type': 'FAQPage',
            '@id': `${currentUrl}#faq`,
            mainEntity: faqEntities
          }
        ]
      });
    }

    function syncLangUi(lang){
      document.documentElement.lang = lang;
      if(langCurrent){
        langCurrent.textContent = lang.toUpperCase();
      }

      document.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });
    }

    function setLang(lang){
      document.documentElement.lang = lang;
      const strings = i18n[lang] || i18n.de;

      $$('[data-i18n]').forEach(node => {
        const key = node.getAttribute('data-i18n');
        if(strings[key]) {
          node.innerHTML = strings[key].replace('{year}', new Date().getFullYear());
        }
      });

      $$('[data-i18n-placeholder]').forEach(node => {
        const key = node.getAttribute('data-i18n-placeholder');
        if(strings[key]) {
          node.placeholder = strings[key];
        }
      });

      const imprintLink = document.querySelector('[data-i18n="footer_imprint"]');
      const privacyLink = document.querySelector('[data-i18n="footer_privacy"]');
      const termsLink = document.querySelector('[data-i18n="footer_terms"]');

      if(imprintLink){
        imprintLink.href = buildLocalizedFileName('impressum.html', lang);
      }
      if(privacyLink){
        privacyLink.href = buildLocalizedFileName('datenschutz.html', lang);
      }
      if(termsLink){
        termsLink.href = buildLocalizedFileName('agb.html', lang);
      }

      updateSeoTags(lang);
      updateHomeSchema(lang);
      updateInternalLinks(lang);

      $$('.faq-item.open').forEach(item => {
        const answer = $('.faq-answer', item);
        if(answer){
          answer.style.maxHeight = answer.scrollHeight + 'px';
        }
      });

      syncLangUi(lang);
    }
    const langBtn = $('#langBtn');
    const langMenu = $('#langMenu');
    const langCurrent = $('#langCurrent');
    const langOptions = $$('.lang-option');
    const staticLang = (document.documentElement.getAttribute('data-static-lang') || '').toLowerCase();
    const currentLang = SUPPORTED_LANGS.includes(staticLang)
      ? staticLang
      : (SUPPORTED_LANGS.includes(getLanguageFromFile(currentFileName)) ? getLanguageFromFile(currentFileName) : DEFAULT_LANG);

    if(SUPPORTED_LANGS.includes(staticLang)){
      syncLangUi(currentLang);
    }else{
      setLang(currentLang);
    }

    langOptions.forEach(option => {
      option.addEventListener('click', (event) => {
        const selectedLang = option.dataset.lang;
        if(!SUPPORTED_LANGS.includes(selectedLang)){
          return;
        }

        const targetHref = option.getAttribute('href') || buildLocalizedHref(baseFileName, selectedLang);
        const targetPath = targetHref.split('#', 2)[0];
        const targetHash = ''; // A language change opens the page at its beginning.

        event.preventDefault();

        // Language is carried by the page URL.

        window.location.href = `${targetPath}${targetHash}`;
      });
    });

    if(langBtn && langMenu){
      langBtn.addEventListener('click', () => {
        const isOpen = langMenu.classList.contains('open');
        langMenu.classList.toggle('open');
        langBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    }

    document.addEventListener('click', (e) => {
      const langSwitch = $('#langSwitch');
      if(!langSwitch || !langMenu || !langBtn){
        return;
      }
      if(!langSwitch.contains(e.target)){
        langMenu.classList.remove('open');
        langBtn.setAttribute('aria-expanded', 'false');
      }
    });

    // ---------- FAQ Accordion ----------
const faqItems = $$('.faq-item');

faqItems.forEach((item, index) => {
  const btn = $('.faq-question', item);
  const answer = $('.faq-answer', item);
  const answerId = `faq-answer-${index + 1}`;

  answer.id = answerId;
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', answerId);

  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');

    faqItems.forEach(other => {
      other.classList.remove('open');
      const otherBtn = $('.faq-question', other);
      $('.faq-answer', other).style.maxHeight = null;
      otherBtn?.setAttribute('aria-expanded', 'false');
    });

    if(!isOpen){
      item.classList.add('open');
      answer.style.maxHeight = answer.scrollHeight + 'px';
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});
    // Contact submission is handled by scripts/contact-flow.js.

    // ---------- Burger Menü ----------
const burger = $('#burger');
const nav = document.querySelector('nav.primary');

burger.addEventListener('click', () => {
  nav.classList.toggle('open');
  burger.classList.toggle('active');

  const expanded = burger.classList.contains('active');
  burger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
});

// Menü schließen nach Klick auf Link
$$('nav.primary a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
  });
});
