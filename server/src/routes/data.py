from flask import Blueprint, jsonify, request
from psycopg2.extras import RealDictCursor
from src.utils.database import get_connection

bp = Blueprint('data', __name__, url_prefix='/api/v1')

# Route 2: Get table metadata and data
@bp.route('/schemas/<schema_name>/tables/<table_name>', methods=['GET'])
def get_table_info_and_data(schema_name, table_name):
    """Get metadata and data for a specific table."""
    try:
        # Get query parameters
        include_columns = request.args.get('include_columns')
        limit = request.args.get('limit', type=int, default=50)
        offset = request.args.get('offset', type=int, default=0)

        # Parse include_columns
        if include_columns:
            include_columns = [col.strip() for col in include_columns.split(',') if col.strip()]

        # Get table metadata
        metadata_query = """
            SELECT
                t.table_name,
                t.table_type,
                obj_description(c.oid) as table_description,
                (SELECT COUNT(*)
                 FROM information_schema.columns
                 WHERE table_schema = %s AND table_name = %s) as column_count
            FROM information_schema.tables t
            LEFT JOIN pg_class c ON c.relname = t.table_name
            LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.table_schema
            WHERE t.table_schema = %s AND t.table_name = %s
        """

        row_count_query = f'SELECT COUNT(*) as row_count FROM "{schema_name}"."{table_name}"'

        # Build data query
        if include_columns:
            columns = ', '.join([f'"{col}"' for col in include_columns])
        else:
            columns = '*'

        data_query = f'SELECT {columns} FROM "{schema_name}"."{table_name}"'
        if limit:
            data_query += f' LIMIT {limit}'
        if offset > 0:
            data_query += f' OFFSET {offset}'

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get table metadata
                cursor.execute(metadata_query, [schema_name, table_name, schema_name, table_name])
                metadata = cursor.fetchone()

                if not metadata:
                    return jsonify({"message": f"Table {schema_name}.{table_name} not found"}), 404

                # Get row count
                cursor.execute(row_count_query)
                row_count_result = cursor.fetchone()
                row_count = row_count_result['row_count'] if row_count_result else 0

                # Get data
                cursor.execute(data_query)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]

                # Get total row count for pagination
                cursor.execute(row_count_query)
                total_rows = cursor.fetchone()['row_count']

                result = {
                    "table_name": metadata['table_name'],
                    "table_type": metadata['table_type'],
                    "table_description": metadata['table_description'] or "No description available",
                    "column_count": metadata['column_count'],
                    "row_count": row_count,
                    "data": result_data,
                    "limit": limit,
                    "offset": offset,
                    "returned_rows": len(result_data),
                    "total_rows": total_rows
                }

                return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get table info and data: {str(e)}"}), 400

# Route 3: Query one specific row
@bp.route('/schemas/<schema_name>/tables/<table_name>/row', methods=['GET'])
def query_one_row(schema_name, table_name):
    """Query one specific row by id_key and id_value."""
    try:
        # Get required parameters
        id_key = request.args.get('id_key')
        id_value = request.args.get('id_value')
        include_columns = request.args.get('include_columns')

        if not id_key or not id_value:
            return jsonify({"message": "id_key and id_value are required"}), 400

        # Parse include_columns
        if include_columns:
            include_columns = [col.strip() for col in include_columns.split(',') if col.strip()]

        # Build SELECT clause
        if include_columns:
            columns = ', '.join([f'"{col}"' for col in include_columns])
        else:
            columns = '*'

        # Build query
        query = f'SELECT {columns} FROM "{schema_name}"."{table_name}" WHERE "{id_key}" = %s'

        # Execute query
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, [id_value])
                row = cursor.fetchone()

                if not row:
                    return jsonify({
                        "data": None,
                        "message": f"No row found with {id_key} = {id_value}"
                    }), 404

                result_data = dict(row)

                return jsonify({"data": result_data}), 200

    except Exception as e:
        return jsonify({"message": f"Failed to query row: {str(e)}"}), 400

