# Shortr — Smart URL Shortener

Shortr turns long web addresses into shareable short links. The React frontend runs as a Vite app, while an Express backend stores links and click activity in MySQL and uses Redis to cache redirect lookups.

## Features

- Responsive React interface with URL entry, short-link creation, and copy-to-clipboard
- Backend validation accepts HTTP and HTTPS URLs up to 2,048 characters
- Unique six-character short codes generated with Nano ID
- MySQL tables for links and click events; the backend creates the configured database and tables at startup
- Optional Redis lookup cache with a one-hour TTL; requests fall back to MySQL when Redis is unavailable
- Click tracking and a link analytics dashboard with total clicks, creation and latest-visit times, a seven-day chart, and up to 20 recent visits
- Configurable database, Redis, and server settings via a private `.env` file

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

At startup, the backend creates the configured database and the `urls` and `url_clicks` tables if they do not already exist. The MySQL account must have permission to create the database and tables. To create them manually instead, run the following SQL (replace `url_shortener` if `DB_NAME` is different):

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

If your MySQL account cannot create databases, create the database and tables manually and grant that account access before starting the backend.

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

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. Vite proxies `/shorten`, `/test`, and `/analytics` requests to `http://localhost:3000`. Short links point to the backend, which records clicks and redirects visitors.

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

`GET /:code` checks Redis first, then MySQL on a cache miss. A successful MySQL lookup is cached in Redis for one hour when Redis is available. Each redirect records a click timestamp in `url_clicks`; a click-logging error is logged and does not prevent the redirect.

### Inspect a short code

`GET /test/:code` returns the original URL and whether it came from Redis or MySQL:

```json
{
  "longUrl": "https://www.example.com",
  "source": "redis"
}
```

### View click analytics

`GET /analytics/:code` returns the link creation time, total click count, latest click time, daily click counts for the last seven days, and up to 20 recent click timestamps. The frontend's analytics dashboard loads on demand and can be refreshed after more visits.

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

After creating a link, choose **Load analytics** in the dashboard to view its activity. Choose **Refresh data** to update the values after more visits.

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
│   └── urlController.js
├── routes/
│   └── urlRouted.js
├── db.js
├── redisclient.js
├── server.js
├── .env.example
├── package.json
└── README.md
```
## Potential next steps

- Add rate limiting and custom short codes
- Add automated tests and continuous integration (CI)
