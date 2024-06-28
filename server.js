const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const lockFile = require('proper-lockfile');

const app = express();
const port = 3000;
const password = '12345';

const logFilePath = path.join(__dirname, 'log.jsonl');
const dnsLog = path.join(__dirname, 'dns_leak_logs.json');

// Create log file if it does not exist
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
}

async function retrieveDnsLeakLogs() {
    const logs = fs.readFileSync(dnsLog, 'utf-8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line));
    return logs;
}

app.use((req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
    req.forwardedFor = ip;
    next();
});

app.use(bodyParser.json());
app.use(cors());

app.post('/api/visitor-info', async (req, res) => {
    const visitorData = req.body;
    const augmentedData = {
        ...visitorData,
        forwardedFor: req.forwardedFor,
        realIp: req.headers['x-real-ip'],
        cfIp: req.headers['cf-connecting-ip'],
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

app.post('/log', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token !== password) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const logs = fs.readFileSync(logFilePath, 'utf-8')
            .trim()
            .split('\n')
            .map(line => JSON.parse(line));
        const dnsLeaks = await retrieveDnsLeakLogs();
        logs.forEach(log => {
            const dnsLeak = dnsLeaks.find(dns => dns.uid === log.uid);
            log.dnsLeak = dnsLeak ? dnsLeak.ips : [];
        });
        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: 'Error reading log file' });
    }
});

app.delete('/log', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (token !== password) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        fs.writeFileSync(logFilePath, '');
        res.json({ message: 'Log file cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Error clearing log file' });
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Instead of 404, we serve index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://IP:${port}`);
});
