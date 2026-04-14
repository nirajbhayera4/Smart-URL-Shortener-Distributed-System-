# Smart URL Shortener (Distributed System)

A URL shortener built with Node.js and Express that stores URL mappings in MySQL and uses Redis as a read cache for fast redirects.

## Features

- Shortens long URLs using `nanoid` (6-character code)
- Stores mappings in MySQL (`urls` table)
- Uses Redis cache for faster repeated lookups
- Redirect endpoint (`GET /:code`) and debug endpoint (`GET /test/:code`)

## Tech Stack

- Node.js
- Express
- MySQL (`mysql2`)
- Redis (`redis`)
- NanoID

## Prerequisites

- Node.js 14+
- npm
- MySQL server running locally
- Redis server running locally

## Installation

1. Clone the repository and open the project folder.
2. Install dependencies:

```bash
npm install
```

## Database Setup

Create a MySQL database and table:

```sql
CREATE DATABASE IF NOT EXISTS url_shortener;
USE url_shortener;

CREATE TABLE IF NOT EXISTS urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  long_url TEXT NOT NULL,
  short_code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Configuration

Current local configuration used in code:

- MySQL host: `localhost`
- MySQL user: `root`
- MySQL database: `url_shortener`
- Redis URL: `redis://127.0.0.1:6379`
- App port: `3000`

Note: Your MySQL password is currently hardcoded in `db.js`. For production, move credentials to environment variables.

## Run the Server

```bash
node server.js
```

Server starts at:

```text
http://localhost:3000
```

## API Endpoints

### 1. Shorten URL

- Method: `POST`
- Route: `/shorten`
- Body:

```json
{
  "longUrl": "https://www.example.com"
}
```

- Success response:

```json
{
  "shortUrl": "http://localhost:3000/abc123",
  "code": "abc123"
}
```

### 2. Redirect to Original URL

- Method: `GET`
- Route: `/:code`
- Behavior:
  - Checks Redis first (cache hit -> redirect)
  - On cache miss, fetches from MySQL, caches for 1 hour (`EX: 3600`), then redirects

### 3. Test Lookup Source

- Method: `GET`
- Route: `/test/:code`
- Response example:

```json
{
  "longUrl": "https://www.example.com",
  "source": "redis"
}
```

(`source` can be `redis` or `mysql`.)

## Quick Test with cURL

```bash
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl":"https://www.google.com"}'

curl -L http://localhost:3000/<code>

curl http://localhost:3000/test/<code>
```

## Project Structure

```text
.
|-- db.js
|-- redisclient.js
|-- server.js
|-- package.json
|-- package-lock.json
`-- README.md
```

## Future Improvements

- Move DB/Redis configuration to `.env`
- Add URL validation
- Add rate limiting
- Add analytics (click count, timestamps)
- Add custom short code support
- Add tests and CI
