import json
import os
import uuid
import requests
import time
from datetime import datetime
from psycopg2.extras import RealDictCursor
from src.utils import get_db_connection, setup_logging

LOG = setup_logging(level=os.getenv('LOG_LEVEL', 'INFO'))


def find_nearest_places_batch(mine_locations, place_type, google_api_key):
    """Find nearest places using Google Places API batch request"""
    batch_url = f"https://places.googleapis.com/batch?key={google_api_key}"
    boundary = f"batch_{uuid.uuid4().hex}"

    batch_parts = []
    mine_id_map = {}

    for i, (mine_id, lat, lng) in enumerate(mine_locations):
        content_id = f"<item{i+1}:{uuid.uuid4().hex}@places.googleapis.com>"
        mine_id_map[content_id] = mine_id

        payload = json.dumps({
            "locationRestriction": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 50000
                }
            },
            "includedPrimaryTypes": [place_type],
            "rankPreference": "DISTANCE",
            "maxResultCount": 1
        })

        batch_parts.append(f"""--{boundary}
Content-Type: application/http
Content-ID: {content_id}

POST /v1/places:searchNearby HTTP/1.1
Content-Type: application/json
X-Goog-FieldMask: places.displayName,places.formattedAddress,places.types,places.location
Content-Length: {len(payload)}

{payload}""")

    batch_body = "\n".join(batch_parts) + f"\n--{boundary}--"
    headers = {
        "Content-Type": f"multipart/mixed; boundary={boundary}",
        "Content-Length": str(len(batch_body))
    }

    try:
        response = requests.post(batch_url, headers=headers, data=batch_body)
        response.raise_for_status()
        LOG.info(f"Batch API call successful, status: {response.status_code}")

        results = {}
        response_boundary = response.headers.get('Content-Type', '').split('boundary=')[1] if 'boundary=' in response.headers.get('Content-Type', '') else None

        if response_boundary:
            parts = response.text.split(f"--{response_boundary}")

            for part in parts[1:-1]:
                if "HTTP/1.1 200" not in part and "HTTP/1.1 201" not in part:
                    continue

                content_id = None
                for line in part.split('\n'):
                    if line.strip().startswith('Content-ID:'):
                        response_id = line.split('Content-ID:')[1].strip()
                        if response_id.startswith('<response-'):
                            original = response_id[10:-1]
                            for orig_id in mine_id_map:
                                if orig_id[1:-1] == original:
                                    content_id = orig_id
                                    break
                        break

                lines = part.split('\n')
                json_started = False
                json_lines = []
                for line in lines:
                    if json_started:
                        json_lines.append(line)
                    elif line.strip().startswith('{'):
                        json_started = True
                        json_lines.append(line)

                if content_id and json_lines:
                    try:
                        data = json.loads('\n'.join(json_lines))
                        mine_id = mine_id_map[content_id]

                        if data.get('places'):
                            place = data['places'][0]
                            results[mine_id] = {
                                'name': place.get('displayName', {}).get('text'),
                                'address': place.get('formattedAddress'),
                                'location': place.get('location'),
                                'types': place.get('types', [])
                            }
                        else:
                            results[mine_id] = None
                    except Exception as e:
                        LOG.error(f"Error parsing JSON response for mine {mine_id}: {str(e)}")

        for _, mine_id, _, _ in [(i, mid, lat, lng) for i, (mid, lat, lng) in enumerate(mine_locations)]:
            if mine_id not in results:
                results[mine_id] = None

        return results

    except Exception as e:
        LOG.error(f"Error in batch API call: {str(e)}")
        return {mine_id: None for mine_id, _, _ in mine_locations}


def process_batch(mine_locations, place_type, google_api_key, batch_size=100):
    """Process locations in batches"""
    all_results = {}

    for i in range(0, len(mine_locations), batch_size):
        batch = mine_locations[i:i + batch_size]
        results = find_nearest_places_batch(batch, place_type, google_api_key)
        all_results.update(results)

        if i + batch_size < len(mine_locations):
            time.sleep(1)

    return all_results


def run(script_config=None):
    """Main entry point for the script"""
    if not script_config:
        raise ValueError("script_config is required")

    table_name = script_config.get('table_name')
    source_type = script_config.get('type', 'supplementary')
    query = script_config.get('configuration', {}).get('query')

    LOG.info(f"Script config - table_name: {table_name}, type: {source_type}")

    if not table_name or not query:
        raise ValueError("table_name and query are required")

    google_api_key = os.getenv('GOOGLE_PLACES_V2_API_KEY', '')
    if not google_api_key:
        LOG.error("GOOGLE_PLACES_V2_API_KEY environment variable not set!")
        return "Error: GOOGLE_PLACES_V2_API_KEY not configured"

    LOG.info(f"API key found: {google_api_key[:10]}...")

    prefix = 's_' if source_type == 'supplementary' else 'p_'
    full_table_name = f"{prefix}{table_name}"
    LOG.info(f"Using table name: {full_table_name} (prefix: {prefix})")

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            LOG.info(f"Executing query: {query}")
            cursor.execute(query)
            results = cursor.fetchall()
            LOG.info(f"Query returned {len(results)} results")

            if not results:
                LOG.warning(f"No mine locations found for {full_table_name}")
                return f"No mine locations found for {full_table_name}"

            if not all(key in results[0] for key in ['mine_id', 'latitude', 'longitude']):
                raise Exception("SQL query must return: mine_id, latitude, longitude")

            mine_locations = [
                (str(r['mine_id']), float(r['latitude']), float(r['longitude']))
                for r in results
                if r['mine_id'] and r['latitude'] is not None and r['longitude'] is not None
            ]
            LOG.info(f"Processing {len(mine_locations)} valid mine locations")

            LOG.info("Fetching train stations from Google Places API...")
            train_stations = process_batch(mine_locations, 'train_station', google_api_key)
            LOG.info(f"Found {sum(1 for v in train_stations.values() if v)} train stations")

            LOG.info("Fetching airports from Google Places API...")
            airports = process_batch(mine_locations, 'airport', google_api_key)
            LOG.info(f"Found {sum(1 for v in airports.values() if v)} airports")

            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS data_raw.{full_table_name} (
                    id SERIAL PRIMARY KEY,
                    mine_id TEXT,
                    nearest_train_station JSONB,
                    nearest_airport JSONB,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)

            timestamp = datetime.utcnow()
            successful_inserts = 0

            for mine_id, _, _ in mine_locations:
                train_data = train_stations.get(mine_id)
                airport_data = airports.get(mine_id)

                try:
                    cursor.execute(f"""
                        INSERT INTO data_raw.{full_table_name}
                        (mine_id, nearest_train_station, nearest_airport, created_at)
                        VALUES (%s, %s, %s, %s)
                    """, (
                        mine_id,
                        json.dumps(train_data) if train_data else None,
                        json.dumps(airport_data) if airport_data else None,
                        timestamp
                    ))
                    successful_inserts += 1
                except Exception as e:
                    LOG.error(f"Error inserting data for mine {mine_id}: {str(e)}")

            conn.commit()
            LOG.info(f"Committed {successful_inserts} records to database")

            return f"Inserted Places API data into data_raw.{full_table_name}: Successfully processed {successful_inserts} out of {len(mine_locations)} mines"

    except Exception as e:
        conn.rollback()
        raise Exception(f"Failed to execute places processing: {str(e)}")
    finally:
        conn.close()
