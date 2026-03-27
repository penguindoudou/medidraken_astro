export type Course = {
  title: string;
  /** Vilken typ av kurs det är, t.ex. "Helgkurs" eller "Terminskurs". Visas ex. på index-sidan. */
  format: string;
  location: string;
  date: string;
  times: string;
  /** Denna datumsträng används för att avgöra om kursen är i framtiden (format: YYYY-MM-DD). */
  lastDate: string;
};

// ==========================================
// Medicinsk Qigong
// ==========================================
export const coursesQigong: Course[] = [
  // Exempel på en framtida kurs (Helgkurs-format används nu överallt):
  {
    title: 'Grundkurs',
    format: 'Helgkurs',
    location: 'Nyköping',
    date: '14-15 Okt',
    times: '10:00 - 15:00',
    lastDate: '2026-10-15',
  },
];

// ==========================================
// Tai Chi
// ==========================================
export const coursesTaiChi: Course[] = [
  {
    title: 'Grundkurs',
    format: 'Helgkurs',
    location: 'Nyköping',
    date: '20-21 Juni',
    times: '10:00 - 15:00',
    lastDate: '2026-10-15',
  },

];
