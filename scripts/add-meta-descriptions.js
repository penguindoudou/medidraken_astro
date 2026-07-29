#!/usr/bin/env node
/**
 * add-meta-descriptions.js
 * Adds description="" prop to <BaseLayout> for all 48 pages from the implementation plan.
 * Safe to re-run: always overwrites existing description prop if present.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../src/pages');

const pages = [
  {
    file: 'index.astro',
    description: 'Välkommen till Medidraken. Vi erbjuder akupunktur, Medicinsk Kinesisk Massage, Medicinsk Qigong och Tai Chi i Nyköping, Gnesta och Oxelösund för din hälsa och vitalitet.',
  },
  {
    file: 'artiklar.astro',
    description: 'Läs våra artiklar om traditionell kinesisk medicin (TCM), akupunktur, Qigong, stresshantering och hur du uppnår naturlig balans i vardagen.',
  },
  {
    file: 'behandling/index.astro',
    description: 'Minska smärta and stress med akupunktur, Medicinsk Kinesisk Massage och oljemassage hos Medidraken i Nyköping och Gnesta. Boka din behandling idag.',
  },
  {
    file: 'behandling/akupunktur.astro',
    description: 'Professionell akupunktur i Nyköping & Gnesta. Vi hjälper dig mot smärta, stress, sömnbesvär och obalanser med traditionell kinesisk medicin (TCM).',
  },
  {
    file: 'behandling/oljemassage.astro',
    description: 'Avkopplande och balanserande kinesisk oljemassage i Nyköping & Gnesta. Minska stress, mjuka upp musklerna och fyll på med ny energi.',
  },
  {
    file: 'behandling/medicinsk-kinesisk-massage.astro',
    description: 'Medicinsk Kinesisk Massage (TuiNa) i Nyköping & Gnesta. Effektiv medicinsk massage mot ryggont, nackspärr, ledvärk och stela muskler.',
  },
  {
    file: 'for-foretag/index.astro',
    description: 'Investera i personalens hälsa. Vi erbjuder Qigong, Tai Chi, och TCM-behandling för företag i Nyköping. Förebygg stress och sjukskrivningar.',
  },
  {
    file: 'for-foretag/halsa-pa-arbetsplatsen.astro',
    description: 'Hälsofrämjande insatser direkt på er arbetsplats i Nyköping och Gnesta. Medicinsk Qigong, Tai Chi och behandling anpassat för era medarbetare.',
  },
  {
    file: 'for-foretag/foretagsevent-aktiviteter.astro',
    description: 'Boka en unik och stärkande aktivitet till er kick-off eller företagsevent i Nyköping. Prova på Qigong och Tai Chi med erfaren instruktör.',
  },
  {
    file: 'for-foretag/samarbeten-halsoforetag.astro',
    description: 'Vi samarbetar med gym, spa och hälsoföretag i Nyköping. Utöka ert utbud med våra kurser i Qigong, Tai Chi och specialiserade behandlingar.',
  },
  {
    file: 'for-foretag/kontakt-offert.astro',
    description: 'Begär offert för företagsfriskvård, events eller samarbeten i Nyköping. Vi skräddarsyr lösningar utifrån era behov och mål.',
  },
  {
    file: 'friskvardsbidrag.astro',
    description: 'Använd ditt friskvårdsbidrag hos Medidraken i Nyköping & Gnesta. Våra kurser i Tai Chi och Qigong samt stressreducerande behandlingar är godkända av Skatteverket.',
  },
  {
    file: 'kontakt.astro',
    description: 'Kontakta Medidraken för bokning och frågor. Vi finns i Nyköping, Gnesta och Oxelösund. Varmt välkommen till våra mottagningar.',
  },
  {
    file: 'kurser/index.astro',
    description: 'Hitta kurser i Tai Chi, Medicinsk Qigong samt instruktörsutbildningar i Nyköping och Gnesta. Hitta balans, fokus och rörlighet med oss.',
  },
  {
    file: 'kurser/instruktorsutbildning.astro',
    description: 'Utbilda dig till certifierad Qigong- eller Tai Chi-instruktör i Nyköping och Gnesta. Fördjupa dina kunskaper och lär dig leda andra till bättre hälsa.',
  },
  {
    file: 'kurser/medicinsk-qigong/index.astro',
    description: 'Lär dig Medicinsk Qigong i Nyköping och Gnesta. Minska stress, stärk immunförsvaret och öka din livsenergi med enkla, lugna rörelser.',
  },
  {
    file: 'kurser/medicinsk-qigong/helgkurser.astro',
    description: 'Fördjupa dig under en helgkurs i Medicinsk Qigong i Nyköping och Gnesta. Få verktyg för djup avslappning, återhämtning och ny energi.',
  },
  {
    file: 'kurser/medicinsk-qigong/privatundervisning.astro',
    description: 'Skräddarsydd privatundervisning i Medicinsk Qigong i Nyköping och Gnesta. Anpassa träningen efter dina specifika hälsomål och behov.',
  },
  {
    file: 'kurser/tai-chi/index.astro',
    description: 'Träna Tai Chi i Nyköping och Gnesta. Förbättra din balans, kroppskontroll och fokus genom meditativa, flödande rörelser.',
  },
  {
    file: 'kurser/tai-chi/helgkurser.astro',
    description: 'Följ med på våra stärkande helgkurser i Tai Chi i Nyköping och Gnesta. Lär dig grunderna eller fördjupa din teknik tillsammans med oss.',
  },
  {
    file: 'kurser/tai-chi/privatundervisning.astro',
    description: 'Privatlektioner i Tai Chi i Nyköping och Gnesta. Få individuell feedback och ett träningsprogram anpassat för dina personliga mål.',
  },
  {
    file: 'legal/anvandarvillkor.astro',
    description: 'Användarvillkor för Medidrakens webbplats. Läs om villkoren för bokning, köp och användning av våra tjänster.',
  },
  {
    file: 'legal/cookie-policy.astro',
    description: 'Information om hur Medidraken använder cookies för att förbättra användarupplevelsen och analysera webbplatstrafik.',
  },
  {
    file: 'legal/integritetspolicy.astro',
    description: 'Vi värnar om din personliga integritet. Läs om hur Medidraken samlar in, hanterar och skyddar dina personuppgifter.',
  },
  {
    file: 'na-dina-halsomal/index.astro',
    description: 'Vilka hälsomål har du? Vi stödjer dig i att minska stress, öka din energi, stärka immunförsvaret samt förbättra balans och rörlighet.',
  },
  {
    file: 'na-dina-halsomal/minska-stress-hitta-inre-lugn.astro',
    description: 'Hitta tillbaka till lugnet och förebygg utmattning. Vi erbjuder effektiva verktyg, behandlingar och kurser för stresshantering i Nyköping & Gnesta.',
  },
  {
    file: 'na-dina-halsomal/starka-motstandskraften.astro',
    description: 'Stärk din inre motståndskraft och håll dig friskare. Upptäck hur akupunktur, massage och Qigong stöder ditt immunförsvar i Nyköping & Gnesta.',
  },
  {
    file: 'om-oss.astro',
    description: 'Möt teamet bakom Medidraken. Vi har över 30 års erfarenhet av Traditionell Kinesisk Medicin, akupunktur, Qigong och Tai Chi.',
  },
  {
    file: 'presentkort.astro',
    description: 'Ge bort hälsa och välmående. Köp presentkort på akupunktur, Medicinsk Kinesisk Massage, Qigong eller Tai Chi hos Medidraken i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/index.astro',
    description: 'Sök behandling för dina besvär. Vi hjälper dig med ryggvärk, nack- och axelsmärta, stress, huvudvärk, sömnproblem och ledvärk i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/huvudvark/index.astro',
    description: 'Lider du av spänningshuvudvärk, migrän eller balansproblem? Upptäck effektiva behandlingar hos Medidraken i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/ledvark-idrottsskador/index.astro',
    description: 'Behandling vid ledvärk, artros, tennisarmbåge och idrottsskador i Nyköping & Gnesta. Förbättra rörlighet med akupunktur och massage.',
  },
  {
    file: 'symtom/ledvark-idrottsskador/ont-i-hofter-hoftbesvar.astro',
    description: 'Har du ont i höften eller dras med höftartros? Vi erbjuder anpassade behandlingar med akupunktur och massage för minskad smärta i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/ledvark-idrottsskador/ont-i-knan-knabesvar.astro',
    description: 'Sök hjälp för knäsmärta, stela knän eller artrosbesvär i Nyköping & Gnesta. Behandlingar som stöder läkning och rörlighet.',
  },
  {
    file: 'symtom/ledvark-idrottsskador/tennisarmbage-musarm.astro',
    description: 'Bli av med smärta från tennisarmbåge, musarm eller stela handleder. Effektiv akupunktur och medicinsk massage i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/nacke-axlar-skuldror/index.astro',
    description: 'Ont i nacke, axlar eller skuldror? Vi erbjuder professionell akupunktur och Medicinsk Kinesisk Massage i Nyköping & Gnesta för att lösa upp spänningar.',
  },
  {
    file: 'symtom/nacke-axlar-skuldror/nacksparr-stel-nacke.astro',
    description: 'Akut hjälp vid nackspärr och stel nacke i Nyköping & Gnesta. Vi löser upp spända muskler och förbättrar rörligheten.',
  },
  {
    file: 'symtom/nacke-axlar-skuldror/ont-i-axlar-skuldror.astro',
    description: 'Lindra smärta och stelhet i axlar och skuldror. Vi anpassar akupunktur och massage för att öka cirkulationen i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/rygg-landrygg/index.astro',
    description: 'Behandling vid ryggont, ländryggsbesvär och ischias i Nyköping & Gnesta. Vi hjälper dig att minska smärta och förbättra din rörlighet.',
  },
  {
    file: 'symtom/rygg-landrygg/akut-ryggont.astro',
    description: 'Få snabb och effektiv hjälp vid akut ryggskott och ryggont i Nyköping, Gnesta och Oxelösund. Boka tid hos Medidraken.',
  },
  {
    file: 'symtom/rygg-landrygg/ischias.astro',
    description: 'Dras du med ischias eller utstrålande smärta i benet? Våra behandlingar i Nyköping & Gnesta hjälper till att lindra trycket på nerven och minska smärta.',
  },
  {
    file: 'symtom/rygg-landrygg/langvarig-vark-stelhet-landrygg.astro',
    description: 'Dras du med långvarig ryggvärk och stelhet i ländryggen? Vi stödjer kroppens läkning med akupunktur och medicinsk massage i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/somnproblem.astro',
    description: 'Svårt att sova på grund av stress eller spänningar? Få hjälp att förbättra din dygnsrytm och sömnkvalitet i Nyköping & Gnesta.',
  },
  {
    file: 'symtom/utbrandhet-trotthet.astro',
    description: 'Känner du dig ständigt trött eller utmattad? Få stöd till djup återhämtning vid stress och utbrändhet hos Medidraken i Nyköping & Gnesta.',
  },
  {
    file: 'upplevelser/index.astro',
    description: 'Upptäck våra stärkande upplevelser – från workshops i Qigong och Tai Chi till skräddarsydda hälsodagar och hälsoresor.',
  },
  {
    file: 'upplevelser/skraddarsydda-halsodagar.astro',
    description: 'Unna dig eller din grupp en skräddarsydd hälsodag i Nyköping & Gnesta. Kombinera Qigong, avslappning och stärkande aktiviteter.',
  },
  {
    file: 'upplevelser/workshops-gruppaktiviteter.astro',
    description: 'Boka en hälsofrämjande workshop i Qigong eller Tai Chi för din förening, kompisgäng eller kollegor i Nyköping & Gnesta.',
  },
  {
    file: 'upplevelser/halsoresor.astro',
    description: 'Följ med på en oförglömlig hälsoresa till Kina. Upplev Qigong, Tai Chi och kinesisk kultur på plats i en inspirerande miljö.',
  },
];

let updatedCount = 0;
let skippedCount = 0;
const errors = [];

for (const { file, description } of pages) {
  const filePath = resolve(ROOT, file);
  let content;

  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    errors.push(`MISSING: ${file}`);
    continue;
  }

  // Escape description for use inside double-quoted JSX attribute
  const escapedDesc = description.replace(/"/g, '&quot;');

  // Regex: matches <BaseLayout with optional existing description prop, captures everything up to the closing >
  // Strategy: find the <BaseLayout ... > opening tag and inject/replace description prop

  // Check if description already set correctly
  const descAttrRegex = /description="[^"]*"/;

  // Find the BaseLayout opening tag (handles multiline)
  const baseLayoutTagRegex = /(<BaseLayout\b[^>]*)(>)/s;
  const match = content.match(baseLayoutTagRegex);

  if (!match) {
    errors.push(`NO <BaseLayout> TAG: ${file}`);
    continue;
  }

  const [fullMatch, tagOpen, tagClose] = match;
  const newDescAttr = `description="${escapedDesc}"`;

  let newTagOpen;
  if (descAttrRegex.test(tagOpen)) {
    // Replace existing description
    newTagOpen = tagOpen.replace(descAttrRegex, newDescAttr);
  } else {
    // Inject before closing >
    newTagOpen = tagOpen.trimEnd() + `\n  ${newDescAttr}`;
  }

  const newTag = newTagOpen + tagClose;
  const newContent = content.replace(baseLayoutTagRegex, newTag);

  if (newContent === content) {
    skippedCount++;
    console.log(`  UNCHANGED: ${file}`);
  } else {
    writeFileSync(filePath, newContent, 'utf-8');
    updatedCount++;
    console.log(`  UPDATED:   ${file}`);
  }
}

console.log(`\nDone. Updated: ${updatedCount}, Unchanged: ${skippedCount}, Errors: ${errors.length}`);
if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach(e => console.log('  ' + e));
}
