-- 007_catalogo_alimentos.sql
-- Catálogo maestro TCA (valores por 100 g). Lectura global autenticada.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS kinesys.food_catalog (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    energy_kcal NUMERIC(10,2),
    protein_g NUMERIC(10,2),
    lipids_g NUMERIC(10,2),
    carbs_total_g NUMERIC(10,2),
    dietary_fiber_g NUMERIC(10,2),
    calcium_mg NUMERIC(10,2),
    iron_mg NUMERIC(10,2),
    sodium_mg NUMERIC(10,2),
    saturated_fat_g NUMERIC(10,2),
    cholesterol_mg NUMERIC(10,2),
    edible_portion_percentage NUMERIC(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_catalog_name_fts
    ON kinesys.food_catalog
    USING GIN (to_tsvector('spanish', name));

CREATE INDEX IF NOT EXISTS idx_food_catalog_name_trgm
    ON kinesys.food_catalog
    USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_food_catalog_active
    ON kinesys.food_catalog (is_active)
    WHERE is_active IS TRUE;

ALTER TABLE kinesys.food_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS food_catalog_select ON kinesys.food_catalog;
CREATE POLICY food_catalog_select ON kinesys.food_catalog
    FOR SELECT TO authenticated
    USING (is_active IS TRUE);

GRANT SELECT ON kinesys.food_catalog TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON kinesys.food_catalog TO service_role;
