const os = require('os');
const path = require('path');

const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || process.argv[2] || '3000', 10);

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

// Set environment variables
process.env.HOSTNAME = hostname;
process.env.PORT = port;

// Load and start the standalone server
const serverPath = path.join(process.cwd(), '.next/standalone/server.js');

// Show IPs after a short delay to allow server to start
setTimeout(() => {
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
}, 100);

// Start the standalone server
require(serverPath);

