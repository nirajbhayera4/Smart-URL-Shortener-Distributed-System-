function validateWebUrl(value) {
    if (typeof value !== 'string' || value.length > 2048) return false;

    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname);
    } catch {
        return false;
    }
}

module.exports = { validateWebUrl };
