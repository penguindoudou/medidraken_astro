import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sitemapPath = path.join(__dirname, '../../sitemap4.txt');
const menuConfigPath = path.join(__dirname, '../../menu-config.json');
const pagesDir = path.join(__dirname, '../src/pages');
const dataDir = path.join(__dirname, '../src/data');

const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
const menuConfig = JSON.parse(fs.readFileSync(menuConfigPath, 'utf8'));

const lines = sitemapContent.split(/\r?\n/);

const primaryMenu = [];
const footerMenu = [];

let currentLevel1 = null;
let currentLevel2 = null;

const createPage = (slug, title) => {
    const actualSlug = slug === 'startsida' ? 'index' : slug;
    const filePath = path.join(pagesDir, `${actualSlug}.astro`);

    if (!fs.existsSync(filePath)) {
        const content = `---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="${title}">
    <main class="container-base section-standard">
        <h1 class="text-brand-earth">${title}</h1>
        <p class="mt-4">Innehåll under uppbyggnad...</p>
    </main>
</BaseLayout>
`;
        fs.writeFileSync(filePath, content);
        console.log(`Created ${filePath}`);
    }
};

lines.forEach(line => {
    if (!line.trim() || line.startsWith('#')) return;

    const match = line.match(/^\s*(\*+)\s+\[([^\]]+)\]\s+title="([^"]+)"\s*(.*)$/);
    if (!match) return;

    const levelCount = match[1].length;
    const slug = match[2];
    const originalTitle = match[3];
    const flags = match[4].trim().split(' ');

    const isFooter = flags.includes('footer');
    const isVirtual = flags.includes('virtual');

    let title = originalTitle;
    if (isFooter && menuConfig.footer?.label_map?.[originalTitle]) {
        title = menuConfig.footer.label_map[originalTitle];
    } else if (!isFooter && menuConfig.primary?.label_map?.[originalTitle]) {
        title = menuConfig.primary.label_map[originalTitle];
    }

    const pathUrl = slug === 'startsida' ? '/' : `/${slug}/`;

    if (!isVirtual) {
        createPage(slug, originalTitle); // Use original title for the h1, label map for the menu
    }

    const menuItem = { title, link: pathUrl, children: [] };

    if (isFooter) {
        footerMenu.push(menuItem);
    } else {
        if (levelCount === 1) {
            primaryMenu.push(menuItem);
            currentLevel1 = menuItem;
            currentLevel2 = null;
        } else if (levelCount === 2 && currentLevel1) {
            currentLevel1.children.push(menuItem);
            currentLevel2 = menuItem;
        } else if (levelCount === 3 && currentLevel2) {
            currentLevel2.children.push(menuItem);
        }
    }
});

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}
const menuTsContent = `
export const primaryMenu = ${JSON.stringify({ items: primaryMenu }, null, 2)};
export const footerMenu = ${JSON.stringify({ items: footerMenu }, null, 2)};
`;
fs.writeFileSync(path.join(dataDir, 'menu.ts'), menuTsContent);
console.log('Created src/data/menu.ts');
