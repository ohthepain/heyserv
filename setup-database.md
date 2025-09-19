# Database Setup Guide

## 1. Environment Variables

Create a `.env` file in your project root with:

```bash
# Database Configuration
DATABASE_URL="postgresql://postgres:your-password@localhost:5432/heyserv"

# PostgreSQL Configuration (for Docker Compose)
POSTGRES_DB=heyserv
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password

# Other environment variables...
OPENAI_API_KEY=your-openai-api-key
MCP_MODE=stdio
PORT=4000
```

## 2. Start PostgreSQL

```bash
# Start the PostgreSQL database
docker compose up -d

# Check if it's running
docker compose ps
```

## 3. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

## 4. Verify Setup

```bash
# Open database studio to verify
npm run db:studio
```

## 5. Database Connection

Your PostgreSQL database will be available at:

- **Host**: localhost
- **Port**: 5432 (standard PostgreSQL port)
- **Database**: heyserv
- **Username**: postgres
- **Password**: (whatever you set in POSTGRES_PASSWORD)

## Troubleshooting

If you get connection errors:

1. Make sure Docker Compose is running: `docker compose ps`
2. Check the logs: `docker compose logs postgres`
3. Verify your DATABASE_URL in .env matches your compose.yml settings
