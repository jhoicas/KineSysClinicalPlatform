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
 * Detecta delimitador (coma o punto y coma) y mapea encabezados TCA_2018.
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
  analyzed_part: ['analyzed_part', 'parte_analizada', 'parteanalizada'],
  moisture_g: ['moisture_g', 'humedad_g', 'humedad'],
  energy_kcal: ['energy_kcal', 'energia', 'energia_kcal', 'kcal', 'energia_kcal_100g', 'calorias'],
  energy_kj: ['energy_kj', 'energia_kj', 'kj'],
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
  ],
  carbs_available_g: [
    'carbs_available_g',
    'carbohidratos_disponibles_g',
    'cho_disponibles',
    'carbohidratos_disponibles',
  ],
  dietary_fiber_g: ['dietary_fiber_g', 'fibra', 'fibra_dietaria', 'fibra_dietaria_g', 'fibra_dietetica', 'fibra_g'],
  ash_g: ['ash_g', 'cenizas_g', 'cenizas'],
  calcium_mg: ['calcium_mg', 'calcio', 'calcio_mg', 'ca'],
  phosphorus_mg: ['phosphorus_mg', 'fosforo_mg', 'fosforo', 'p'],
  iron_mg: ['iron_mg', 'hierro', 'hierro_mg', 'fe'],
  iodine_mg: ['iodine_mg', 'yodo_mg', 'yodo', 'i'],
  zinc_mg: ['zinc_mg', 'zinc', 'zn'],
  magnesium_mg: ['magnesium_mg', 'magnesio_mg', 'magnesio', 'mg'],
  sodium_mg: ['sodium_mg', 'sodio', 'sodio_mg', 'na'],
  potassium_mg: ['potassium_mg', 'potasio_mg', 'potasio', 'k'],
  thiamine_mg: ['thiamine_mg', 'tiamina_mg', 'tiamina', 'vitamina_b1', 'b1'],
  riboflavin_mg: ['riboflavin_mg', 'riboflavina_mg', 'riboflavina', 'vitamina_b2', 'b2'],
  niacin_mg: ['niacin_mg', 'niacina_mg', 'niacina', 'vitamina_b3', 'b3'],
  folate_mcg: ['folate_mcg', 'folatos_mcg', 'folatos', 'folato'],
  vitamin_b12_mcg: ['vitamin_b12_mcg', 'vitamina_b12_mcg', 'vitamina_b12', 'b12'],
  vitamin_c_mg: ['vitamin_c_mg', 'vitamina_c_mg', 'vitamina_c', 'vit_c'],
  vitamin_a_er: ['vitamin_a_er', 'vitamina_a_er', 'vitamina_a', 'vit_a'],
  saturated_fat_g: ['saturated_fat_g', 'grasa_saturada', 'grasas_saturadas', 'ags', 'saturados'],
  monounsaturated_fat_g: [
    'monounsaturated_fat_g',
    'grasa_monoinsaturada_g',
    'grasas_monoinsaturadas',
    'agmi',
  ],
  polyunsaturated_fat_g: [
    'polyunsaturated_fat_g',
    'grasa_poliinsaturada_g',
    'grasas_poliinsaturadas',
    'agpi',
  ],
  cholesterol_mg: ['cholesterol_mg', 'colesterol', 'colesterol_mg'],
  edible_portion_percentage: [
    'edible_portion_percentage',
    'parte_comestible',
    'porcion_comestible',
    'pc',
    'parte_comestible_pct',
  ],
  purchase_unit: [
    'purchase_unit',
    'unidad_de_medida_de_compra_g_o_cc',
    'unidad_compra',
    'unidad_de_medida',
  ],
  purchase_price: ['purchase_price', 'precio', 'precio_compra'],
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

function textField(row, field) {
  return String(pick(row, field) || '').trim() || null;
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
    analyzed_part: textField(row, 'analyzed_part'),
    moisture_g: parseNumber(pick(row, 'moisture_g')),
    energy_kcal: parseNumber(pick(row, 'energy_kcal')),
    energy_kj: parseNumber(pick(row, 'energy_kj')),
    protein_g: parseNumber(pick(row, 'protein_g')),
    lipids_g: parseNumber(pick(row, 'lipids_g')),
    carbs_total_g: parseNumber(pick(row, 'carbs_total_g')),
    carbs_available_g: parseNumber(pick(row, 'carbs_available_g')),
    dietary_fiber_g: parseNumber(pick(row, 'dietary_fiber_g')),
    ash_g: parseNumber(pick(row, 'ash_g')),
    calcium_mg: parseNumber(pick(row, 'calcium_mg')),
    phosphorus_mg: parseNumber(pick(row, 'phosphorus_mg')),
    iron_mg: parseNumber(pick(row, 'iron_mg')),
    iodine_mg: parseNumber(pick(row, 'iodine_mg')),
    zinc_mg: parseNumber(pick(row, 'zinc_mg')),
    magnesium_mg: parseNumber(pick(row, 'magnesium_mg')),
    sodium_mg: parseNumber(pick(row, 'sodium_mg')),
    potassium_mg: parseNumber(pick(row, 'potassium_mg')),
    thiamine_mg: parseNumber(pick(row, 'thiamine_mg')),
    riboflavin_mg: parseNumber(pick(row, 'riboflavin_mg')),
    niacin_mg: parseNumber(pick(row, 'niacin_mg')),
    folate_mcg: parseNumber(pick(row, 'folate_mcg')),
    vitamin_b12_mcg: parseNumber(pick(row, 'vitamin_b12_mcg')),
    vitamin_c_mg: parseNumber(pick(row, 'vitamin_c_mg')),
    vitamin_a_er: parseNumber(pick(row, 'vitamin_a_er')),
    saturated_fat_g: parseNumber(pick(row, 'saturated_fat_g')),
    monounsaturated_fat_g: parseNumber(pick(row, 'monounsaturated_fat_g')),
    polyunsaturated_fat_g: parseNumber(pick(row, 'polyunsaturated_fat_g')),
    cholesterol_mg: parseNumber(pick(row, 'cholesterol_mg')),
    edible_portion_percentage: parseNumber(pick(row, 'edible_portion_percentage')),
    purchase_unit: textField(row, 'purchase_unit'),
    purchase_price: parseNumber(pick(row, 'purchase_price')),
    is_active: true,
  });
}

// Evita conflictos 21000 en el mismo lote: un solo registro por id
const uniqueRecords = Array.from(new Map(records.map((r) => [r.id, r])).values());
const dropped = records.length - uniqueRecords.length;
if (dropped > 0) {
  console.log(`Duplicados por id omitidos: ${dropped}`);
}

console.log(`Filas a importar: ${uniqueRecords.length}`);

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
for (let i = 0; i < uniqueRecords.length; i += CHUNK) {
  const batch = uniqueRecords.slice(i, i + CHUNK);
  await upsertBatch(batch);
  console.log(`Upsert ${Math.min(i + CHUNK, uniqueRecords.length)} / ${uniqueRecords.length}`);
}

console.log('Importación TCA completada.');
