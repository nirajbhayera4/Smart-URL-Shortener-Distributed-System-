require('dotenv').config({ path: require('path').join(__dirname, '.env') });

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

function redirectAndRecordClick(res, code, longUrl) {
    db.query('INSERT INTO url_clicks (short_code) VALUES (?)', [code], (error) => {
        if (error) console.error('Could not record click:', error.message);
        res.redirect(longUrl);
    });
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

// GET - analytics for a short URL
app.get('/analytics/:code', (req, res) => {
    const { code } = req.params;

    db.query(
        `SELECT u.short_code AS code, u.long_url AS longUrl, u.created_at AS createdAt,
                COUNT(c.id) AS clickCount, MAX(c.clicked_at) AS lastClickedAt
         FROM urls u
         LEFT JOIN url_clicks c ON c.short_code = u.short_code
         WHERE u.short_code = ?
         GROUP BY u.short_code, u.long_url, u.created_at`,
        [code],
        (error, result) => {
            if (error) return res.status(500).json({ error: 'Database error' });
            if (result.length === 0) return res.status(404).json({ error: 'URL not found' });

            db.query(
                'SELECT clicked_at AS clickedAt FROM url_clicks WHERE short_code = ? ORDER BY clicked_at DESC LIMIT 20',
                [code],
                (clickError, clicks) => {
                    if (clickError) return res.status(500).json({ error: 'Database error' });

                    db.query(
                        `SELECT DATE_FORMAT(clicked_at, '%Y-%m-%d') AS day, COUNT(*) AS clicks
                         FROM url_clicks
                         WHERE short_code = ? AND clicked_at >= CURDATE() - INTERVAL 6 DAY
                         GROUP BY DATE(clicked_at)
                         ORDER BY day ASC`,
                        [code],
                        (dailyError, dailyClicks) => {
                            if (dailyError) return res.status(500).json({ error: 'Database error' });
                            return res.json({
                                ...result[0],
                                recentClicks: clicks.map((click) => click.clickedAt),
                                dailyClicks,
                            });
                        }
                    );
                }
            );
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
            return redirectAndRecordClick(res, code, cachedUrl);
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

                    return redirectAndRecordClick(res, code, longUrl);
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
