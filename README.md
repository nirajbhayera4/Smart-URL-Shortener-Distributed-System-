# Smart URL Shortener (Distributed System)

A simple and efficient URL shortener built with Node.js, Express, and NanoID. This distributed system allows you to create short URLs that redirect to longer ones.

## Features

- **Fast URL Shortening**: Generate short codes for long URLs using NanoID
- **RESTful API**: Clean API endpoints for shortening and redirecting URLs
- **In-Memory Storage**: Quick access with in-memory database (expandable to Redis)
- **Distributed Ready**: Architecture designed for horizontal scaling

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Smart URL Shortener (Distributed System)"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Starting the Server

Run the server:
```bash
node server.js
```

The server will start on `http://localhost:3000`

### API Endpoints

#### Shorten a URL
**POST** `/shorten`

Request body:
```json
{
  "longUrl": "https://www.example.com/very/long/url/that/needs/shortening"
}
```

Response:
```json
{
  "shortUrl": "http://localhost:3000/abc123",
  "code": "abc123"
}
```

#### Redirect to Original URL
**GET** `/:code`

Example: `GET http://localhost:3000/abc123` redirects to the original long URL.

## Example Usage

Using curl:

```bash
# Shorten a URL
curl -X POST http://localhost:3000/shorten \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://www.example.com"}'

# Access the short URL (this will redirect)
curl -L http://localhost:3000/abc123
```

## Project Structure

```
├── server.js          # Main server file
├── db.js              # Database configuration (for future use)
├── redisclient.js     # Redis client setup (for distributed storage)
├── controllers.js/
│   └── urlController.js  # URL handling logic (to be implemented)
├── routes/
│   └── urlRoutes.js      # Route definitions (to be implemented)
├── package.json       # Dependencies and scripts
└── README.md          # This file
```

## Future Enhancements

- [ ] Persistent database storage
- [ ] Redis integration for distributed caching
- [ ] Analytics and click tracking
- [ ] Custom short codes
- [ ] Rate limiting
- [ ] Authentication and user management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.

