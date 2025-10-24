# Lucent Toolkit - CSIT321 Project (Green Gravity)

A full-stack application built with React frontend, Python Flask API, and PostgreSQL database, designed for data management and machine learning workflows.

## Prerequisites

Before running the application, ensure you have the following tools installed:

- **Docker & Docker Compose** - For containerized deployment
- **AWS CLI** - For AWS service integration  
- **aws-vault** - For secure AWS credential management
- **jq** - For JSON parsing in Makefile commands
- **Node.js & npm** - For frontend development
- **Python & Poetry** - For backend development

## Installation Commands

**Linux Ubuntu/Windows (WSL)**
### 0.1 Install Ubuntu for WSL
(**Only required for windows WSL**)

assumes that wsl is already installed and docker desktop is installed
```bash
wsl --install ubuntu
```

### 0.2 Configure Docker Desktop
1. Launch Docker desktop 
2. Enable the WSL integration: 
Settings > Resources > WSL integration
3. Enable Ubuntu and Apply

>Leave Docker Desktop open while installing and running Lucent

### 1. Navigate to Project Directory
```bash
cd lucent-v1
```

### 2. Install dependencies
#### 2.1 Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

>Ignore docker desktop already installed warning and wait 20 seconds for the install to begin
#### 2.2 Node
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
```

#### 2.3 other core dependencies
```bash
sudo apt update
sudo apt install python3 python3-pip python3-poetry unzip gnome-keyring dbus jq nodejs docker-compose-plugin docker-compose
```

#### 2.4 aws vault and aws cli
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo unzip awscliv2.zip
sudo ./aws/install 
```

>note: Unzipping takes a long time then installing will give an error then show nothing happening, this is expected just wait until the process is fully complete

```bash
sudo wget https://github.com/99designs/aws-vault/releases/latest/download/aws-vault-linux-amd64
sudo mv aws-vault-linux-amd64 /usr/local/bin/aws-vault
sudo chmod +x /usr/local/bin/aws-vault
```

### 3. AWS Vault setup
#### 3.1 add lucent admin

```bash
sudo aws-vault add lucent-admin
```

* Enter the access ID and secret keys provided
* When pesented with a popup to provide a username and password, leave blank and continue.

#### 3.2 set aws region
```bash
echo -n "region=ap-southeast-2" | sudo tee -a /root/.aws/config > /dev/null 
```

## macOS (using Homebrew):
```bash
brew install awscli aws-vault jq docker docker-compose node poetry
```

## Quick Start

1. **Start the full application:**
   ```bash
   aws-vault exec lucent-admin -- make up
   ```

2. **For development mode:**
   ```bash
   # Start database only
   make db
   
   # Start API server (in separate terminal)
   make api
   
   # Start web client (in separate terminal)  
   make web
   ```

## Available Commands

| Command | Description |
|---------|-------------|
| `make build` | Build Docker containers |
| `make up` | Start the full application (requires aws-vault) |
| `make down` | Stop the application |
| `make web` | Start frontend development server |
| `make api` | Start backend API server |
| `make db` | Start PostgreSQL database only |
| `make seed-db` | Seed database with initial data |
| `make bot` | Run chatbot service |
| `make print-secrets` | Display AWS secrets |
| `make clean` | Remove containers and volumes |

All interactions with AWS requires the inline `aws-vault` script to be run. This executes the terminal command proceeding `--` with the AWS credentials stored in the users keychain (without using a subshell). Any command in the makefile with `chamber exec` does the same, executing a command with secrets loaded into the environmnet. In order for chamber to get these secrets from SSM, it requires AWS authentication credentials, hence there will be scripts like:
```bash
aws-vault exec <account> -- chamber exec <my-parameter-store> -- <command>
```

## Uploading new files to the AWS bucket
### 1. list files in the bucket
```bash
aws-vault exec lucent-admin -- aws s3 ls s3://greengravity-archive/
```

### 2. Upload files
```bash
aws-vault exec lucent-admin -- aws s3 cp <file-name> s3://greengravity-archive/
```


> run both commands with sudo for ubuntu/wsl hosts

## Access Points

Once running, the application will be available at:

- **Frontend:** http://localhost:5173
- **API:** http://localhost:5174  
- **Database:** localhost:5432
  - Username: `postgres`
  - Password: `password`
  - Database: `root`

## Architecture

The application follows a modern full-stack architecture:

**Client Tier:**
- React with TypeScript for type safety
- Vite for fast development and building
- Modern JavaScript tooling

**Server Tier:**
- Python Flask REST API
- Poetry for dependency management
- Modular service architecture

**Data Tier:**
- PostgreSQL database
- Custom initialization scripts
- Data seeding service for development

**Infrastructure:**
- Docker containerization
- Docker Compose orchestration
- AWS integration for secrets management

## Environment Configuration

The application uses AWS Secrets Manager to securely fetch API keys. Ensure your AWS profile has access to the `lucent-secrets` secret containing:

- `OPENAI_API_KEY` - For AI/ML integrations
- `GOOGLE_MAPS_API_KEY` - For server-side mapping features  
- `VITE_GOOGLE_MAPS_API_KEY` - For client-side mapping features

## Troubleshooting

**Common Issues:**

- **Docker permission errors:** Ensure your user is in the `docker` group (Linux/macOS)
- **Port conflicts:** Check if ports 5173, 5174, or 5432 are already in use
- **AWS credential issues:** Verify aws-vault configuration with `aws-vault list`
- **Database connection errors:** Ensure PostgreSQL container is running with `docker ps`