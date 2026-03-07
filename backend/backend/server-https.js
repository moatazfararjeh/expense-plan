const https = require('https');
const fs = require('fs');
const path = require('path');
const app = require('./server-app');

require('dotenv').config();

const PORT = process.env.HTTPS_PORT || 5003;

// SSL Certificate paths
const sslPath = path.join(__dirname, 'ssl');
const privateKeyPath = path.join(sslPath, 'localhost.key');
const certificatePath = path.join(sslPath, 'localhost.crt');
const pfxPath = path.join(sslPath, 'localhost.pfx');

let httpsOptions;

// Try to load certificate
if (fs.existsSync(pfxPath)) {
  // Use PFX (Windows PowerShell generated)
  console.log('Loading PFX certificate...');
  httpsOptions = {
    pfx: fs.readFileSync(pfxPath),
    passphrase: process.env.CERT_PASSPHRASE || 'dev-cert-password'
  };
} else if (fs.existsSync(privateKeyPath) && fs.existsSync(certificatePath)) {
  // Use separate key and cert files (OpenSSL generated)
  console.log('Loading certificate and key files...');
  httpsOptions = {
    key: fs.readFileSync(privateKeyPath),
    cert: fs.readFileSync(certificatePath)
  };
} else {
  console.error('SSL certificate not found!');
  console.error('Please run: .\\setup-https.ps1');
  process.exit(1);
}

// Create HTTPS server
const httpsServer = https.createServer(httpsOptions, app);

httpsServer.listen(PORT, () => {
  console.log(` HTTPS Server is running on port ${PORT}`);
  console.log(` Visit: https://localhost:${PORT}`);
  console.log('');
  console.log('  Note: You will see a security warning in your browser.');
  console.log('   This is normal for self-signed certificates.');
  console.log('   Click "Advanced" and "Proceed to localhost (unsafe)"');
  console.log('');
});

module.exports = httpsServer;