# Route 4: Update one specific row
@bp.route('/schemas/<schema_name>/tables/<table_name>/row', methods=['PUT'])
def update_one_row(schema_name, table_name):
    """Update one specific row by id_key and id_value."""
    try:
        # Get required parameters
        id_key = request.args.get('id_key')
        id_value = request.args.get('id_value')

        if not id_key or not id_value:
            return jsonify({"message": "id_key and id_value are required"}), 400

        data = request.get_json()
        if not data:
            return jsonify({"message": "No data provided"}), 400

        # Build SET clause
        set_clauses = [f'"{col}" = %s' for col in data.keys()]
        params = list(data.values()) + [id_value]

        # Build UPDATE query
        query = f'UPDATE "{schema_name}"."{table_name}" SET {", ".join(set_clauses)} WHERE "{id_key}" = %s'

        # Execute update
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                rows_affected = cursor.rowcount
                conn.commit()

                if rows_affected == 0:
                    return jsonify({
                        "success": False,
                        "message": f"No row found with {id_key} = {id_value}",
                        "rows_affected": 0
                    }), 404

                return jsonify({
                    "success": True,
                    "message": "Row updated successfully",
                    "rows_affected": rows_affected,
                    "updated_data": data
                }), 200

    except Exception as e:
        return jsonify({"message": f"Failed to update row: {str(e)}"}), 400

# Route 5: Execute raw SQL query
@bp.route('/query', methods=['POST'])
def execute_raw_sql():
    """Execute a raw SQL query with optional pagination."""
    try:
        # Get the raw SQL from request body
        data = request.get_json()
        if not data or 'sql' not in data:
            return jsonify({"message": "SQL query is required in request body"}), 400

        sql_query = data['sql']
        if not sql_query or not sql_query.strip():
            return jsonify({"message": "SQL query cannot be empty"}), 400

        # Get optional pagination parameters
        limit = data.get('limit', 100)
        offset = data.get('offset', 0)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # For SELECT queries, we need to handle pagination
                sql_upper = sql_query.upper().strip()
                is_select_query = sql_upper.startswith('SELECT') or sql_upper.startswith('WITH')

                if is_select_query and limit is not None:
                    # Get total count first for SELECT queries
                    count_query = f"SELECT COUNT(*) FROM ({sql_query}) as count_subquery"
                    cursor.execute(count_query)
                    total_rows = cursor.fetchone()['count']

                    # Add pagination to the original query
                    paginated_query = f"{sql_query} LIMIT {limit}"
                    if offset > 0:
                        paginated_query += f" OFFSET {offset}"

                    cursor.execute(paginated_query)
                    rows = cursor.fetchall()
                    result_data = [dict(row) for row in rows]

                    return jsonify({
                        "data": result_data,
                        "rows_affected": len(result_data),
                        "query_type": "SELECT",
                        "limit": limit,
                        "offset": offset,
                        "returned_rows": len(result_data),
                        "total_rows": total_rows
                    }), 200
                else:
                    # Execute original query for non-SELECT or unlimited queries
                    cursor.execute(sql_query)

                    # Handle different types of queries
                    if cursor.description:
                        # SELECT query - fetch results
                        rows = cursor.fetchall()
                        result_data = [dict(row) for row in rows]
                        return jsonify({
                            "data": result_data,
                            "rows_affected": len(result_data),
                            "query_type": "SELECT",
                            "limit": None,
                            "offset": 0,
                            "returned_rows": len(result_data),
                            "total_rows": len(result_data)
                        }), 200
                    else:
                        # INSERT/UPDATE/DELETE query - commit and return affected rows
                        conn.commit()
                        return jsonify({
                            "data": None,
                            "rows_affected": cursor.rowcount,
                            "query_type": "MODIFY"
                        }), 200

    except Exception as e:
        return jsonify({"message": f"Failed to execute SQL query '{sql_query}': {str(e)}"}), 400

# Route 6: Get all schemas and their tables
@bp.route('/schemas/tables', methods=['GET'])
def get_schemas_tables():
    """Get all schemas and their tables."""
    try:
        # First get all user schemas
        schemas_query = """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'public', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
            ORDER BY schema_name
        """

        # Then get all tables and views
        tables_views_query = """
            SELECT
                schemaname as schema,
                tablename as table_name,
                'table' as object_type
            FROM pg_tables
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'public')

            UNION ALL

            SELECT
                schemaname as schema,
                viewname as table_name,
                'view' as object_type
            FROM pg_views
            WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'public')

            ORDER BY schema, table_name
        """

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get all schemas first
                cursor.execute(schemas_query)
                schema_rows = cursor.fetchall()

                # Initialize schemas dict with empty arrays
                schemas_dict = {}
                for row in schema_rows:
                    schemas_dict[row['schema_name']] = []

                # Get all tables and views and populate the schemas
                cursor.execute(tables_views_query)
                table_view_rows = cursor.fetchall()

                for row in table_view_rows:
                    schema_name = row['schema']
                    table_name = row['table_name']
                    object_type = row['object_type']

                    if schema_name in schemas_dict:
                        schemas_dict[schema_name].append({
                            "name": table_name,
                            "type": object_type
                        })

                # Convert to list format
                result = []
                for schema, tables in schemas_dict.items():
                    result.append({
                        "schema": schema,
                        "tables": tables
                    })

                return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get schemas and tables: {str(e)}"}), 400

