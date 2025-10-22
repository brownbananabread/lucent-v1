export SERVER_URL=http://localhost:5174
export SERVER_PORT=5174
export CLIENT_PORT=5173
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=root
export DB_PASSWORD=password
export S3_BUCKET_NAME=greengravity-archive

.PHONY: help build up down clean

help:
	@echo "Available commands:"
	@echo "  build       Build Docker containers"
	@echo "  up          Start the application"
	@echo "  down        Stop the application"
	@echo "  clean       Remove containers and volumes"

up:
	chamber exec lucent -- docker-compose up -d --build

down:
	docker-compose down -v --remove-orphans

web:
	cd client && \
	npm install && \
	chamber exec lucent -- sh -c '\
		export VITE_GOOGLE_MAPS_API_KEY=$$GOOGLE_MAPS_API_KEY && \
		npm run dev'

api:
	cd server; \
	poetry install; \
 	chamber exec lucent -- poetry run python main.py

db:
	docker rm -f lucent-db || true
	docker volume rm lucent-db-data || true
	docker run -d --name lucent-db -p ${DB_PORT}:5432 \
		-e POSTGRES_DB=postgres \
		-e POSTGRES_USER=root \
		-e POSTGRES_PASSWORD=password \
		-v lucent-db-data:/var/lib/postgresql/data \
		pgvector/pgvector:pg17

ingestion: db
	cd seed; \
	rm -rf downloads; \
	poetry install; \
	LOG_LEVEL=DEBUG; \
	chamber exec lucent -- poetry run python main.py --mode ingestion

embeddings: db
	cd seed; \
	poetry install; \
	chamber exec lucent -- poetry run python main.py --mode embeddings

bot:
	cd server; \
	poetry install; \
 	chamber exec lucent -- poetry run python bot.py

models:
	cd server; \
	poetry install; \
	poetry run python models.py

local-db:
	docker rm -f external-db || true
	docker volume rm external-db-data || true
	docker run -d --name external-db -p 5433:5432 \
		-e POSTGRES_DB=postgres \
		-e POSTGRES_USER=root \
		-e POSTGRES_PASSWORD=password \
		-v external-db-data:/var/lib/postgresql/data \
		pgvector/pgvector:pg17
	sleep 2
	cd seed; \
	poetry install; \
	poetry run python generate_local_db.py