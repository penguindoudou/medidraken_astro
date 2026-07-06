const fs = require('fs');
const path = require('path');

const descriptions = {
  "src/pages/index.astro": "Välkommen till Medidraken. Vi erbjuder akupunktur, TuiNa-massage, medicinsk Qigong och Tai Chi i Nyköping, Gnesta och Oxelösund för din hälsa och vitalitet.",
  "src/pages/artiklar.astro": "Läs våra artiklar om traditionell kinesisk medicin (TCM), akupunktur, Qigong, stresshantering och hur du uppnår naturlig balans i vardagen.",
  "src/pages/behandling/index.astro": "Minska smärta and stress med akupunktur, TuiNa-massage och oljemassage hos Medidraken i Nyköping och Gnesta. Boka din behandling idag.",
  "src/pages/behandling/akupunktur.astro": "Professionell akupunktur i Nyköping & Gnesta. Vi hjälper dig mot smärta, stress, sömnbesvär och obalanser med traditionell kinesisk medicin (TCM).",
  "src/pages/behandling/oljemassage.astro": "Avkopplande och balanserande kinesisk oljemassage i Nyköping & Gnesta. Minska stress, mjuka upp musklerna och fyll på med ny energi.",
  "src/pages/behandling/tuina-massage.astro": "Kinesisk TuiNa-massage i Nyköping & Gnesta. Effektiv medicinsk massage mot ryggont, nackspärr, ledvärk och stela muskler.",
  "src/pages/for-foretag/index.astro": "Investera i personalens hälsa. Vi erbjuder Qigong, Tai Chi, och TCM-behandling för företag i Nyköping. Förebygg stress och sjukskrivningar.",
  "src/pages/for-foretag/halsa-pa-arbetsplatsen.astro": "Hälsofrämjande insatser direkt på er arbetsplats i Nyköping och Gnesta. Medicinsk Qigong, Tai Chi och behandling anpassat för era medarbetare.",
  "src/pages/for-foretag/foretagsevent-aktiviteter.astro": "Boka en unik och stärkande aktivitet till er kick-off eller företagsevent i Nyköping. Prova på Qigong och Tai Chi med erfaren instruktör.",
  "src/pages/for-foretag/samarbeten-halsoforetag.astro": "Vi samarbetar med gym, spa och hälsoföretag i Nyköping. Utöka ert utbud med våra kurser i Qigong, Tai Chi och specialiserade behandlingar.",
  "src/pages/for-foretag/kontakt-offert.astro": "Begär offert för företagsfriskvård, events eller samarbeten i Nyköping. Vi skräddarsyr lösningar utifrån era behov och mål.",
  "src/pages/friskvardsbidrag.astro": "Använd ditt friskvårdsbidrag hos Medidraken i Nyköping & Gnesta. Våra kurser i Tai Chi och Qigong samt stressreducerande behandlingar är godkända av Skatteverket.",
  "src/pages/kontakt.astro": "Kontakta Medidraken för bokning och frågor. Vi finns i Nyköping, Gnesta och Oxelösund. Varmt välkommen till våra mottagningar.",
  "src/pages/kurser/index.astro": "Hitta kurser i Tai Chi, Medicinsk Qigong samt instruktörsutbildningar i Nyköping och Gnesta. Hitta balans, fokus och rörlighet med oss.",
  "src/pages/kurser/instruktorsutbildning.astro": "Utbilda dig till certifierad Qigong- eller Tai Chi-instruktör i Nyköping och Gnesta. Fördjupa dina kunskaper och lär dig leda andra till bättre hälsa.",
  "src/pages/kurser/medicinsk-qigong/index.astro": "Lär dig Medicinsk Qigong i Nyköping och Gnesta. Minska stress, stärk immunförsvaret och öka din livsenergi med enkla, lugna rörelser.",
  "src/pages/kurser/medicinsk-qigong/helgkurser.astro": "Fördjupa dig under en helgkurs i Medicinsk Qigong i Nyköping och Gnesta. Få verktyg för djup avslappning, återhämtning och ny energi.",
  "src/pages/kurser/medicinsk-qigong/privatundervisning.astro": "Skräddarsydd privatundervisning i Medicinsk Qigong i Nyköping och Gnesta. Anpassa träningen efter dina specifika hälsomål och behov.",
  "src/pages/kurser/tai-chi/index.astro": "Träna Tai Chi i Nyköping och Gnesta. Förbättra din balans, kroppskontroll och fokus genom meditativa, flödande rörelser.",
  "src/pages/kurser/tai-chi/helgkurser.astro": "Följ med på våra stärkande helgkurser i Tai Chi i Nyköping och Gnesta. Lär dig grunderna eller fördjupa din teknik tillsammans med oss.",
  "src/pages/kurser/tai-chi/privatundervisning.astro": "Privatlektioner i Tai Chi i Nyköping och Gnesta. Få individuell feedback och ett träningsprogram anpassat för dina personliga mål.",
  "src/pages/legal/anvandarvillkor.astro": "Användarvillkor för Medidrakens webbplats. Läs om villkoren för bokning, köp och användning av våra tjänster.",
  "src/pages/legal/cookie-policy.astro": "Information om hur Medidraken använder cookies för att förbättra användarupplevelsen och analysera webbplatstrafik.",
  "src/pages/legal/integritetspolicy.astro": "Vi värnar om din personliga integritet. Läs om hur Medidraken samlar in, hanterar och skyddar dina personuppgifter.",
  "src/pages/na-dina-halsomal/index.astro": "Vilka hälsomål har du? Vi stödjer dig i att minska stress, öka din energi, stärka immunförsvaret samt förbättra balans och rörlighet.",
  "src/pages/na-dina-halsomal/minska-stress-hitta-inre-lugn.astro": "Hitta tillbaka till lugnet och förebygg utmattning. Vi erbjuder effektiva verktyg, behandlingar och kurser för stresshantering i Nyköping & Gnesta.",
  "src/pages/na-dina-halsomal/starka-motstandskraften.astro": "Stärk din inre motståndskraft och håll dig friskare. Upptäck hur akupunktur, massage och Qigong stöder ditt immunförsvar i Nyköping & Gnesta.",
  "src/pages/om-oss.astro": "Möt teamet bakom Medidraken. Vi har över 30 års erfarenhet av Traditionell Kinesisk Medicin, akupunktur, Qigong och Tai Chi.",
  "src/pages/presentkort.astro": "Ge bort hälsa och välmående. Köp presentkort på akupunktur, TuiNa-massage, Qigong eller Tai Chi hos Medidraken i Nyköping & Gnesta.",
  "src/pages/symtom/index.astro": "Sök behandling för dina besvär. Vi hjälper dig med ryggvärk, nack- och axelsmärta, stress, huvudvärk, sömnproblem och ledvärk i Nyköping & Gnesta.",
  "src/pages/symtom/huvudvark/index.astro": "Lider du av spänningshuvudvärk, migrän eller balansproblem? Upptäck effektiva behandlingar hos Medidraken i Nyköping & Gnesta.",
  "src/pages/symtom/ledvark-idrottsskador/index.astro": "Behandling vid ledvärk, artros, tennisarmbåge och idrottsskador i Nyköping & Gnesta. Förbättra rörlighet med akupunktur och massage.",
  "src/pages/symtom/ledvark-idrottsskador/ont-i-hofter-hoftbesvar.astro": "Har du ont i höften eller dras med höftartros? Vi erbjuder anpassade behandlingar med akupunktur och massage för minskad smärta i Nyköping & Gnesta.",
  "src/pages/symtom/ledvark-idrottsskador/ont-i-knan-knabesvar.astro": "Sök hjälp för knäsmärta, stela knän eller artrosbesvär i Nyköping & Gnesta. Behandlingar som stöder läkning och rörlighet.",
  "src/pages/symtom/ledvark-idrottsskador/tennisarmbage-musarm.astro": "Bli av med smärta från tennisarmbåge, musarm eller stela handleder. Effektiv akupunktur och medicinsk massage i Nyköping & Gnesta.",
  "src/pages/symtom/nacke-axlar-skuldror/index.astro": "Ont i nacke, axlar eller skuldror? Vi erbjuder professionell akupunktur och TuiNa-massage i Nyköping & Gnesta för att lösa upp spänningar.",
  "src/pages/symtom/nacke-axlar-skuldror/nacksparr-stel-nacke.astro": "Akut hjälp vid nackspärr och stel nacke i Nyköping & Gnesta. Vi löser upp spända muskler och förbättrar rörligheten.",
  "src/pages/symtom/nacke-axlar-skuldror/ont-i-axlar-skuldror.astro": "Lindra smärta och stelhet i axlar och skuldror. Vi anpassar akupunktur och massage för att öka cirkulationen i Nyköping & Gnesta.",
  "src/pages/symtom/rygg-landrygg/index.astro": "Behandling vid ryggont, ländryggsbesvär och ischias i Nyköping & Gnesta. Vi hjälper dig att minska smärta och förbättra din rörlighet.",
  "src/pages/symtom/rygg-landrygg/akut-ryggont.astro": "Få snabb och effektiv hjälp vid akut ryggskott och ryggont i Nyköping, Gnesta och Oxelösund. Boka tid hos Medidraken.",
  "src/pages/symtom/rygg-landrygg/ischias.astro": "Dras du med ischias eller utstrålande smärta i benet? Våra behandlingar i Nyköping & Gnesta hjälper till att lindra trycket på nerven och minska smärta.",
  "src/pages/symtom/rygg-landrygg/langvarig-vark-stelhet-landrygg.astro": "Dras du med långvarig ryggvärk och stelhet i ländryggen? Vi stödjer kroppens läkning med akupunktur och medicinsk massage i Nyköping & Gnesta.",
  "src/pages/symtom/somnproblem.astro": "Svårt att sova på grund av stress eller spänningar? Få hjälp att förbättra din dygnsrytm och sömnkvalitet i Nyköping & Gnesta.",
  "src/pages/symtom/utbrandhet-trotthet.astro": "Känner du dig ständigt trött eller utmattad? Få stöd till djup återhämtning vid stress och utbrändhet hos Medidraken i Nyköping & Gnesta.",
  "src/pages/upplevelser/index.astro": "Upptäck våra stärkande upplevelser – från workshops i Qigong och Tai Chi till skräddarsydda hälsodagar och hälsoresor.",
  "src/pages/upplevelser/skraddarsydda-halsodagar.astro": "Unna dig eller din grupp en skräddarsydd hälsodag i Nyköping & Gnesta. Kombinera Qigong, avslappning och stärkande aktiviteter.",
  "src/pages/upplevelser/workshops-gruppaktiviteter.astro": "Boka en hälsofrämjande workshop i Qigong eller Tai Chi för din förening, kompisgäng eller kollegor i Nyköping & Gnesta.",
  "src/pages/upplevelser/halsoresor.astro": "Följ med på en oförglömlig hälsoresa till Kina. Upplev Qigong, Tai Chi och kinesisk kultur på plats i en inspirerande miljö."
};

const rootPath = path.resolve(__dirname, '..');

for (const [relPath, description] of Object.entries(descriptions)) {
  const fullPath = path.join(rootPath, relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`File not found: ${fullPath}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  const baseLayoutRegex = /<BaseLayout([\s\S]*?)>/;
  
  if (baseLayoutRegex.test(content)) {
    const updated = content.replace(baseLayoutRegex, (match, p1) => {
      const descPropRegex = /description\s*=\s*(?:"[^"]*"|'[^']*'|{[^}]*})/;
      if (descPropRegex.test(p1)) {
        return `<BaseLayout${p1.replace(descPropRegex, `description="${description}"`)}>`;
      } else {
        const trimmedAttributes = p1.trimRight();
        return `<BaseLayout${trimmedAttributes} description="${description}">`;
      }
    });
    
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Updated: ${relPath}`);
  } else {
    console.warn(`No <BaseLayout> tag found in ${relPath}`);
  }
}

console.log('Finished updating meta descriptions!');