# Route 9: Get joined locations and spatial data with filtering
@bp.route('/schemas/<schema_name>/locations-spatial', methods=['GET'])
def get_joined_locations_spatial(schema_name):
    """Get joined dim_locations and dim_spatial data with optional filtering."""
    try:
        # Get query parameters
        include_columns = request.args.get('include_columns')
        limit = request.args.get('limit', type=int, default=50)
        offset = request.args.get('offset', type=int, default=0)

        # Parse include_columns
        if include_columns:
            include_columns = [col.strip() for col in include_columns.split(',') if col.strip()]

        # Parse filters - any other query parameters will be treated as filters
        filters = {}
        for key, value in request.args.items():
            if key not in ['include_columns', 'limit', 'offset']:
                filters[key] = value

        # If no filters provided, set filters to None
        if not filters:
            filters = None

        # Build SELECT clause
        if include_columns:
            columns = ', '.join([f'"{col}"' for col in include_columns])
        else:
            columns = '*'

        # Build base join query
        base_query = f"""
            SELECT {columns}
            FROM "{schema_name}"."dim_locations" dl
            LEFT JOIN "{schema_name}"."dim_spatial" ds ON dl.mine_id = ds.mine_id
        """

        # Build WHERE clause for filters
        where_conditions = []
        params = []

        if filters:
            for key, value in filters.items():
                if isinstance(value, list):
                    # Handle multiple values (e.g., multiple countries)
                    placeholders = ', '.join(['%s'] * len(value))
                    where_conditions.append(f'"{key}" IN ({placeholders})')
                    params.extend(value)
                else:
                    where_conditions.append(f'"{key}" = %s')
                    params.append(value)

        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)

        # Build main query with pagination
        query = base_query
        if limit:
            query += f' LIMIT {limit}'
        if offset > 0:
            query += f' OFFSET {offset}'

        # Build count query
        count_query = f"""
            SELECT COUNT(*)
            FROM "{schema_name}"."dim_locations" dl
            LEFT JOIN "{schema_name}"."dim_spatial" ds ON dl.mine_id = ds.mine_id
        """

        if where_conditions:
            count_query += " WHERE " + " AND ".join(where_conditions)

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get rows
                cursor.execute(query, params)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]

                # Get total row count
                cursor.execute(count_query, params)
                total_rows = cursor.fetchone()['count']

                # Add metadata
                metadata = {
                    "table_name": "dim_locations_spatial_joined",
                    "table_type": "JOINED",
                    "table_description": "Joined data from dim_locations and dim_spatial tables",
                    "column_count": len(result_data[0].keys()) if result_data else 0,
                    "row_count": total_rows
                }

                final_result = {
                    **metadata,
                    "data": result_data,
                    "limit": limit,
                    "offset": offset,
                    "returned_rows": len(result_data),
                    "total_rows": total_rows
                }

                return jsonify(final_result), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get joined locations and spatial data: {str(e)}"}), 400

@bp.route('/evaluation-board/mines', methods=['GET'])
def get_evaluation_board_mines():
    """Get mines for evaluation board with status priority sorting.

    Prioritizes status in this order: UNDER_REVIEW -> SHORTLISTED -> APPROVED -> REJECTED -> NOT_EVALUATED
    This ensures that when fetching 100 rows, we get all mines in priority statuses first.
    """
    try:
        # Get query parameters
        include_columns = request.args.get('include_columns')
        limit = request.args.get('limit', type=int, default=100)
        offset = request.args.get('offset', type=int, default=0)

        # Parse include_columns
        if include_columns:
            include_columns = [col.strip() for col in include_columns.split(',') if col.strip()]

        # Build SELECT clause
        if include_columns:
            columns = ', '.join([f'"{col}"' for col in include_columns])
        else:
            columns = '*'

        # Build base query with status priority and evaluation score ordering
        base_query = f"""
            SELECT {columns}
            FROM "data_analytics"."mine_summary"
            ORDER BY
                CASE evaluation_status
                    WHEN 'under_review' THEN 1
                    WHEN 'shortlisted' THEN 2
                    WHEN 'approved' THEN 3
                    WHEN 'rejected' THEN 4
                    ELSE 5  -- not_evaluated and null values
                END,
                CASE
                    WHEN evaluation_score IS NOT NULL THEN 0
                    ELSE 1
                END,
                evaluation_score DESC NULLS LAST,
                mine_id
        """

        # Build main query with pagination
        query = base_query
        if limit:
            query += f' LIMIT {limit}'
        if offset > 0:
            query += f' OFFSET {offset}'

        # Build count query
        count_query = 'SELECT COUNT(*) FROM "data_analytics"."mine_summary"'

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get rows
                cursor.execute(query)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]

                # Get total row count
                cursor.execute(count_query)
                total_rows = cursor.fetchone()['count']

                result = {
                    "data": result_data,
                    "limit": limit,
                    "offset": offset,
                    "returned_rows": len(result_data),
                    "total_rows": total_rows
                }

                return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get evaluation board mines: {str(e)}"}), 400

