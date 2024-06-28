const dns = require('native-dns');
const fs = require('fs');
const lockFile = require('proper-lockfile');
const path = require('path');


const dnsLogFilePath = path.join(__dirname, 'dns_leak_logs.json');
const domainStore = {};

const serverDomain = process.env.SERVER_DOMAIN;
const serverIp = process.env.SERVER_IP;

// Create a DNS server
const server = dns.createServer();

server.on('request', async (request, response) => {
  const domain = request.question[0].name;
  const subdomain = domain.split('.')[0]; // Assuming subdomain.uid.DOMAIN

  if (domain.endsWith(serverDomain)) {
    if (!domainStore[subdomain]) {
      domainStore[subdomain] = [];
    }
    domainStore[subdomain].push(request.address.address);
    console.log(`Stored address ${request.address.address} for domain ${domain}`);

    // Log the DNS leak result to a separate file
    await logDnsLeakResult(subdomain, request.address.address);

    response.answer.push(dns.A({
      name: domain,
      address: serverIp,
      ttl: 600
    }));
    response.send();
  } else {
    response.answer.push(dns.CNAME({
      name: domain,
      data: 'ghs.googlehosted.com.',
      ttl: 30
    }));
    response.send();
  }
});

server.on('error', (err) => {
  console.error('Server error:', err.stack);
});

server.serve(53);

async function logDnsLeakResult(uid, ip) {
  console.log(`Logging DNS leak result for ${uid} with IP ${ip}`);
  let release;

  try {
    // Acquire a file lock
    if (await fs.access(dnsLogFilePath).then(() => true).catch(() => false)) {
      release = await lockFile.lock(dnsLogFilePath);
    }

    // Read and parse the log file
    let logs;
    try {
      const fileContent = await fs.readFile(dnsLogFilePath, 'utf-8');
      logs = fileContent.trim().split('\n').map(line => JSON.parse(line));
    } catch (err) {
      logs = [];
    }

    // Update the log entry
    let logEntry = logs.find(log => log.uid === uid);
    if (logEntry) {
      logEntry.ips.push(ip);
    } else {
      logs.push({ uid, ips: [ip] });
    }

    // Write the updated logs back to the file
    await fs.writeFile(dnsLogFilePath, logs.map(log => JSON.stringify(log)).join('\n'));
  } catch (err) {
    console.error('Error logging DNS leak result', err);
  } finally {
    // Release the lock if it was acquired
    if (release) {
      release();
    }
  }
}