import fs from 'node:fs';
import path from 'node:path';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/å/g, 'a')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export function createArticleTemplate({ title, description, focusKeywords = [], tags = [] }) {
  const dateStr = new Date().toISOString().split('T')[0];
  const slug = slugify(title);

  const keywordsString = focusKeywords.map((k) => `"${k}"`).join(', ');
  const tagsString = tags.map((t) => `"${t}"`).join(', ');

  const content = `---
title: "${title}"
description: "${description}"
pubDate: ${dateStr}
author: "Medidraken"
tags: [${tagsString}]
focusKeywords: [${keywordsString}]
draft: true
---

Intro text highlighting the core topic of **${title}** with a focus on Traditionell Kinesisk Medicin (TCM) och helhetshälsa.

## Vad säger Traditionell Kinesisk Medicin (TCM)?

Beskriv orsakerna ur ett TCM-perspektiv (t.ex. obalans i organ, blockerad Qi eller blodcirkulation).

- **Orsak 1**: Blockering i meridianer.
- **Orsak 2**: Yttre faktorer som kyla, fukt eller stress.

## Hur behandlas detta med Akupunktur, Tui Na och Qigong?

1. **Akupunktur**: Återställer balans och minskar smärta.
2. **Tui Na-massage**: Mjukar upp djup muskelspänning.
3. **Medicinsk Qigong**: Stärker kroppens egen läkningsförmåga och minskar stress.

## Vad kan du göra själv i vardagen?

- Praktiska tips och mjuka rörelser.
- Andningsövningar och kostråd enligt TCM.

---

### Boka behandling eller delta i kurs i Nyköping

- [Läs mer om våra behandlingar inom akupunktur & massage](/behandling)
- [Utforska våra kurser i medicinsk Qigong och Tai Chi](/kurser/medicinsk-qigong)
- [Kontakta Medidraken för personlig rådgivning](/kontakt)
`;

  const articlesDir = path.resolve(process.cwd(), 'src/content/artiklar');
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }

  const filePath = path.join(articlesDir, `${slug}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created draft article template: ${filePath}`);
  return filePath;
}

if (process.argv[1] && process.argv[1].endsWith('generate-article-draft.js')) {
  const args = process.argv.slice(2);
  const titleArg = args[0] || 'Massage i Nyköping: Tui Na och Traditionell Kinesisk Medicin';
  const descArg = args[1] || 'Läs om terapeutisk massage och Tui Na i Nyköping för smärtlindring och avslappning.';

  createArticleTemplate({
    title: titleArg,
    description: descArg,
    focusKeywords: ['terapeutisk massage nyköping', 'massage nyköping', 'tui na nyköping'],
    tags: ['Massage', 'Nyköping', 'TCM', 'Tui Na'],
  });
}
