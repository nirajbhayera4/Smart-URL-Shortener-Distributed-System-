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
        if (error) console.error('Could not record click:', error.code || error.message);
        res.redirect(longUrl);
    });
}

function query(sql, params = []) {
    return db.promise().query(sql, params).then(([rows]) => rows);
}
function validateWebUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return false;

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
        return false;
    }
}

async function initializeDatabase() {
    const configuredName = process.env.DB_NAME || 'url_shortener';
    if (!/^[A-Za-z0-9_$]+$/.test(configuredName)) {
        throw new Error('DB_NAME may contain only letters, numbers, underscores, and dollar signs.');
    }

    // Connect without selecting a schema so a fresh local database can be created.
    await query(`CREATE DATABASE IF NOT EXISTS \`${configuredName}\``);
    await query(`USE \`${configuredName}\``);
    await query(`CREATE TABLE IF NOT EXISTS urls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        long_url TEXT NOT NULL,
        short_code VARCHAR(20) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await query(`CREATE TABLE IF NOT EXISTS url_clicks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        short_code VARCHAR(20) NOT NULL,
        clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_url_clicks_code_time (short_code, clicked_at),
        CONSTRAINT fk_url_clicks_url FOREIGN KEY (short_code)
            REFERENCES urls(short_code) ON DELETE CASCADE
    )`);
    console.log(`Database ready: ${configuredName} (urls, url_clicks)`);
}

// POST - create short URL
app.post('/shorten', (req, res) => {
    const { longUrl } = req.body;
    if (!validateWebUrl(longUrl)) {
        return res.status(400).json({
            error: 'Please provide a valid HTTP or HTTPS URL (up to 2048 characters).',
        });
    }

    if (!longUrl) {
        return res.status(400).json({ error: 'Please provide a long URL' });
    }

    const code = nanoid(6);

    db.query(
        'INSERT INTO urls (long_url, short_code) VALUES (?, ?)',
        [longUrl, code],
        (err, result) => {
            if (err) {
                console.error('Could not create short URL:', err.code || err.message);
                return res.status(500).json({ error: 'Could not save the short URL. Check the backend database log.' });
            }

            res.json({
                shortUrl: `http://localhost:${PORT}/${code}`,
                code: code
            });
        }
    );
});

// GET - analytics for a short URL
app.get('/analytics/:code', async (req, res) => {
    const { code } = req.params;

    try {
        const links = await query(
            `SELECT short_code AS code, long_url AS longUrl, created_at AS createdAt
             FROM urls WHERE short_code = ? LIMIT 1`,
            [code]
        );
        if (links.length === 0) return res.status(404).json({ error: 'URL not found' });

        const [counts] = await query(
            `SELECT COUNT(*) AS clickCount, MAX(clicked_at) AS lastClickedAt
             FROM url_clicks WHERE short_code = ?`,
            [code]
        );
        const recentClicks = await query(
            'SELECT clicked_at AS clickedAt FROM url_clicks WHERE short_code = ? ORDER BY clicked_at DESC LIMIT 20',
            [code]
        );
        const dailyClicks = await query(
            `SELECT DATE_FORMAT(clicked_at, '%Y-%m-%d') AS day, COUNT(*) AS clicks
             FROM url_clicks
             WHERE short_code = ? AND clicked_at >= CURDATE() - INTERVAL 6 DAY
             GROUP BY DATE_FORMAT(clicked_at, '%Y-%m-%d')
             ORDER BY day ASC`,
            [code]
        );

        return res.json({
            ...links[0],
            clickCount: counts.clickCount,
            lastClickedAt: counts.lastClickedAt,
            recentClicks: recentClicks.map(({ clickedAt }) => clickedAt),
            dailyClicks,
        });
    } catch (error) {
        console.error(`Analytics query failed for ${code}:`, error.code || error.message);
        return res.status(500).json({ error: 'Could not load analytics. Check the backend log for the database error.' });
    }
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

initializeDatabase()
    .catch((error) => {
        console.error('Database initialization failed:', error.code || error.message);
    })
    .finally(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    });
