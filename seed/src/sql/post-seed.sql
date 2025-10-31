DROP SCHEMA IF EXISTS data_analytics CASCADE;
CREATE SCHEMA data_analytics;

-- Ensure supplementary tables exist even if not populated
CREATE TABLE IF NOT EXISTS data_raw.s_api_google_places (
    id SERIAL PRIMARY KEY,
    mine_id TEXT,
    nearest_train_station JSONB,
    nearest_airport JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Analytics Views for ML Features
-- These views map to data_clean tables and provide feature layers for machine learning

-- T0 Overview View - Basic mine information for optimization
CREATE VIEW data_analytics.t0_overview AS
SELECT
    ds.mine_id,
    ds.latitude::FLOAT as latitude,
    ds.longitude::FLOAT as longitude,
    dl.country,
    dl.state,
    -- Name selection: use first available name
    CASE
        WHEN di.primary_name IS NOT NULL AND TRIM(di.primary_name) != ''
        THEN TRIM(di.primary_name)
        WHEN di.alternate_name IS NOT NULL AND TRIM(di.alternate_name) != ''
        THEN TRIM(di.alternate_name)
        WHEN di.description IS NOT NULL AND TRIM(di.description) != ''
        THEN TRIM(di.description)
        ELSE CONCAT('Unnamed Mine ', SUBSTRING(ds.mine_id::text, 1, 8))
    END as mine_name,
    dst.status
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.dim_locations dl ON ds.mine_id = dl.mine_id
LEFT JOIN data_clean.dim_identification di ON ds.mine_id = di.mine_id
LEFT JOIN data_clean.dim_status dst ON ds.mine_id = dst.mine_id
WHERE ds.mine_id IS NOT NULL;

-- Mine Summary View - Comprehensive view with all data including raw JSONB
CREATE VIEW data_analytics.mine_summary AS
SELECT 
    ds.mine_id,
    ds.latitude,
    ds.longitude,
    dl.country,
    dl.state,
    dl.district,
    dl.electorate,
    dl.rez_zone,
    dl.city,
    dl.region,
    di.primary_name,
    di.alternate_name,
    di.description,
    di.mine_id_external,
    dst.status,
    dst.status_detail,
    dst.closure_year,
    dst.closure_reason,
    dst.closure_window,
    dst.opening_year,
    dc.company_name,
    dc.company_website,
    dc.parent_company,
    dc.equity_partners,
    de.grid_connection,
    dev.evaluation_status,
    dev.evaluation_description,
    dev.evaluation_score,
    -- Shafts as array
    COALESCE(sh.shafts, '[]'::jsonb) as shafts,
    -- Commodities as array
    COALESCE(c.commodities, '[]'::jsonb) as commodities,
    -- Documentation as array
    COALESCE(doc.documentation, ARRAY[]::TEXT[]) as documentation,
    -- Source data reference fields
    dr.source_table,
    dr.row_id,
    ds.created_at,
    ds.updated_at
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.dim_locations dl ON ds.mine_id = dl.mine_id
LEFT JOIN data_clean.dim_identification di ON ds.mine_id = di.mine_id
LEFT JOIN data_clean.dim_status dst ON ds.mine_id = dst.mine_id
LEFT JOIN data_clean.dim_company dc ON ds.mine_id = dc.mine_id
LEFT JOIN data_clean.dim_energy de ON ds.mine_id = de.mine_id
LEFT JOIN data_clean.dim_evaluations dev ON ds.mine_id = dev.mine_id
LEFT JOIN data_clean.dim_raw dr ON ds.mine_id = dr.mine_id
LEFT JOIN (
    SELECT 
        mine_id,
        jsonb_agg(
            jsonb_build_object(
                'shaft_id', shaft_id,
                'shaft_number', shaft_number,
                'shaft_depth', shaft_depth,
                'shaft_diameter', shaft_diameter,
                'shaft_comment', shaft_comment,
                'depth_range', depth_range,
                'no_shafts', no_shafts,
                'confidence_level', confidence_level
            )
            ORDER BY shaft_number
        ) as shafts
    FROM data_clean.fact_shafts
    GROUP BY mine_id
) sh ON ds.mine_id = sh.mine_id
LEFT JOIN (
    SELECT 
        mine_id,
        jsonb_agg(
            jsonb_build_object(
                'commodity', commodity,
                'coal_type', coal_type,
                'coal_grade', coal_grade
            )
        ) as commodities
    FROM data_clean.fact_commodities
    GROUP BY mine_id
) c ON ds.mine_id = c.mine_id
LEFT JOIN (
    SELECT 
        mine_id,
        ARRAY_AGG(reference) as documentation
    FROM data_clean.fact_documentation
    GROUP BY mine_id
) doc ON ds.mine_id = doc.mine_id;

-- Technical Parameters View - Focused on shaft technical details
CREATE VIEW data_analytics.t1_technical_parameters AS
SELECT
    ds.mine_id,
    COALESCE(COUNT(fs.shaft_id), 0)::INTEGER as no_shafts,
    fs.no_shafts::INTEGER as reported_no_shafts,
    -- Total shaft surface area calculation (2πrh + 2πr² for all shafts) rounded to 3dp
    ROUND(
        COALESCE(
            SUM(
                CASE
                    WHEN fs.shaft_diameter IS NOT NULL AND fs.shaft_depth IS NOT NULL
                    THEN (2 * 3.14159 * (fs.shaft_diameter / 2) * fs.shaft_depth) +
                         (2 * 3.14159 * POWER((fs.shaft_diameter / 2), 2))
                    ELSE NULL
                END
            ),
            NULL
        )::numeric, 3
    )::FLOAT as total_shaft_volume,
    -- Average diameter across all shafts
    ROUND(
        AVG(
            CASE
                WHEN fs.shaft_diameter IS NOT NULL
                THEN fs.shaft_diameter
                ELSE NULL
            END
        )::numeric, 3
    )::FLOAT as avg_diameter_m,
    -- Average depth across all shafts
    ROUND(
        AVG(
            CASE
                WHEN fs.shaft_depth IS NOT NULL
                THEN fs.shaft_depth
                ELSE NULL
            END
        )::numeric, 3
    )::FLOAT as avg_depth_m,
    -- Coal mine flag based on commodities
    CASE
        WHEN EXISTS (
            SELECT 1 FROM data_clean.fact_commodities fc
            WHERE fc.mine_id = ds.mine_id
            AND (fc.commodity ILIKE '%coal%' OR fc.coal_type IS NOT NULL OR fc.coal_grade IS NOT NULL)
        ) THEN true
        ELSE false
    END as is_coal_mine
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.fact_shafts fs ON ds.mine_id = fs.mine_id
GROUP BY ds.mine_id, fs.no_shafts
HAVING COALESCE(fs.no_shafts, COUNT(fs.shaft_id), 0) > 0;

-- Site Specific Conditions View - Transportation accessibility features
CREATE VIEW data_analytics.t2_site_specific_conditions AS
SELECT
    ds.mine_id,

    -- Extract train station coordinates and calculate distance in km
    CASE
        WHEN places.nearest_train_station IS NOT NULL
        AND jsonb_path_exists(places.nearest_train_station, '$.location')
        THEN ROUND(
            (6371 * acos(
                cos(radians(ds.latitude)) *
                cos(radians((places.nearest_train_station->'location'->>'latitude')::decimal)) *
                cos(radians((places.nearest_train_station->'location'->>'longitude')::decimal) - radians(ds.longitude)) +
                sin(radians(ds.latitude)) *
                sin(radians((places.nearest_train_station->'location'->>'latitude')::decimal))
            ))::numeric, 2
        )::FLOAT
        ELSE NULL
    END as nearest_train_station_km,

    -- Extract airport coordinates and calculate distance in km
    CASE
        WHEN places.nearest_airport IS NOT NULL
        AND jsonb_path_exists(places.nearest_airport, '$.location')
        THEN ROUND(
            (6371 * acos(
                cos(radians(ds.latitude)) *
                cos(radians((places.nearest_airport->'location'->>'latitude')::decimal)) *
                cos(radians((places.nearest_airport->'location'->>'longitude')::decimal) - radians(ds.longitude)) +
                sin(radians(ds.latitude)) *
                sin(radians((places.nearest_airport->'location'->>'latitude')::decimal))
            ))::numeric, 2
        )::FLOAT
        ELSE NULL
    END as nearest_airport_km

FROM data_clean.dim_spatial ds
LEFT JOIN data_raw.s_api_google_places places ON ds.mine_id::text = places.mine_id
WHERE ds.latitude IS NOT NULL AND ds.longitude IS NOT NULL;

-- Grid Integration View - Solar energy infrastructure analysis with state-level data
CREATE VIEW data_analytics.t3_grid_integration AS
SELECT
    ds.mine_id,
    de.grid_connection as has_grid_connection,
    CASE
        WHEN dl.rez_zone IS NULL OR TRIM(UPPER(dl.rez_zone)) = 'NOT IN REZ' THEN false
        WHEN dl.rez_zone IS NOT NULL AND TRIM(dl.rez_zone) != '' THEN true
        ELSE false
    END as in_rez_zone,
    apvi.installations::FLOAT as installations
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.dim_energy de ON ds.mine_id = de.mine_id
LEFT JOIN data_clean.dim_locations dl ON ds.mine_id = dl.mine_id
LEFT JOIN data_raw.s_apvi_solar_supplementary_2025_xlsx_1 apvi ON
    CASE
        WHEN dl.state = 'New South Wales' THEN 'NSW'
        WHEN dl.state = 'Queensland' THEN 'QLD'
        WHEN dl.state = 'Victoria' THEN 'VIC'
        WHEN dl.state = 'South Australia' THEN 'SA'
        WHEN dl.state = 'Western Australia' THEN 'WA'
        WHEN dl.state = 'Tasmania' THEN 'TAS'
        WHEN dl.state = 'Northern Territory' THEN 'NT'
        WHEN dl.state = 'Australian Capital Territory' THEN 'ACT'
        ELSE dl.state
    END = apvi.state
WHERE de.grid_connection IS NOT NULL
   OR dl.rez_zone IS NOT NULL
   OR apvi.installations IS NOT NULL;

-- Financial Analysis View - Company and financial data
CREATE VIEW data_analytics.t4_financial_analysis AS
SELECT
    ds.mine_id,
    -- Company data flag
    CASE
        WHEN dc.company_name IS NOT NULL
        OR dc.company_website IS NOT NULL
        OR dc.equity_partners IS NOT NULL
        THEN true
        ELSE false
    END as has_company
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.dim_company dc ON ds.mine_id = dc.mine_id;

-- Investment Analysis View - Evaluation and investment metrics
CREATE VIEW data_analytics.t5_investment_analysis AS
SELECT
    ds.mine_id,
    -- Has evaluation flag - true if mine has status, score and description
    CASE
        WHEN dev.evaluation_status IS NOT NULL
        AND dev.evaluation_score IS NOT NULL
        AND dev.evaluation_description IS NOT NULL
        THEN true
        ELSE false
    END as has_evaluation,
    -- Has identity flag - true if mine has any identification data
    CASE
        WHEN di.alternate_name IS NOT NULL
        OR di.description IS NOT NULL
        OR di.mine_id_external IS NOT NULL
        OR di.primary_name IS NOT NULL
        THEN true
        ELSE false
    END as has_identity
FROM data_clean.dim_spatial ds
LEFT JOIN data_clean.dim_evaluations dev ON ds.mine_id = dev.mine_id
LEFT JOIN data_clean.dim_identification di ON ds.mine_id = di.mine_id;



-- Shaft Summary View - view for analysing shafts
CREATE VIEW data_analytics.shaft_summary AS
SELECT 
   fs.shaft_id,
   fs.mine_id,
   ds.latitude,
   ds.longitude,

   fs.shaft_depth as depth,
   CASE
    WHEN fs.shaft_depth IS NULL THEN 0 ELSE 1
   END as depth_reported,

   fs.shaft_diameter as diameter,
   CASE
    WHEN fs.shaft_diameter IS NULL THEN 0 ELSE 1
   END as diameter_reported,

   de.grid_connection,
   CASE 
    WHEN de.grid_connection IS NULL THEN 0 ELSE 1
   END as grid_connection_reported

FROM data_clean.fact_shafts fs
LEFT JOIN data_clean.dim_spatial ds ON fs.mine_id = ds.mine_id
LEFT JOIN data_clean.dim_energy de ON fs.mine_id = de.mine_id
WHERE ds.latitude IS NOT NULL
  AND ds.longitude IS NOT NULL;

