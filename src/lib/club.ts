/** Club content shown on the landing and "Despre Noi" pages. The weekly schedule lives in the `schedule` table (Dashboard → Program & Grupe). */

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

export const WHY_MIB = [
  `Laborator tehnic deschis: elevi din ${PARTNER_SCHOOLS} școli partenere se antrenează aici fără să-și părăsească clubul`,
  "Acrobatică sigură, postură corectă și forță de core, pe niveluri",
  "Antrenori dedicați și tehnică sigură înaintea oricărui element nou",
  "AcroFeed și mesaje directe cu antrenorul, din aplicație",
] as const;

/** Optional WhatsApp number (international format, e.g. 40712345678) for the "Despre Noi" CTA. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
