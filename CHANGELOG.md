# Changelog

All notable changes to this project will be documented in this file.

## Unreleased

### Feat

- **Library.tsx**: Updated ui for library page

### Fix

- **manifest.yaml**: Updated host for compose stack
- Pipeline Refactoring

## v0.2.0 (2025-10-14)

### Feat

- **.cz.toml**: Added commitzen for versioning

### Refactor

- Refactored file type logic

## v0.1.28 (2025-10-10)

### Fix

- Updated env variables

## v0.1.27 (2025-10-10)

### Refactor

- Client refactoring
- Major Refactor

## v0.1.26 (2025-10-07)

### Refactor

- **(*)**: Refactored models for modularity
- Refactor #2
- General refactoring

## v0.1.25 (2025-09-29)

### Fix

- Minor updates
- Improved current models
- Updated column mapping for new wa mines dataset
- Moved sql init from database to seed

## v0.1.24 (2025-09-26)

### Feat

- Added linear model

## v0.1.23 (2025-09-25)

### Fix

- Updated evaluation board endpoint

## v0.1.22 (2025-09-24)

### Fix

- Added status scores mapping for t2_status feature

### Refactor

- Refactored models.py and added rez zone

## v0.1.21 (2025-09-23)

### Fix

- **LUCENT-88**: Minor linting
- **LUCENT-88**: Minor fmt changes and added sklearn
- Added reported_no_shafts feature to t1

## v0.1.20 (2025-09-22)

### Fix

- Minor file i/o for sklearn model
- Added has_evaluation and has_identity

## v0.1.19 (2025-09-21)

### Feat

- Added sklearn and deap models with basic CLI

### Fix

- Reverted model to CLI and updated defintion based on analytics views
- Minor fmt

## v0.1.18 (2025-09-20)

### Fix

- Updated Models Page

## v0.1.17 (2025-09-17)

### Fix

- Updated workflows page and maps page
- Error handling in data library

## v0.1.16 (2025-09-16)

### Feat

- Updated feature views

### Fix

- Updated library page
- Updated minedetailspanel
- Feature Store
- Mines are posted from client opposed to assumed through sql statement

## v0.1.15 (2025-09-15)

### Fix

- Minor tweaks, added batch request for google api

## v0.1.14 (2025-09-14)

### Feat

- Added RAG retrieval tooling for assistant
- Added dim_places_api table

## v0.1.13 (2025-09-12)

### Feat

- Updated functionality and added missing features

## v0.1.12 (2025-09-10)

### Fix

- **LUCENT-88**: Housecleaning

## v0.1.11 (2025-09-03)

### Feat

- **etl-pipeline/**: LUCENT-88 Created pipeline routes for etl job pages

### Fix

- **LUCENT-88**: Accomodated for all input files
- **LUCENT-88**: Updated init.sql
- **LUCENT-88**: Updated workflows page and minedetailspanel v2
- **LUCENT-88**: Fixed search page
- **LUCENT-88**: Updated library page
- **LUCENT-88**: Minor client changes

### Refactor

- **LUCENT-104**: Minor refactoring and cleaning

## v0.1.10 (2025-09-02)

### Feat

- **main.py**: LUCENT-104 Refactoring, removed pipeline metadata

## v0.1.9 (2025-08-27)

### Refactor

- Created BaseModel and redefined model service

## v0.1.8 (2025-08-25)

### Fix

- **LUCENT-83**: Migrated lucent-ml for genetic poc
- **LUCENT-84**: Fixed npm building errors

## v0.1.7 (2025-08-24)

### Fix

- **LUCENT-83**: Current UI w/ and w/o API functionality

## v0.1.6 (2025-08-23)

### Feat

- Added analytics layer
- Added pipeline tracking data

### Fix

- Fully migrated seeding script to all tables
- Updated seeding poc
- Seeding progress commit
- Client files cleanup
- Added pipeline records in database

## v0.1.5 (2025-08-23)

### Feat

- Added UI for all pages

## v0.1.4 (2025-08-22)

### Fix

- New UI and env var simplification

## v0.1.3 (2025-08-21)

### Feat

- Added bottom panel

### Fix

- Minor styling changes
- Current UI

## v0.1.2 (2025-08-20)

### Feat

- **LUCENT-83**: Containerised lucent-web

### Fix

- Fixed docker-compose .env variables and indp. make targets
- Added library and search pages using new endpoints

## v0.1.1 (2025-08-19)

### Feat

- **LUCENT-83**: Added lucent-web 404, auth and dashboard

### Fix

- **LUCENT-83**: POC with new endpoint structure

## v0.1.0 (2025-08-19)

### Feat

- **LUCENT-76**: Added database layer w/ simple docker configuration
- **LUCENT-80**: Added application layer

### Fix

- **LUCENT-76**: Updated schema to include all current data_clean tables
- **LUCENT-80**: Added chat and agent/toolkit dependencies
