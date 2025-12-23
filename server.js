const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const os = require('os');

const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Get network IP addresses
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  
  return ips;
}

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, hostname, (err) => {
    if (err) throw err;
    
    const networkIPs = getNetworkIPs();
    
    console.log('');
    console.log('  ▲ Next.js 14.2.1');
    console.log(`  - Local:        http://localhost:${port}`);
    
    if (networkIPs.length > 0) {
      networkIPs.forEach((ip, index) => {
        if (index === 0) {
          console.log(`  - Network:      http://${ip}:${port}`);
        } else {
          console.log(`                 http://${ip}:${port}`);
        }
      });
    } else {
      console.log(`  - Network:      http://0.0.0.0:${port}`);
    }
    
    console.log('');
    console.log('  ✓ Ready');
    console.log('');
  });
});

