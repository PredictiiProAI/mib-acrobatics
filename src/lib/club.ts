/** Club content shown on the landing page. Edit here to update texts and the training schedule. */

export const DISCIPLINES = [
  { key: "tumbling", title: "Acrobatică la sol", text: "Rondade, flic-flacuri și salturi pe pistă — fundația oricărui acrobat.", level: "Toate nivelurile" },
  { key: "trampoline", title: "Trambulină", text: "Rotații, șuruburi și control aerian în siguranță, cu progresie pe etape.", level: "Începători – avansați" },
  { key: "partner", title: "Acro în perechi și grup", text: "Echilibre, piramide și aruncări — forță, încredere și sincronizare.", level: "Intermediar" },
  { key: "handstand", title: "Echilibru & stând pe mâini", text: "Linie corectă, forță de umeri și control al corpului cu capul în jos.", level: "Toate nivelurile" },
  { key: "flex", title: "Flexibilitate & mobilitate", text: "Spagaturi, punți și mobilitate activă pentru elemente curate și fără accidentări.", level: "Toate nivelurile" },
  { key: "show", title: "Show & competiție", text: "Coregrafii, momente de spectacol și pregătire pentru concursuri.", level: "Avansați" },
] as const;

export type DisciplineKey = (typeof DISCIPLINES)[number]["key"];

export const SCHEDULE = [
  { group: "Mini Acro", age: "5–7 ani", sessions: [{ day: "Luni", time: "17:00 – 18:00" }, { day: "Miercuri", time: "17:00 – 18:00" }] },
  { group: "Juniori", age: "8–12 ani", sessions: [{ day: "Marți", time: "17:00 – 18:30" }, { day: "Joi", time: "17:00 – 18:30" }, { day: "Sâmbătă", time: "10:00 – 11:30" }] },
  { group: "Adolescenți", age: "13–17 ani", sessions: [{ day: "Luni", time: "18:30 – 20:00" }, { day: "Miercuri", time: "18:30 – 20:00" }, { day: "Vineri", time: "18:00 – 19:30" }] },
  { group: "Adulți", age: "18+", sessions: [{ day: "Marți", time: "19:00 – 20:30" }, { day: "Joi", time: "19:00 – 20:30" }] },
  { group: "Lot competițional", age: "selecție", sessions: [{ day: "Luni – Vineri", time: "după program" }, { day: "Sâmbătă", time: "12:00 – 14:00" }] },
] as const;

export const WHY_MIB = [
  "Grupe pe vârste și niveluri, cu progresie clară",
  "Antrenori dedicați și tehnică sigură înaintea oricărui element nou",
  "AcroFeed: urmărești antrenamentele și progresul echipei",
  "Mesaje directe cu antrenorul, din aplicație",
] as const;
