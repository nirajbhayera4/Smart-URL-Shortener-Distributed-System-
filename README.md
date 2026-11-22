# Shortr — Smart URL Shortener

A React and Express URL shortener. The frontend runs as its own Vite app; the backend creates short codes and stores URL mappings in MySQL. Redis caches lookups to speed up redirects.

## Features

- React landing page with URL validation, shortening, and copy-to-clipboard
- Six-character short codes generated with Nano ID
- MySQL storage for original URLs and short codes
- Redis read cache with a one-hour TTL; redirects fall back to MySQL if Redis is unavailable
- Redirect endpoint (`GET /:code`) and lookup-source endpoint (`GET /test/:code`)
- Database and service configuration loaded from a private `.env` file

## Requirements

- Node.js 22.12+ (or 20.19+) and npm
- MySQL running locally
- Redis is optional; without it, URL lookup uses MySQL
- Internet access for Google Fonts

## Install

From the project root, install backend dependencies:

```bash
npm install
```

Install frontend dependencies separately:

```bash
cd frontend
npm install
cd ..
```

## Database setup

Connect to your MySQL server in Workbench and run:

```sql
CREATE DATABASE IF NOT EXISTS url_shortener;
USE url_shortener;

CREATE TABLE IF NOT EXISTS urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  long_url TEXT NOT NULL,
  short_code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS url_clicks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  short_code VARCHAR(20) NOT NULL,
  clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_url_clicks_code_time (short_code, clicked_at),
  CONSTRAINT fk_url_clicks_url
    FOREIGN KEY (short_code) REFERENCES urls(short_code)
    ON DELETE CASCADE
);
```

The MySQL account configured in `.env` must be allowed to access this database and table.

## Configuration

The backend reads settings from `.env` in the project root. Use `.env.example` as the template and set `DB_PASSWORD` to the password for your MySQL account.

| Variable | Default | Description |
| --- | --- | --- |
| `DB_HOST` | `127.0.0.1` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | empty | MySQL password |
| `DB_NAME` | `url_shortener` | MySQL schema |
| `REDIS_URL` | `redis://127.0.0.1:6379` | Redis connection URL |
| `PORT` | `3000` | Backend port and local short-link port |

`.env` is ignored by Git. Do not commit it or put real credentials in `.env.example`.

## Run locally

Start the backend from the project root:

```bash
npm start
```

In a second terminal, start the frontend:

```bash
cd frontend
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. The frontend proxies `/shorten`, `/test`, and `/analytics` requests to the backend at `http://localhost:3000`. The generated short URLs point to the backend, which handles redirects.

## Build the frontend

From the `frontend` directory:

```bash
npm run build
npm run preview
```

Vite writes production assets to `frontend/dist`. The backend currently serves the API and redirects; deploy the built frontend separately or configure a web server to serve those assets.

## API

### Shorten a URL

`POST /shorten`

Request JSON:

```json
{
  "longUrl": "https://www.example.com"
}
```

Success response:

```json
{
  "shortUrl": "http://localhost:3000/abc123",
  "code": "abc123"
}
```

### Redirect to the original URL

`GET /:code` checks Redis first, then MySQL on a cache miss. A successful MySQL lookup is cached in Redis for one hour when Redis is available. Each redirect records a click timestamp in `url_clicks` before redirecting. If click logging fails, the server logs the error and still redirects.

### Inspect a short code

`GET /test/:code` returns the original URL and whether it came from Redis or MySQL:

```json
{
  "longUrl": "https://www.example.com",
  "source": "redis"
}
```

### View click analytics

`GET /analytics/:code` returns the link creation time, total click count, latest click time, daily click counts for the last seven days, and up to 20 recent click timestamps. The React page shows daily counts in an animated bar chart; select **View analytics** after creating a link.

```json
{
  "code": "abc123",
  "longUrl": "https://www.example.com",
  "createdAt": "2026-01-02T03:04:05.000Z",
  "clickCount": 12,
  "lastClickedAt": "2026-01-03T03:04:05.000Z",
  "dailyClicks": [{ "day": "2026-01-03", "clicks": 4 }],
  "recentClicks": ["2026-01-03T03:04:05.000Z"]
}
```

After shortening a link in the React page, select **View analytics** to see its click count and timestamps. Select **Refresh analytics** to update the values after more visits.

Run the database setup SQL above to create `url_clicks`. If the `urls` table already exists, run only the `CREATE TABLE url_clicks` statement.

## Project structure

```text
.
├── frontend/
│   ├── src/
│   │   ├── app.js
│   │   ├── analytics.css
│   │   ├── chart.css
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── controllers.js/
├── routes/
├── db.js
├── redisclient.js
├── server.js
├── .env.example
├── package.json
└── README.md
```
## Future Improvements

- Add server-side URL validation
- Add rate limiting
- Add custom short code support
- Add automated tests and continuous integration (CI)
