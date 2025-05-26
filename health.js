const http = require('http');
const logger = require('./logger');

function startHealthServer(port = 3000) {
    const server = http.createServer((req, res) => {
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: "ok" }));
        } else {
            res.writeHead(404);
            res.end();
        }
    });
    server.listen(port, () => {
        logger.info(`[HEALTH] Health-Endpoint läuft auf Port ${port}`);
    });
}

module.exports = { startHealthServer };