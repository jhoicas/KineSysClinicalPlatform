#!/usr/bin/env node
/**
 * Importa la Tabla de Composición de Alimentos (TCA) a kinesys.food_catalog.
 *
 * Uso:
 *   node backend/scripts/import_food_catalog.mjs ruta/al/archivo.csv
 *
 * Variables de entorno:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Detecta delimitador (coma o punto y coma) y mapea encabezados habituales
 * (codigo, nombre, energia_kcal, proteina, grasa, carbohidratos, fibra, etc.).
 */
import fs from 'node:fs';
import path from 'node:path';

const CSV_PATH = process.argv[2];
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!CSV_PATH) {
  console.error('Uso: node backend/scripts/import_food_catalog.mjs <archivo.csv>');
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const HEADER_MAP = {
  id: ['id', 'codigo', 'cod', 'code', 'alimento_id'],
  name: ['name', 'nombre', 'alimento', 'nombre_del_alimento', 'nombrealimento'],
  energy_kcal: ['energy_kcal', 'energia', 'energia_kcal', 'kcal', 'energia_kcal_100g', 'calorias'],
  protein_g: ['protein_g', 'proteina', 'proteinas', 'proteina_g', 'proteina_total'],
  lipids_g: ['lipids_g', 'grasa', 'grasas', 'lipidos', 'grasa_total', 'grasa_g', 'lipidos_g'],
  carbs_total_g: [
    'carbs_total_g',
    'carbohidratos',
    'carbohidratos_totales',
    'carbohidratos_totales_g',
    'cho',
    'cho_g',
    'hidratos',
    'cho_disponibles',
  ],
  dietary_fiber_g: ['dietary_fiber_g', 'fibra', 'fibra_dietaria', 'fibra_dietaria_g', 'fibra_dietetica', 'fibra_g'],
  calcium_mg: ['calcium_mg', 'calcio', 'calcio_mg', 'ca'],
  iron_mg: ['iron_mg', 'hierro', 'hierro_mg', 'fe'],
  sodium_mg: ['sodium_mg', 'sodio', 'sodio_mg', 'na'],
  saturated_fat_g: ['saturated_fat_g', 'grasa_saturada', 'grasas_saturadas', 'ags', 'saturados'],
  cholesterol_mg: ['cholesterol_mg', 'colesterol', 'colesterol_mg'],
  edible_portion_percentage: [
    'edible_portion_percentage',
    'parte_comestible',
    'porcion_comestible',
    'pc',
    'parte_comestible_pct',
  ],
};

function normalizeHeader(h) {
  return String(h || '')
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function detectDelimiter(headerLine) {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const delim = detectDelimiter(src.split('\n')[0] || '');

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    const next = src[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

function parseNumber(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s || s === '-' || s === 'NA' || s === 'N/A' || s === 'nd' || s === 'ND' || s === '*') return null;
  s = s.replace(/%/g, '').replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function resolveColumn(headers, aliases) {
  for (const alias of aliases) {
    const idx = headers.indexOf(alias);
    if (idx >= 0) return idx;
  }
  return -1;
}

const absPath = path.resolve(CSV_PATH);
if (!fs.existsSync(absPath)) {
  console.error(`No se encontró el CSV: ${absPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absPath, 'utf8');
const table = parseCsv(raw);
if (table.length < 2) {
  console.error('El CSV no tiene filas de datos.');
  process.exit(1);
}

function headersFrom(row) {
  return row.map(normalizeHeader);
}

function columnsFrom(headers) {
  const mapped = {};
  for (const [field, aliases] of Object.entries(HEADER_MAP)) {
    mapped[field] = resolveColumn(headers, aliases);
  }
  return mapped;
}

let headerRowIndex = 0;
let headers = headersFrom(table[0]);
let col = columnsFrom(headers);
for (let i = 0; i < Math.min(5, table.length); i += 1) {
  const candidate = columnsFrom(headersFrom(table[i]));
  if (candidate.name >= 0 && candidate.id >= 0) {
    headerRowIndex = i;
    headers = headersFrom(table[i]);
    col = candidate;
    break;
  }
}

if (col.name < 0) {
  console.error('No se encontró columna de nombre. Encabezados:', headers.join(', '));
  process.exit(1);
}

console.log(`Fila de encabezados: ${headerRowIndex + 1}`);

function pick(row, field) {
  const idx = col[field];
  if (idx < 0) return undefined;
  return row[idx];
}

const records = [];
for (let i = headerRowIndex + 1; i < table.length; i += 1) {
  const row = table[i];
  const name = String(pick(row, 'name') || '').trim();
  if (!name) continue;
  const codeRaw = pick(row, 'id');
  const id = String(codeRaw || '').trim() || `TCA${String(i).padStart(4, '0')}`;
  records.push({
    id: id.slice(0, 50),
    name: name.slice(0, 255),
    energy_kcal: parseNumber(pick(row, 'energy_kcal')),
    protein_g: parseNumber(pick(row, 'protein_g')),
    lipids_g: parseNumber(pick(row, 'lipids_g')),
    carbs_total_g: parseNumber(pick(row, 'carbs_total_g')),
    dietary_fiber_g: parseNumber(pick(row, 'dietary_fiber_g')),
    calcium_mg: parseNumber(pick(row, 'calcium_mg')),
    iron_mg: parseNumber(pick(row, 'iron_mg')),
    sodium_mg: parseNumber(pick(row, 'sodium_mg')),
    saturated_fat_g: parseNumber(pick(row, 'saturated_fat_g')),
    cholesterol_mg: parseNumber(pick(row, 'cholesterol_mg')),
    edible_portion_percentage: parseNumber(pick(row, 'edible_portion_percentage')),
    is_active: true,
  });
}

console.log(`Filas a importar: ${records.length}`);

async function upsertBatch(batch) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/food_catalog?on_conflict=id`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'kinesys',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

const CHUNK = 100;
for (let i = 0; i < records.length; i += CHUNK) {
  const batch = records.slice(i, i + CHUNK);
  await upsertBatch(batch);
  console.log(`Upsert ${Math.min(i + CHUNK, records.length)} / ${records.length}`);
}

console.log('Importación TCA completada.');