# Spatial routes
@bp.route('/spatial/mines', methods=['GET'])
def get_spatial_mines():
    """Get all mines with spatial data, with optional filtering and pagination."""
    try:
        # Get query parameters
        limit = request.args.get('limit', type=int, default=100)
        offset = request.args.get('offset', type=int, default=0)

        # Parse filters - any other query parameters will be treated as filters
        filters = {}
        for key, value in request.args.items():
            if key not in ['limit', 'offset']:
                # Handle multiple countries (comma-separated)
                if key == 'country' and ',' in value:
                    filters[key] = [c.strip() for c in value.split(',')]
                else:
                    filters[key] = value

        # If no filters provided, set filters to None
        if not filters:
            filters = None

        # Build base join query
        base_query = """
            SELECT *
            FROM "data_clean"."dim_locations" dl
            LEFT JOIN "data_clean"."dim_spatial" ds ON dl.mine_id = ds.mine_id
        """

        # Build WHERE clause for filters
        where_conditions = []
        params = []

        if filters:
            for key, value in filters.items():
                if isinstance(value, list):
                    placeholders = ', '.join(['%s'] * len(value))
                    where_conditions.append(f'"{key}" IN ({placeholders})')
                    params.extend(value)
                else:
                    where_conditions.append(f'"{key}" = %s')
                    params.append(value)

        if where_conditions:
            base_query += " WHERE " + " AND ".join(where_conditions)

        # Build main query with pagination
        query = base_query
        if limit:
            query += f' LIMIT {limit}'
        if offset > 0:
            query += f' OFFSET {offset}'

        # Build count query
        count_query = """
            SELECT COUNT(*)
            FROM "data_clean"."dim_locations" dl
            LEFT JOIN "data_clean"."dim_spatial" ds ON dl.mine_id = ds.mine_id
        """

        if where_conditions:
            count_query += " WHERE " + " AND ".join(where_conditions)

        # Get distinct countries
        countries_query = """
            SELECT DISTINCT country
            FROM "data_clean"."dim_locations"
            WHERE country IS NOT NULL AND country != ''
            ORDER BY country
        """

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                # Get rows
                cursor.execute(query, params)
                rows = cursor.fetchall()
                result_data = [dict(row) for row in rows]

                # Get total row count
                cursor.execute(count_query, params)
                total_rows = cursor.fetchone()['count']

                # Get distinct countries
                cursor.execute(countries_query)
                country_rows = cursor.fetchall()
                distinct_countries = [row['country'] for row in country_rows]

                result = {
                    "data": result_data,
                    "limit": limit,
                    "offset": offset,
                    "returned_rows": len(result_data),
                    "total_rows": total_rows,
                    "distinct_countries": distinct_countries
                }

                return jsonify(result), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get spatial mines: {str(e)}"}), 400

@bp.route('/spatial/mine/<mine_id>', methods=['GET'])
def get_spatial_mine(mine_id):
    """Get a specific mine with spatial data."""
    try:
        query = 'SELECT * FROM "data_clean"."dim_spatial" WHERE "mine_id" = %s'

        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, [mine_id])
                row = cursor.fetchone()

                if not row:
                    return jsonify({
                        "data": None,
                        "message": f"No mine found with mine_id = {mine_id}"
                    }), 404

                result_data = dict(row)

                return jsonify({"data": result_data}), 200

    except Exception as e:
        return jsonify({"message": f"Failed to get spatial mine: {str(e)}"}), 400
