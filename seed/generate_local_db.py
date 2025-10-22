import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import random

# Database connection details
DB_HOST = "localhost"
DB_PORT = 5433
DB_NAME = "postgres"
DB_USER = "root"
DB_PASSWORD = "password"

# Sample data for realistic mine sites
countries_states = {
    "Australia": ["New South Wales", "Queensland", "Western Australia", "Victoria", "South Australia"],
    "Canada": ["British Columbia", "Ontario", "Quebec", "Alberta", "Saskatchewan"],
    "USA": ["Nevada", "Alaska", "Arizona", "Montana", "California"],
    "Chile": ["Atacama", "Antofagasta", "Maule", "O'Higgins", "Coquimbo"],
    "Peru": ["Ancash", "Cajamarca", "Puno", "Arequipa", "Junin"],
    "South Africa": ["Limpopo", "Gauteng", "North West", "Mpumalanga", "Northern Cape"],
    "Brazil": ["Minas Gerais", "Para", "Goias", "Mato Grosso", "Amazonas"],
    "China": ["Inner Mongolia", "Yunnan", "Shandong", "Shanxi", "Xinjiang"]
}

commodities_list = [
    "Gold", "Silver", "Copper", "Iron Ore", "Zinc", "Lead", "Nickel",
    "Cobalt", "Lithium", "Coal", "Diamonds", "Platinum", "Palladium",
    "Tin", "Molybdenum", "Rare Earth Elements", "Tungsten", "Bauxite"
]

mine_types = [
    "Open Pit", "Underground", "Strip", "Placer", "Dredging",
    "Mountain Top Removal", "Solution Mining", "In-Situ Leaching"
]

def generate_mine_data():
    """Generate 100 mine site records"""
    mines = []
    
    for i in range(100):
        country = random.choice(list(countries_states.keys()))
        state = random.choice(countries_states[country])
        
        # Generate realistic latitude/longitude
        if country == "Australia":
            lat = round(random.uniform(-45, -10), 4)
            lon = round(random.uniform(113, 154), 4)
        elif country == "Canada":
            lat = round(random.uniform(45, 60), 4)
            lon = round(random.uniform(-140, -55), 4)
        elif country == "USA":
            lat = round(random.uniform(25, 70), 4)
            lon = round(random.uniform(-170, -65), 4)
        elif country == "Chile":
            lat = round(random.uniform(-56, -17), 4)
            lon = round(random.uniform(-77, -68), 4)
        elif country == "Peru":
            lat = round(random.uniform(-18, -0.5), 4)
            lon = round(random.uniform(-81, -68), 4)
        elif country == "South Africa":
            lat = round(random.uniform(-34, -22), 4)
            lon = round(random.uniform(22, 33), 4)
        elif country == "Brazil":
            lat = round(random.uniform(-33, 5), 4)
            lon = round(random.uniform(-74, -35), 4)
        else:  # China
            lat = round(random.uniform(18, 53), 4)
            lon = round(random.uniform(73, 135), 4)
        
        # Generate unique mine name
        base_name = f"{random.choice(['Mountain', 'Valley', 'Peak', 'Ridge', 'Summit', 'Canyon'])}-{random.choice(['North', 'South', 'East', 'West', 'Central'])}"
        name = f"{base_name}-{i+1}"
        
        # Generate commodities (1-3 commodities per mine)
        num_commodities = random.randint(1, 3)
        mine_commodities = ", ".join(random.sample(commodities_list, num_commodities))
        
        description = f"{random.choice(mine_types)} mine site producing {mine_commodities}. Established {random.randint(1950, 2020)}."
        
        mines.append({
            "latitude": lat,
            "longitude": lon,
            "country": country,
            "state": state,
            "name": name,
            "description": description,
            "commodities": mine_commodities
        })
    
    return mines

def create_database():
    """Create the database if it doesn't exist"""
    try:
        # Connect to default postgres database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database="postgres",
            user=DB_USER,
            password=DB_PASSWORD
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if database exists
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname = '{DB_NAME}'")
        if not cur.fetchone():
            cur.execute(f"CREATE DATABASE {DB_NAME}")
            print(f"✓ Created database '{DB_NAME}'")
        else:
            print(f"✓ Database '{DB_NAME}' already exists")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"✗ Error creating database: {e}")
        raise

def create_table(conn):
    """Create the mines table"""
    cur = conn.cursor()
    
    # Drop table if exists
    cur.execute("DROP TABLE IF EXISTS public.mines")
    
    # Create table
    create_table_sql = """
    CREATE TABLE public.mines (
        id SERIAL PRIMARY KEY,
        latitude DECIMAL(10, 4) NOT NULL,
        longitude DECIMAL(11, 4) NOT NULL,
        country VARCHAR(50) NOT NULL,
        state VARCHAR(100) NOT NULL,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        commodities VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """
    
    cur.execute(create_table_sql)
    conn.commit()
    print("✓ Created table 'public.mines'")
    cur.close()

def insert_mine_data(conn, mines):
    """Insert mine data into the database"""
    cur = conn.cursor()
    
    insert_sql = """
    INSERT INTO public.mines (latitude, longitude, country, state, name, description, commodities)
    VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    cur.executemany(insert_sql, [
        (m["latitude"], m["longitude"], m["country"], m["state"], m["name"], m["description"], m["commodities"])
        for m in mines
    ])
    
    conn.commit()
    print(f"✓ Inserted {len(mines)} mine records into 'public.mines'")
    cur.close()

def main():
    try:
        print("Starting database setup...\n")
        
        # Create database
        create_database()
        
        # Connect to the mine database
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        
        # Create table
        create_table(conn)
        
        # Generate and insert mine data
        print("Generating mine site data...")
        mines = generate_mine_data()
        insert_mine_data(conn, mines)
        
        # Verify
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM public.mines")
        count = cur.fetchone()[0]
        print(f"\n✓ Database setup complete! Total mines in database: {count}")
        
        # Show sample records
        cur.execute("SELECT name, country, state, commodities FROM public.mines LIMIT 5")
        print("\nSample records:")
        for row in cur.fetchall():
            print(f"  - {row[0]} ({row[1]}, {row[2]}): {row[3]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Error: {e}")
        raise

if __name__ == "__main__":
    main()