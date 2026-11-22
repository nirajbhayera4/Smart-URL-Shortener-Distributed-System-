const { createClient } = require('redis');

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 250, 3000),
  },
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err.message);
});

(async () => {
  try {
    await redisClient.connect();
    console.log('Redis connected');
  } catch (error) {
    console.error('Could not connect to Redis:', error.message);
  }
})();

module.exports = redisClient;
