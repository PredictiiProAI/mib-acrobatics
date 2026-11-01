export const LEGAL_CONTACT_EMAIL = "marius.butrin@gmail.com";
export const LEGAL_UPDATED = "1 noiembrie 2026";
export const DELETE_CONFIRM_WORD = "ȘTERGE";

/** Accepts "ȘTERGE" with or without diacritics, any case. */
export const isDeleteConfirmation = (v: string) =>
  v.normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase() === "STERGE";

export type LegalBlock = string | { list: string[] };
export type LegalSection = { id: string; title: string; body: LegalBlock[] };

export const PRIVACY_INTRO =
  "Această politică explică ce date personale prelucrează MIB Acrobatics prin platforma AcroMIB (site-ul web și aplicația Android), de ce le prelucrează, cât timp le păstrează și ce drepturi ai, în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și legislația română aplicabilă.";

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: "cine-suntem",
    title: "Cine suntem",
    body: [
      "Operatorul datelor este MIB Acrobatics, clubul care administrează AcroMIB, platforma digitală destinată membrilor clubului: sportivi, părinți ai sportivilor minori și antrenori colaboratori.",
      "AcroMIB oferă conturi de membru, profilul sportiv, programul antrenamentelor, comunitatea AcroMib (fotografii și videoclipuri de la antrenamente, reacții, comentarii), mesagerie cu antrenorul și semnarea digitală a declarației de participare.",
      `Pentru orice întrebare sau cerere privind datele personale ne poți scrie la ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: "date-colectate",
    title: "Ce date colectăm",
    body: [
      "Colectăm doar datele pe care ni le furnizezi tu sau care rezultă din folosirea platformei:",
      {
        list: [
          "Date de cont: nume și prenume, adresa de email și parola (stocată exclusiv sub formă criptată, ireversibil — nu o putem vedea).",
          "Date de profil: numele afișat, fotografia de profil, tipul de cont (Sportiv, Părinte, Antrenor), disciplina și nivelul, data nașterii, numărul de telefon și, opțional, contul de Instagram/TikTok.",
          "Date despre copii (dacă ești părinte): numele și vârsta copilului / copiilor, completate de tine.",
          "Contactul de urgență: numele și numărul de telefon al persoanei care trebuie anunțată în caz de accidentare.",
          "Dovezi legale: data și ora acceptării Termenilor și a acestei Politici la crearea contului, precum și numele complet al semnatarului și data și ora semnării declarației pe proprie răspundere.",
          "Conținut media și interacțiuni: imaginile și videoclipurile încărcate în AcroMib, descrierile acestora, comentariile, reacțiile și mesajele schimbate cu antrenorul.",
          "Date tehnice: data ultimei autentificări, cookie-urile de sesiune necesare autentificării și jurnalele tehnice ale furnizorilor de găzduire (de exemplu adresa IP și tipul de browser/dispozitiv), folosite pentru securitate.",
        ],
      },
      "Nu colectăm date de localizare, nu folosim publicitate și nu creăm profiluri automate despre utilizatori.",
    ],
  },
  {
    id: "scopuri",
    title: "Scopul și temeiul prelucrării",
    body: [
      {
        list: [
          "Gestionarea contului și accesul la platformă — executarea acordului de utilizare pe care îl accepți la înregistrare (art. 6 alin. 1 lit. b GDPR).",
          "Siguranța sportivilor în sală — contactul de urgență, data nașterii și declarația semnată permit antrenorilor să intervină corect în caz de accidentare și să verifice că participarea a fost asumată (interesul legitim al clubului și al sportivului, art. 6 alin. 1 lit. f, respectiv protejarea intereselor vitale, art. 6 alin. 1 lit. d).",
          "Comunicarea programului, a anunțurilor și a mesajelor între membri și antrenori — executarea acordului de utilizare și interesul legitim al clubului de a-și informa membrii.",
          "Afișarea conținutului în comunitatea AcroMib — consimțământul tău, exprimat prin încărcarea conținutului; îl poți retrage oricând ștergând postarea.",
          "Dovada consimțământului și a declarației semnate — îndeplinirea obligațiilor legale și apărarea drepturilor clubului (art. 6 alin. 1 lit. c și f).",
          "Securitatea platformei și prevenirea abuzurilor — interesul legitim al clubului.",
        ],
      },
      "Nu vindem, nu închiriem și nu folosim datele tale în scopuri de marketing.",
    ],
  },
  {
    id: "minori",
    title: "Datele minorilor",
    body: [
      "Pentru sportivii sub 16 ani, contul este creat sau aprobat de părinte ori de tutorele legal, care furnizează datele copilului și semnează declarația de participare în numele acestuia.",
      `Imaginile în care apar minori sunt publicate doar în scopul comunității clubului. Părintele poate cere oricând eliminarea unei imagini sau a datelor copilului scriind la ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: "acces",
    title: "Cine are acces la date",
    body: [
      {
        list: [
          "Membrii autentificați văd postările din AcroMib, numele afișat, fotografia de profil, comentariile și reacțiile.",
          "Postările marcate ca publice de echipa clubului pot apărea și pe pagina principală a site-ului, vizibilă oricui.",
          "Datele sensibile — telefonul, data nașterii, datele copiilor, contactul de urgență și declarația semnată — sunt vizibile doar titularului contului și antrenorilor / administratorilor clubului.",
          "Furnizori tehnici care prelucrează datele exclusiv în numele nostru: Supabase (baza de date, autentificarea și stocarea fișierelor), Vercel (găzduirea site-ului și a aplicației) și furnizorul de email folosit pentru mesajele de confirmare și notificări.",
          "Autorități publice, doar atunci când legea ne obligă.",
        ],
      },
    ],
  },
  {
    id: "stocare",
    title: "Stocarea și securitatea datelor",
    body: [
      "Datele sunt stocate securizat prin Supabase. Toate conexiunile dintre aplicație și servere sunt criptate (HTTPS/TLS), parolele sunt păstrate doar sub formă criptată, iar accesul la fiecare tabel este restricționat prin reguli de securitate la nivel de rând, astfel încât fiecare utilizator vede doar datele la care are dreptul.",
      "Dacă furnizorii noștri prelucrează date în afara Spațiului Economic European, transferul se face doar cu garanțiile prevăzute de GDPR (decizii de adecvare sau clauze contractuale standard aprobate de Comisia Europeană).",
    ],
  },
  {
    id: "retentie",
    title: "Cât timp păstrăm datele",
    body: [
      "Păstrăm datele cât timp contul tău este activ. La ștergerea contului se șterg definitiv profilul, postările, fișierele încărcate, comentariile, reacțiile și mesajele, cu excepția informațiilor pe care legea ne obligă să le păstrăm.",
      "Copiile de siguranță ale furnizorilor tehnici sunt suprascrise automat într-o perioadă limitată după ștergere.",
    ],
  },
  {
    id: "drepturi",
    title: "Drepturile tale",
    body: [
      "Conform GDPR, ai următoarele drepturi:",
      {
        list: [
          "Dreptul de acces — să afli ce date deținem despre tine și să primești o copie a lor.",
          "Dreptul la rectificare — majoritatea datelor le poți corecta direct din pagina Profil; pentru restul ne poți scrie.",
          "Dreptul la ștergere — să ceri ștergerea contului și a datelor tale.",
          "Dreptul la restricționarea prelucrării și dreptul de opoziție.",
          "Dreptul la portabilitate — să primești datele într-un format structurat, care poate fi citit automat.",
          "Dreptul de a-ți retrage consimțământul oricând, fără a afecta legalitatea prelucrării anterioare.",
          "Dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro.",
        ],
      },
      `Cererile se trimit la ${LEGAL_CONTACT_EMAIL}, de preferință de pe adresa de email a contului. Răspundem în cel mult o lună de la primire.`,
    ],
  },
  {
    id: "stergere-cont",
    title: "Cum îți ștergi contul",
    body: [
      "Din aplicație: intră în Profil, secțiunea „Ștergere cont”, apasă „Șterge contul” și confirmă. Contul și toate datele asociate (profil, postări, fișiere, comentarii, reacții, mesaje, declarație) se șterg imediat și definitiv.",
      `Prin email: dacă nu mai ai acces la cont, scrie-ne la ${LEGAL_CONTACT_EMAIL} de pe adresa cu care te-ai înregistrat, cu subiectul „Ștergere cont AcroMIB”. Dacă ești părinte, poți cere în același mod ștergerea datelor copilului. Ștergem contul și toate datele asociate în cel mult 30 de zile și îți confirmăm prin email.`,
    ],
  },
  {
    id: "cookie",
    title: "Cookie-uri",
    body: [
      "Folosim doar cookie-uri strict necesare, care păstrează sesiunea de autentificare. Nu folosim cookie-uri de publicitate sau de urmărire.",
    ],
  },
  {
    id: "modificari",
    title: "Modificări ale politicii",
    body: [
      "Putem actualiza această politică atunci când platforma sau legislația se schimbă. Data ultimei actualizări este afișată la începutul paginii, iar modificările importante sunt anunțate în aplicație.",
    ],
  },
];

