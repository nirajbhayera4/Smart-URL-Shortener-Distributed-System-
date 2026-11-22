const express = require('express');
const { nanoid } = require('nanoid');
const db = require('./db');
const redisClient = require('./redisclient');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

async function getCachedUrl(code) {
    if (!redisClient.isReady) return null;
    try {
        return await redisClient.get(code);
    } catch (error) {
        console.error('Redis lookup failed; using MySQL:', error.message);
        return null;
    }
}

async function cacheUrl(code, longUrl) {
    if (!redisClient.isReady) return;
    try {
        await redisClient.set(code, longUrl, { EX: 3600 });
    } catch (error) {
        console.error('Redis cache write failed:', error.message);
    }
}

// POST - create short URL
app.post('/shorten', (req, res) => {
    const { longUrl } = req.body;

    if (!longUrl) {
        return res.status(400).json({ error: 'Please provide a long URL' });
    }

    const code = nanoid(6);

    db.query(
        'INSERT INTO urls (long_url, short_code) VALUES (?, ?)',
        [longUrl, code],
        (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({
                shortUrl: `http://localhost:${PORT}/${code}`,
                code: code
            });
        }
    );
});

// GET - redirect
app.get('/:code', async (req, res) => {
    const { code } = req.params;

    try {
        const cachedUrl = await getCachedUrl(code);

        if (cachedUrl) {
            console.log('Cache hit');
            return res.redirect(cachedUrl);
        }

        console.log('Cache miss');

        db.query(
            'SELECT long_url FROM urls WHERE short_code = ?',
            [code],
            async (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                if (result.length > 0) {
                    const longUrl = result[0].long_url;

                    await cacheUrl(code, longUrl);

                    return res.redirect(longUrl);
                } else {
                    return res.status(404).json({ error: 'URL not found' });
                }
            }
        );
    } catch (error) {
        console.error('Redirect failed:', error.message);
        return res.status(500).json({ error: 'Could not look up this URL' });
    }
});

app.get('/test/:code', async (req, res) => {
    const { code } = req.params;

    try {
        const cachedUrl = await getCachedUrl(code);

        if (cachedUrl) {
            console.log('Cache hit');
            return res.json({ longUrl: cachedUrl, source: 'redis' });
        }

        console.log('Cache miss');

        db.query(
            'SELECT long_url FROM urls WHERE short_code = ?',
            [code],
            async (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                if (result.length > 0) {
                    const longUrl = result[0].long_url;

                    await cacheUrl(code, longUrl);

                    return res.json({ longUrl, source: 'mysql' });
                } else {
                    return res.status(404).json({ error: 'URL not found' });
                }
            }
        );
    } catch (error) {
        console.error('URL lookup failed:', error.message);
        return res.status(500).json({ error: 'Could not look up this URL' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
