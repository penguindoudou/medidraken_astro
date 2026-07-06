import coursesData from './courses.json';

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

export const coursesQigong: Course[] = coursesData.qigong;
export const coursesTaiChi: Course[] = coursesData.taichi;


