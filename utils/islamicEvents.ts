// utils/islamicEvents.ts

export interface IslamicEvent {
  name: string;
  month: number; // mois Hijri (1 à 12)
  day: number; // jour Hijri (1 à 30)
}

// Liste des événements religieux islamiques fixes (Hijri)
export const islamicEvents: IslamicEvent[] = [
  { name: "islamic_event.new_year", month: 1, day: 1 },
  { name: "islamic_event.mawlid", month: 3, day: 12 },
  { name: "islamic_event.ramadan_start", month: 9, day: 1 },
  { name: "islamic_event.laylat_al_qadr", month: 9, day: 27 },
  { name: "islamic_event.eid_al_fitr", month: 10, day: 1 },
  { name: "islamic_event.hajj_start", month: 12, day: 8 },
  { name: "islamic_event.eid_al_adha", month: 12, day: 10 },
  { name: "islamic_event.hajj_end", month: 12, day: 13 },
];

// Fonction pour trouver la date grégorienne correspondant à une date Hijri donnée dans une année grégorienne
export function findGregorianDateFromHijri(
  year: number,
  hijriMonth: number,
  hijriDay: number
): Date | null {
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const formatter = new Intl.DateTimeFormat("fr-u-ca-islamic", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });

  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const [dayStr, monthStr] = formatter.format(d).split("/"); // Format "jour/mois/année" en FR
    const hijriDayNum = Number(dayStr);
    const hijriMonthNum = Number(monthStr);

    if (hijriDayNum === hijriDay && hijriMonthNum === hijriMonth) {
      return new Date(d);
    }
  }

  return null;
}

// Fonction pour récupérer tous les événements islamiques pour une année grégorienne donnée
export function getIslamicEventsForYear(year: number) {
  const events = [];

  for (const event of islamicEvents) {
    const gregDate = findGregorianDateFromHijri(year, event.month, event.day);
    if (gregDate) {
      events.push({ name: event.name, date: gregDate });
    }
  }

  return events;
}