export const TERMS_INTRO =
  "Acești termeni reglementează folosirea platformei AcroMIB (site-ul web și aplicația Android) administrate de MIB Acrobatics. Prin crearea unui cont confirmi că i-ai citit și că ești de acord cu ei.";

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: "despre",
    title: "Despre AcroMIB",
    body: [
      "AcroMIB este platforma digitală a clubului MIB Acrobatics, destinată sportivilor, părinților și antrenorilor colaboratori. Platforma oferă profilul de membru, programul antrenamentelor, comunitatea AcroMib, mesageria cu antrenorul și declarația digitală de participare.",
      "Folosirea platformei este gratuită pentru membrii clubului.",
    ],
  },
  {
    id: "cont",
    title: "Contul de utilizator",
    body: [
      {
        list: [
          "Furnizezi date reale și corecte și le actualizezi atunci când se schimbă, în special contactul de urgență.",
          "Contul este personal. Păstrezi parola confidențială și ne anunți imediat dacă bănuiești că a fost folosită de altcineva.",
          "Sportivii sub 16 ani pot folosi platforma doar cu acordul părintelui sau al tutorelui legal, care răspunde pentru datele furnizate și pentru folosirea contului.",
          "Ești responsabil pentru activitatea desfășurată din contul tău.",
        ],
      },
    ],
  },
  {
    id: "comunitate",
    title: "Regulile comunității AcroMib",
    body: [
      "AcroMib este un spațiu sigur pentru sportivi de toate vârstele, inclusiv minori. Este interzisă publicarea de conținut (imagini, videoclipuri, descrieri, comentarii sau mesaje):",
      {
        list: [
          "ofensator, obscen, vulgar, sexual explicit sau nepotrivit pentru minori;",
          "violent, amenințător, discriminatoriu sau care incită la ură;",
          "care hărțuiește, umilește sau ridiculizează alți membri (inclusiv bullying);",
          "cu alte persoane fără acordul lor — iar în cazul minorilor, fără acordul părintelui;",
          "care dezvăluie date personale ale altor persoane;",
          "care încurajează executarea de elemente periculoase fără supravegherea unui antrenor;",
          "publicitar, spam sau care încalcă drepturile de autor ale altora.",
        ],
      },
    ],
  },
  {
    id: "continut",
    title: "Conținutul încărcat",
    body: [
      "Îți păstrezi drepturile asupra conținutului pe care îl încarci. Prin publicare acorzi clubului o licență neexclusivă și gratuită de a-l afișa în cadrul platformei AcroMIB, iar pentru postările marcate ca publice, și pe pagina principală a site-ului, pe durata cât acesta rămâne publicat.",
      "Confirmi că ai dreptul să publici conținutul și că persoanele care apar în el (sau părinții acestora) și-au dat acordul. Îți poți șterge oricând propriile postări și comentarii.",
    ],
  },
  {
    id: "moderare",
    title: "Moderare și sancțiuni",
    body: [
      "Antrenorii și administratorii clubului pot elimina, fără notificare prealabilă, orice conținut care încalcă acești termeni. În cazul încălcărilor repetate sau grave, contul poate fi suspendat sau șters.",
      `Poți semnala orice conținut nepotrivit unui antrenor sau la ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: "antrenamente",
    title: "Antrenamentele și autoritatea antrenorului",
    body: [
      {
        list: [
          "În timpul antrenamentelor, indicațiile antrenorului sunt obligatorii. Niciun element nu se execută fără acordul și supravegherea antrenorului.",
          "Respecți regulamentul intern al sălii, regulile de siguranță și echipamentul indicat.",
          "Anunți antrenorul, înainte de antrenament, despre orice accidentare, afecțiune sau tratament care poate influența participarea.",
          "Conținutul din AcroMib are scop informativ și motivațional și nu înlocuiește antrenamentul supravegheat. Nu încerca elementele văzute în aplicație acasă sau fără antrenor.",
        ],
      },
    ],
  },
  {
    id: "declaratie",
    title: "Declarația pe proprie răspundere",
    body: [
      "Participarea la antrenamente este condiționată de semnarea digitală a Declarației pe proprie răspundere și a Acordului de participare, disponibile în pagina Profil, secțiunea „Documente Legale & Siguranță”.",
      "Semnătura digitală constă în bifarea acordului și introducerea numelui complet al adultului semnatar; platforma înregistrează numele și data și ora semnării. Pentru sportivii minori, declarația este semnată de părinte sau de tutorele legal.",
      "Prin semnare confirmi că ai citit declarația, că îți asumi riscurile inerente activităților sportive și că informațiile furnizate sunt reale.",
    ],
  },
  {
    id: "raspundere",
    title: "Limitarea răspunderii",
    body: [
      "Depunem toate eforturile ca platforma să funcționeze corect și în siguranță, însă nu putem garanta disponibilitatea neîntreruptă a acesteia. Nu răspundem pentru conținutul publicat de utilizatori și nici pentru întreruperile cauzate de furnizorii tehnici.",
      "Nicio prevedere a acestor termeni nu limitează răspunderea clubului în situațiile în care legea nu permite o astfel de limitare.",
    ],
  },
  {
    id: "date-personale",
    title: "Date personale",
    body: ["Modul în care prelucrăm datele tale este descris în [Politica de Confidențialitate](/confidentialitate), parte integrantă a acestor termeni."],
  },
  {
    id: "incetare",
    title: "Ștergerea contului",
    body: [
      "Poți renunța oricând la cont. Pașii pentru ștergerea contului și a datelor sunt descriși în [Politica de Confidențialitate — Cum îți ștergi contul](/confidentialitate#stergere-cont).",
    ],
  },
  {
    id: "modificari",
    title: "Modificări ale termenilor",
    body: [
      "Putem actualiza acești termeni atunci când platforma sau legislația se schimbă. Modificările importante sunt anunțate în aplicație, iar folosirea în continuare a platformei după anunț înseamnă acceptarea noii versiuni.",
    ],
  },
  {
    id: "legea",
    title: "Legea aplicabilă",
    body: [
      `Acești termeni sunt guvernați de legea română. Orice neînțelegere se rezolvă mai întâi pe cale amiabilă, la ${LEGAL_CONTACT_EMAIL}, iar în lipsa unei înțelegeri, de instanțele competente din România.`,
    ],
  },
];
