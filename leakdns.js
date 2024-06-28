const dns = require('native-dns');
const fs = require('fs');
const lockFile = require('proper-lockfile');
const dnsLogFilePath = './dns_leak_logs.json';

const domainStore = {};

//if (!fs.existsSync(dnsLogFilePath)) {
//  fs.writeFileSync(dnsLogFilePath, '[]');
//}

const server = dns.createServer();

server.on('request', async function (request, response) {
  const domain = request.question[0].name;
  const subdomain = domain.split('.')[0]; // Assuming subdomain.uid.DOMAIN

  if (domain.endsWith('SERVER DOMAIN')) { 
    if (!domainStore[subdomain]) {
      domainStore[subdomain] = [];
    }
    domainStore[subdomain].push(request.address.address);
    console.log(`Stored address ${request.address.address} for domain ${domain}`);

    await logDnsLeakResult(subdomain, request.address.address);


    response.answer.push(dns.A({
      name: domain,
      address: 'SERVER IP',
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

server.on('error', function (err, buff, req, res) {
  console.log(err.stack);
});

server.serve(53);

async function logDnsLeakResult(uid, ip) {
    console.log(`Logging DNS leak result for ${uid} with IP ${ip}`);
    try {
        if (fs.existsSync(dnsLogFilePath)) {
            await lockFile.lock(dnsLogFilePath);
        }
      let logs = fs.existsSync(dnsLogFilePath) ? 
        fs.readFileSync(dnsLogFilePath, 'utf-8').trim().split('\n').map(line => JSON.parse(line)) : [];
  
      let logEntry = logs.find(log => log.uid === uid);
      if (logEntry) {
        logEntry.ips.push(ip);
      } else {
        logs.push({ uid, ips: [ip] });
      }
  
      fs.writeFileSync(dnsLogFilePath, logs.map(log => JSON.stringify(log)).join('\n'));
  
      lockFile.unlock(dnsLogFilePath);
    } catch (err) {
      console.error('Error logging DNS leak result', err);
      lockFile.unlock(dnsLogFilePath);
    }
  }