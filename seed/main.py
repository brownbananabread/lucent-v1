import os
import argparse

from src import ingestion, utils, extract, transform

LOG = utils.setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))
MANIFEST_PATH = os.getenv('MANIFEST_PATH', 'manifest.yaml')

def main():
    """Main pipeline execution"""
    parser = argparse.ArgumentParser(description='Seed database with data ingestion and/or embeddings')
    parser.add_argument('--mode',
                       choices=['ingestion', 'embeddings', 'both'],
                       default='both',
                       help='Choose what to run: ingestion only, embeddings only, or both (default: both)')
    args = parser.parse_args()

    LOG.info("=" * 80)
    LOG.info("LUCENT DATA PIPELINE")
    LOG.info("=" * 80)
    LOG.info(f"Mode: {args.mode}")
    LOG.info(f"Manifest: {MANIFEST_PATH}")
    LOG.info("=" * 80)

    manifest = utils.helpers.load_yaml(MANIFEST_PATH)

    if not manifest:
        LOG.error("Manifest file is missing or empty")
        return

    # Log configuration summary
    resources = manifest.get('resources', {})
    LOG.info("Configuration Summary:")
    LOG.info(f"  Remote files (S3): {len(resources.get('remote-files', []))} configured")
    LOG.info(f"  Local files: {len(resources.get('local-files', []))} configured")
    LOG.info(f"  API endpoints: {len(resources.get('apis', []))} configured")
    LOG.info(f"  Database sources: {len(resources.get('databases', []))} configured")
    LOG.info(f"  Custom scripts: {len(resources.get('scripts', []))} configured")
    LOG.info("=" * 80)

    try:
        if args.mode in ['ingestion', 'both']:
            etl = ingestion.Pipeline(name="Data Ingestion Pipeline")

            etl.add_step("Check DB Connection", utils.helpers.check_db_connection)
            etl.add_step("Initialise DB with pre-seed.sql", utils.sql.execute_pre_seed_sql)

            if manifest.get('resources', {}).get('remote-files'):
                etl.add_step("Download files from S3",
                                 lambda _: utils.s3.download_files_from_s3(
                                     files=manifest.get('resources', {}).get('remote-files', [])
                                 ))

            if manifest.get('resources', {}).get('local-files'):
                etl.add_step("Copy local files to downloads",
                                 lambda _: utils.files.copy_local_files(
                                     files=manifest.get('resources', {}).get('local-files', [])
                                 ))

            if manifest.get('resources', {}).get('apis'):
                etl.add_step("Download API data",
                                 lambda _: utils.api.download_api_data(
                                     apis=manifest.get('resources', {}).get('apis', [])
                                 ))

            if manifest.get('resources', {}).get('databases'):
                etl.add_step("Download database data",
                                 lambda _: utils.database.download_database_data(
                                     databases=manifest.get('resources', {}).get('databases', [])
                                 ))

            etl.add_step("Ingestion downloads to data_raw table", extract.process_downloads_to_db)
            etl.add_step("Process data_raw to data_clean", transform.process_raw_to_clean)

            if manifest.get('resources', {}).get('scripts'):
                etl.add_step("Execute custom scripts",
                                 lambda _: utils.scripts.execute(
                                     scripts=manifest.get('resources', {}).get('scripts', [])
                                 ))

            etl.add_step("Create analytics views with post-seed.sql", utils.sql.execute_post_seed_sql)
            etl.add_step("Commit logs to database", utils.helpers.commit_logs_to_db)

            etl.run()

        if args.mode in ['embeddings', 'both']:
            embeddings_pipeline = ingestion.Pipeline(name="Embeddings Pipeline")
            embeddings_pipeline.add_step("Execute custom scripts",
                                 lambda _: utils.scripts.execute(
                                     scripts=[{
                                            'location': 'src/scripts/embeddings.py',
                                            'include_resource': True
                                     }]
                                 ))
            embeddings_pipeline.run()

        LOG.info("")
        LOG.info("=" * 80)
        LOG.info("PIPELINE COMPLETED SUCCESSFULLY")
        LOG.info("=" * 80)

    except Exception as e:
        LOG.error("")
        LOG.error("=" * 80)
        LOG.error(f"PIPELINE FAILED: {e}")
        LOG.error("=" * 80)
        raise


if __name__ == "__main__":
    main()
