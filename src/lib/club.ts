/** Club content shown on the landing and "Despre Noi" pages. Edit here to update texts and the training schedule. */

export const PARTNER_SCHOOLS = "peste 12";

export const DISCIPLINES = [
  { key: "tumbling", title: "Acrobatică la sol", text: "Rondade, flic-flacuri și salturi pe pistă — fundația oricărui acrobat.", level: "Toate nivelurile" },
  { key: "trampoline", title: "Trambulină", text: "Rotații, șuruburi și control aerian în siguranță, cu progresie pe etape.", level: "Începători – avansați" },
  {
    key: "individual",
    title: "Acrobatică Individuală & Condiționare",
    text: "Tehnică individuală curată, forță de core și condiționare fizică pentru elemente sigure.",
    level: "Toate nivelurile",
  },
  { key: "handstand", title: "Echilibru & stând pe mâini", text: "Linie corectă, forță de umeri și control al corpului cu capul în jos.", level: "Toate nivelurile" },
  { key: "flex", title: "Flexibilitate & mobilitate", text: "Spagaturi, punți și mobilitate activă pentru elemente curate și fără accidentări.", level: "Toate nivelurile" },
  {
    key: "specific",
    title: "Pregătire Fizică Specifică",
    text: "Forță, explozie și acrobatică aplicată pentru dansatori, gimnaști și practicanți de arte marțiale.",
    level: "Sportivi din alte discipline",
  },
] as const;

export type DisciplineKey = (typeof DISCIPLINES)[number]["key"];

export const SCHEDULE = [
  { group: "Mini Acro", age: "5–7 ani", sessions: [{ day: "Luni", time: "17:00 – 18:00" }, { day: "Miercuri", time: "17:00 – 18:00" }] },
  { group: "Juniori", age: "8–12 ani", sessions: [{ day: "Marți", time: "17:00 – 18:30" }, { day: "Joi", time: "17:00 – 18:30" }, { day: "Sâmbătă", time: "10:00 – 11:30" }] },
  { group: "Adolescenți", age: "13–17 ani", sessions: [{ day: "Luni", time: "18:30 – 20:00" }, { day: "Miercuri", time: "18:30 – 20:00" }, { day: "Vineri", time: "18:00 – 19:30" }] },
  { group: "Adulți", age: "18+", sessions: [{ day: "Marți", time: "19:00 – 20:30" }, { day: "Joi", time: "19:00 – 20:30" }] },
  { group: "Modul Avansați & Biomecanică", age: "nivel avansat", sessions: [{ day: "Vineri", time: "19:30 – 21:00" }, { day: "Sâmbătă", time: "12:00 – 14:00" }] },
] as const;

export const WHY_MIB = [
  `Laborator tehnic deschis: elevi din ${PARTNER_SCHOOLS} școli partenere se antrenează aici fără să-și părăsească clubul`,
  "Acrobatică sigură, postură corectă și forță de core, pe niveluri",
  "Antrenori dedicați și tehnică sigură înaintea oricărui element nou",
  "AcroFeed și mesaje directe cu antrenorul, din aplicație",
] as const;

/** Optional WhatsApp number (international format, e.g. 40712345678) for the "Despre Noi" CTA. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
