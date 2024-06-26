const express = require('express');
const dns = require('dns');
const bodyParser = require('body-parser');
const os = require('os');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const lockFile = require('proper-lockfile');

const app = express();
const port = 3000;

const logFilePath = path.join(__dirname, 'log.jsonl');

// Create log file if it does not exist
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
}
app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    req.realIp = ip;
    next();
});

app.use(bodyParser.json());
app.use(cors());

app.post('/api/visitor-info', async (req, res) => {
    const visitorData = req.body;

    // Add DNS leak information
    const dnsServers = dns.getServers();
    const hostname = os.hostname();

    const augmentedData = {
        ...visitorData,
        dnsLeakInfo: {
            hostname: hostname,
            dnsServers: dnsServers
        },
        realIp: req.realIp,
        referer: req.headers.referer,
        headers: req.headers,
        timestamp: new Date().toISOString()
    };

    console.log(JSON.stringify(augmentedData, null, 2));

    try {
        await lockFile.lock(logFilePath);
        fs.appendFileSync(logFilePath, JSON.stringify(augmentedData) + '\n');
        lockFile.unlock(logFilePath);
    } catch (err) {
        console.error('Error writing to log file', err);
    }

    res.json(augmentedData);
});

app.post('/log', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token !== '12345') {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const logs = fs.readFileSync(logFilePath, 'utf-8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line));
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Error reading log file' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://IP:${port}`);
});
