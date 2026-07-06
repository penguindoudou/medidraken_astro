import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple env variable parser for local development
function getEnvVariable(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if (key === name) {
            // strip quotes if any
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
            return val;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading .env file:", e);
  }
  return undefined;
}

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length <= 1) return [];
  
  // Parse headers
  const headerLine = lines[0];
  const headers = [];
  let currentHeader = '';
  let inQuotes = false;
  
  for (let i = 0; i < headerLine.length; i++) {
    const char = headerLine[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(currentHeader.trim().toLowerCase());
      currentHeader = '';
    } else {
      currentHeader += char;
    }
  }
  headers.push(currentHeader.trim().toLowerCase());

  const results = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = [];
    let currentVal = '';
    inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim());
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim());

    const rowObj = {};
    headers.forEach((header, index) => {
      rowObj[header] = values[index] || '';
    });
    results.push(rowObj);
  }
  return results;
}

function mapRowToCourse(row) {
  return {
    title: row.title || '',
    format: row.format || '',
    location: row.location || '',
    date: row.date || '',
    times: row.times || row.time || '',
    lastDate: row.lastdate || row.last_date || '',
  };
}

async function main() {
  const sheetUrl = getEnvVariable('PUBLIC_COURSES_SHEET_URL') || getEnvVariable('COURSES_SHEET_URL');
  const outputPath = path.join(process.cwd(), 'src', 'data', 'courses.json');

  if (!sheetUrl) {
    console.log("No PUBLIC_COURSES_SHEET_URL set. Keeping existing courses.json.");
    return;
  }

  console.log("Fetching courses from Google Sheets...");
  try {
    const res = await fetch(sheetUrl);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const csvText = await res.text();
    const rows = parseCSV(csvText);

    const qigongRows = rows.filter(r => r.type === 'qigong');
    const taichiRows = rows.filter(r => r.type === 'taichi' || r.type === 'tai chi');

    if (qigongRows.length === 0 && taichiRows.length === 0) {
      console.warn("Parsed CSV but found no courses matching type 'qigong' or 'taichi'.");
      return;
    }

    const coursesData = {
      qigong: qigongRows.map(mapRowToCourse),
      taichi: taichiRows.map(mapRowToCourse),
    };

    fs.writeFileSync(outputPath, JSON.stringify(coursesData, null, 2), 'utf8');
    console.log(`Successfully wrote ${coursesData.qigong.length} Qigong and ${coursesData.taichi.length} Tai Chi courses to src/data/courses.json`);
  } catch (error) {
    console.error("Failed to fetch courses from Google Sheets. Keeping existing courses.json. Error:", error.message);
  }
}

main();
