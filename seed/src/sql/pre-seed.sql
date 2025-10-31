-- Step 0: Database Initialization
-- Create extensions and infrastructure tables

-- Create PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop and recreate schemas
DROP SCHEMA IF EXISTS data_raw CASCADE;
DROP SCHEMA IF EXISTS data_clean CASCADE;
DROP SCHEMA IF EXISTS data_analytics CASCADE;
DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA data_raw;
CREATE SCHEMA data_clean;
CREATE SCHEMA data_analytics;
CREATE SCHEMA public;

-- Pipeline exclusions table for data that couldn't be processed
CREATE TABLE public.pipeline_exclusions (
    source_name TEXT NOT NULL,
    row_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.pipeline_duplicates (
    mine_id UUID NOT NULL,
    table_name TEXT NOT NULL,
    row_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pipeline logs table
CREATE TABLE public.pipeline_logs (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    thread_id VARCHAR(50),
    file_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- DATA_CLEAN SCHEMA TABLES
-- ========================================

-- Minesite Data Schema Design
-- Revised structure with dim_spatial as central table

-- Central spatial dimension table
CREATE TABLE data_clean.dim_spatial (
    mine_id UUID PRIMARY KEY,
    latitude DECIMAL(12,8),
    longitude DECIMAL(12,8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Raw data tracking table (primary reference table with source info)
CREATE TABLE data_clean.dim_raw (
    mine_id UUID PRIMARY KEY,
    source_table VARCHAR(255) NOT NULL,
    row_id SERIAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Location information (references raw)
CREATE TABLE data_clean.dim_locations (
    mine_id UUID PRIMARY KEY,
    country VARCHAR(100),
    state VARCHAR(100),
    district VARCHAR(255),
    electorate VARCHAR(255),
    rez_zone VARCHAR(255),
    city VARCHAR(255),
    region VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Mine identification information
CREATE TABLE data_clean.dim_identification (
    mine_id UUID PRIMARY KEY,
    primary_name VARCHAR(255),
    alternate_name TEXT,
    description TEXT,
    mine_id_external VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Mine status tracking
CREATE TABLE data_clean.dim_status (
    mine_id UUID PRIMARY KEY,
    status VARCHAR(100),
    status_detail VARCHAR(100),
    closure_year INTEGER,
    closure_reason TEXT,
    closure_window VARCHAR(100),
    opening_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Company information
CREATE TABLE data_clean.dim_company (
    mine_id UUID PRIMARY KEY,
    company_name VARCHAR(255),
    company_website VARCHAR(500),
    parent_company VARCHAR(255),
    equity_partners TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Individual shaft details
CREATE TABLE data_clean.fact_shafts (
    shaft_id UUID PRIMARY KEY,
    mine_id UUID NOT NULL,
    shaft_number INTEGER NOT NULL,
    shaft_depth DECIMAL(10,2),
    shaft_diameter DECIMAL(8,2),
    shaft_comment TEXT,
    depth_range VARCHAR(100),
    no_shafts INTEGER,
    confidence_level TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Energy information
CREATE TABLE data_clean.dim_energy (
    mine_id UUID PRIMARY KEY,
    grid_connection BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Evaluation/assessment data
CREATE TABLE data_clean.dim_evaluations (
    mine_id UUID PRIMARY KEY,
    evaluation_status VARCHAR(100) DEFAULT 'not_evaluated',
    evaluation_description TEXT,
    evaluation_score INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Documentation fact table
CREATE TABLE data_clean.fact_documentation (
    mine_id UUID NOT NULL,
    reference TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mine_id, reference),
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Commodities fact table
CREATE TABLE data_clean.fact_commodities (
    mine_id UUID NOT NULL,
    commodity VARCHAR(100) NOT NULL,
    coal_type VARCHAR(100),
    coal_grade VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(mine_id, commodity),
    FOREIGN KEY (mine_id) REFERENCES data_clean.dim_raw(mine_id)
);

-- Pairwise Comparisons fact table
CREATE TABLE data_clean.fact_pairwise_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    w_id UUID,
    l_id UUID,
    FOREIGN KEY (w_id) REFERENCES data_clean.fact_shafts(shaft_id),
    FOREIGN KEY (l_id) REFERENCES data_clean.fact_shafts(shaft_id),
    CONSTRAINT ids_not_equal CHECK (w_id <> l_id)
);


-- Indexes for performance
CREATE INDEX idx_spatial_coordinates ON data_clean.dim_spatial(latitude, longitude);
CREATE INDEX idx_raw_source_table ON data_clean.dim_raw(source_table);
CREATE INDEX idx_locations_country_state ON data_clean.dim_locations(country, state);
CREATE INDEX idx_identification_primary_name ON data_clean.dim_identification(primary_name);
CREATE INDEX idx_status_status ON data_clean.dim_status(status);
CREATE INDEX idx_company_name ON data_clean.dim_company(company_name);
CREATE INDEX idx_shafts_mine_id ON data_clean.fact_shafts(mine_id);
CREATE INDEX idx_shafts_number ON data_clean.fact_shafts(shaft_number);
CREATE INDEX idx_documentation_mine_id ON data_clean.fact_documentation(mine_id);
CREATE INDEX idx_commodities_mine_id ON data_clean.fact_commodities(mine_id);
CREATE INDEX idx_commodities_commodity ON data_clean.fact_commodities(commodity);
