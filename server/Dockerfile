# Use Python 3.12 image as base
FROM python:3.12

# Install Poetry
RUN pip install poetry

# Set work directory
WORKDIR /app

# Copy Poetry configuration files
COPY pyproject.toml poetry.lock ./

# Configure Poetry: Don't create virtual environment (we're in container)
RUN poetry config virtualenvs.create false

# Install dependencies
RUN poetry install --no-interaction --no-ansi

# Copy source code
COPY . .

# Default command to run the application
CMD ["python", "main.py"]