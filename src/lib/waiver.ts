export const WAIVER_TITLE = "Acord Parental & Fișă Medicală Sportiv";

/** "sportiv" only exists on records signed before 0017 (adult athlete waiver, no longer offered). */
export type WaiverForm = "parinte" | "sportiv";
export type WaiverAck = "risks" | "instructions" | "first_aid" | "fitness" | "medical_consent" | "guardian" | "adult";

/** Text to be reviewed by the club's lawyer before final use. */
export const WAIVER_INTRO: Record<WaiverForm, string[]> = {
  parinte: [
    "Subsemnatul/Subsemnata, în calitate de părinte sau tutore legal al sportivului minor indicat mai jos, declar că am luat la cunoștință natura fizică a activităților desfășurate în cadrul clubului MIB Acrobatics (acrobație, gimnastică, sărituri la trambulină, parkour și activități similare).",
    "Informațiile medicale de mai jos sunt folosite exclusiv de antrenorii și administratorii clubului pentru siguranța copilului la antrenamente și în caz de urgență.",
  ],
  sportiv: [
    "Subsemnatul/Subsemnata, sportiv major, declar că am luat la cunoștință natura fizică a activităților desfășurate în cadrul clubului MIB Acrobatics (acrobație, gimnastică, sărituri la trambulină, parkour și activități similare).",
    "Informațiile medicale de mai jos sunt folosite exclusiv de antrenorii și administratorii clubului pentru siguranța mea la antrenamente și în caz de urgență.",
  ],
};

const COMMON: Partial<Record<WaiverAck, Record<WaiverForm, string>>> = {
  risks: {
    parinte: "Înțeleg că sporturile acrobatice implică riscuri inerente de accidentare (entorse, luxații, fracturi, contuzii sau alte leziuni) și îmi asum aceste riscuri pentru participarea copilului meu.",
    sportiv: "Înțeleg că sporturile acrobatice implică riscuri inerente de accidentare (entorse, luxații, fracturi, contuzii sau alte leziuni) și îmi asum aceste riscuri.",
  },
  instructions: {
    parinte: "Copilul meu are obligația să respecte întocmai indicațiile tehnice și de siguranță ale antrenorilor și regulamentul sălii. Înțeleg că nerespectarea acestora poate duce la accidentări pentru care clubul nu răspunde.",
    sportiv: "Mă oblig să respect întocmai indicațiile tehnice și de siguranță ale antrenorilor și regulamentul sălii. Înțeleg că nerespectarea acestora poate duce la accidentări pentru care clubul nu răspunde.",
  },
  first_aid: {
    parinte: "Autorizez antrenorii să acorde primul ajutor de bază și să apeleze serviciile de urgență (112) atunci când este necesar, urmând ca eu să fiu anunțat imediat.",
    sportiv: "Autorizez antrenorii să acorde primul ajutor de bază și să apeleze serviciile de urgență (112) atunci când este necesar și să anunțe persoana de contact indicată.",
  },
  fitness: {
    parinte: "Declar că, după cunoștința mea, copilul este apt din punct de vedere medical pentru efort fizic și că voi anunța antrenorul despre orice schimbare a stării lui de sănătate.",
    sportiv: "Declar că sunt apt din punct de vedere medical pentru efort fizic, că am declarat complet afecțiunile preexistente și că voi anunța antrenorul despre orice schimbare a stării mele de sănătate.",
  },
  medical_consent: {
    parinte: "Îmi dau consimțământul explicit ca datele medicale ale copilului să fie prelucrate de club în scopul siguranței la antrenamente, conform Politicii de Confidențialitate.",
    sportiv: "Îmi dau consimțământul explicit ca datele mele medicale să fie prelucrate de club în scopul siguranței la antrenamente, conform Politicii de Confidențialitate.",
  },
};

export const WAIVER_ACKS: Record<WaiverForm, { key: WaiverAck; label: string }[]> = {
  parinte: [
    ...(["risks", "instructions", "first_aid", "fitness", "medical_consent"] as const).map((key) => ({ key, label: COMMON[key]!.parinte })),
    { key: "guardian", label: "Declar că sunt părintele sau tutorele legal al copilului și că datele furnizate sunt reale și complete." },
  ],
  sportiv: [
    ...(["fitness", "risks", "instructions", "first_aid", "medical_consent"] as const).map((key) => ({ key, label: COMMON[key]!.sportiv })),
    { key: "adult", label: "Declar că am împlinit 18 ani și că datele furnizate sunt reale și complete. (Pentru sportivii minori, declarația o completează părintele din contul de tip Părinte.)" },
  ],
};

export const MEDICAL_FIELDS = [
  { key: "allergies", label: "Alergii", hint: "medicamente, alimente, înțepături de insecte etc." },
  { key: "chronic_conditions", label: "Afecțiuni cronice", hint: "astm, afecțiuni cardiovasculare, neurologice, epilepsie etc." },
  { key: "previous_injuries", label: "Accidentări anterioare", hint: "fracturi, probleme articulare / ligamentare, afecțiuni ale coloanei etc." },
  { key: "other_medical", label: "Alte afecțiuni, contraindicații sau recomandări medicale specifice", hint: "orice altceva ar trebui să știe antrenorul" },
] as const;

export type MedicalKey = (typeof MEDICAL_FIELDS)[number]["key"];
export const NOT_APPLICABLE = "Nu este cazul";
export const FORM_ROLE_LABEL: Record<WaiverForm, string> = { parinte: "Părinte", sportiv: "Sportiv" };

export const RULES_TITLE = "Regulament & Siguranță Sportiv AcroMIB";
export const RULES = [
  "Respect în orice moment instrucțiunile date de antrenori.",
  "Anunț imediat antrenorul dacă simt durere, mă accidentez sau nu mă simt bine.",
  "Nu încerc elemente acrobatice sau trick-uri riscante fără supravegherea antrenorului.",
  "Vin la antrenament cu echipament potrivit și mă port sigur și respectuos cu colegii.",
];
export const RULES_ACCEPT = "Am citit și respect regulile AcroMIB";
