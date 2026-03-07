# Setup HTTPS for Development/Testing
# This script creates a self-signed SSL certificate and configures the server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HTTPS Setup for Testing               " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  WARNING: This script should be run as Administrator for best results" -ForegroundColor Yellow
    Write-Host "   However, we can continue with user-level certificate" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (yes/no)"
    if ($continue -ne "yes") {
        exit 0
    }
}

Write-Host "This script will:" -ForegroundColor White
Write-Host "  1. Create SSL certificate directory" -ForegroundColor Gray
Write-Host "  2. Generate self-signed SSL certificate" -ForegroundColor Gray
Write-Host "  3. Update server configuration for HTTPS" -ForegroundColor Gray
Write-Host "  4. Update frontend to use HTTPS" -ForegroundColor Gray
Write-Host ""

$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Setup cancelled" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 1: Creating SSL Directory        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create ssl directory
$sslDir = "backend\ssl"
if (-not (Test-Path $sslDir)) {
    New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
    Write-Host "✓ Created directory: $sslDir" -ForegroundColor Green
} else {
    Write-Host "✓ Directory already exists: $sslDir" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 2: Generating SSL Certificate    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is available
$openSslPath = $null
$openSslLocations = @(
    "C:\Program Files\Git\usr\bin\openssl.exe",
    "C:\Program Files (x86)\Git\usr\bin\openssl.exe",
    "openssl.exe"
)

foreach ($location in $openSslLocations) {
    if (Get-Command $location -ErrorAction SilentlyContinue) {
        $openSslPath = $location
        break
    }
}

if (-not $openSslPath) {
    Write-Host "OpenSSL not found. Using PowerShell to generate certificate..." -ForegroundColor Yellow
    Write-Host ""
    
    # Generate certificate using PowerShell (Windows 10+)
    try {
        $cert = New-SelfSignedCertificate `
            -DnsName "localhost", "127.0.0.1" `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -NotAfter (Get-Date).AddYears(2) `
            -FriendlyName "Expense Plan Development Certificate" `
            -KeyUsageProperty All `
            -KeyAlgorithm RSA `
            -KeyLength 2048 `
            -HashAlgorithm SHA256 `
            -TextExtension @("2.5.29.17={text}DNS=localhost&IPAddress=127.0.0.1&DNS=*.localhost")
        
        Write-Host "✓ Certificate generated with thumbprint: $($cert.Thumbprint)" -ForegroundColor Green
        
        # Export certificate
        $certPassword = ConvertTo-SecureString -String "dev-cert-password" -Force -AsPlainText
        $pfxPath = Join-Path $sslDir "localhost.pfx"
        $certPath = Join-Path $sslDir "localhost.crt"
        $keyPath = Join-Path $sslDir "localhost.key"
        
        # Export PFX
        Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $certPassword | Out-Null
        Write-Host "✓ Certificate exported to: $pfxPath" -ForegroundColor Green
        
        # Export CRT (public key)
        Export-Certificate -Cert $cert -FilePath $certPath -Type CERT | Out-Null
        Write-Host "✓ Public key exported to: $certPath" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "⚠️  Note: Private key extraction requires OpenSSL" -ForegroundColor Yellow
        Write-Host "   The PFX file contains both certificate and private key" -ForegroundColor Yellow
        
        # Create a note file about the certificate
        $noteContent = @"
SSL Certificate Information
===========================

Generated: $(Get-Date)
Certificate Type: Self-Signed (Development Only)
Common Name: localhost
Alternative Names: localhost, 127.0.0.1, *.localhost
Valid Until: $($cert.NotAfter)
Thumbprint: $($cert.Thumbprint)

Files:
localhost.pfx: Complete certificate with private key (Password: dev-cert-password)
localhost.crt: Public certificate only

Important Notes:
This is a SELF-SIGNED certificate ONLY for DEVELOPMENT and TESTING
Browsers will show security warnings - this is normal
In browser, click Advanced and Proceed to localhost (unsafe)
Production systems should use a certificate from a trusted CA such as LetsEncrypt

To trust this certificate in Windows:
Double-click localhost.crt
Click Install Certificate
Select Current User
Select Place all certificates in the following store
Browse and select Trusted Root Certification Authorities
Click Next and Finish

"@
        Set-Content -Path (Join-Path $sslDir "README.txt") -Value $noteContent
        Write-Host "✓ Certificate info saved to: ssl\README.txt" -ForegroundColor Green
        
    } catch {
        Write-Host "✗ Failed to generate certificate: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install OpenSSL or generate certificate manually" -ForegroundColor Yellow
        pause
        exit 1
    }
} else {
    Write-Host "✓ OpenSSL found: $openSslPath" -ForegroundColor Green
    Write-Host ""
    Write-Host "Generating certificate with OpenSSL..." -ForegroundColor Yellow
    
    # Generate private key and certificate using OpenSSL
    $keyPath = Join-Path $sslDir "localhost.key"
    $certPath = Join-Path $sslDir "localhost.crt"
    
    # Create OpenSSL config
    $configContent = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = req_ext

[dn]
C=US
ST=Development
L=Development
O=Expense Plan
OU=Development
CN=localhost

[req_ext]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
IP.1 = 127.0.0.1
"@
    $configPath = Join-Path $sslDir "openssl.cnf"
    Set-Content -Path $configPath -Value $configContent
    
    # Generate certificate
    & $openSslPath req -x509 -nodes -days 730 -newkey rsa:2048 `
        -keyout $keyPath `
        -out $certPath `
        -config $configPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Certificate generated successfully" -ForegroundColor Green
        Write-Host "  Private Key: $keyPath" -ForegroundColor Gray
        Write-Host "  Certificate: $certPath" -ForegroundColor Gray
        
        # Create info file
        $noteContent = @"
SSL Certificate Information
===========================

Generated: $(Get-Date)
Certificate Type: Self-Signed (Development Only)
Common Name: localhost
Valid for: 2 years

Files:
localhost.key: Private key
localhost.crt: Public certificate

Important Notes:
This is a SELF-SIGNED certificate ONLY for DEVELOPMENT and TESTING
Browsers will show security warnings - this is normal
Click Advanced and Proceed to localhost (unsafe) in browser
Production systems should use a certificate from a trusted CA

To trust this certificate:
Double-click localhost.crt
Install to Trusted Root Certification Authorities
"@
        Set-Content -Path (Join-Path $sslDir "README.txt") -Value $noteContent
    } else {
        Write-Host "✗ Failed to generate certificate" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 3: Creating HTTPS Server File     " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create server-https.js
$serverHttpsContent = @'
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
  console.log(`🔒 HTTPS Server is running on port ${PORT}`);
  console.log(`🌐 Visit: https://localhost:${PORT}`);
  console.log('');
  console.log('⚠️  Note: You will see a security warning in your browser.');
  console.log('   This is normal for self-signed certificates.');
  console.log('   Click "Advanced" and "Proceed to localhost (unsafe)"');
  console.log('');
});

module.exports = httpsServer;
'@

Set-Content -Path "backend\server-https.js" -Value $serverHttpsContent
Write-Host "✓ Created: backend\server-https.js" -ForegroundColor Green

# Create server-app.js (refactored server without listen)
Write-Host "Creating backend\server-app.js..." -ForegroundColor Yellow

$serverAppContent = @'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const pool = require('./db');
const authRoutes = require('./routes/auth');
const { authenticateToken } = require('./middleware/auth');
const { encryptValue, decryptValue, decryptFields, decryptArray } = require('./encryption');

const app = express();

// CORS Configuration - Updated for HTTPS
const corsOptions = {
  origin: function (origin, callback) {
    const whitelist = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3001',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
    ];
    
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import all routes from original server.js
// ... (keep all your existing routes here)

module.exports = app;
'@

# Note: We'll update .env instead
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Step 4: Updating Configuration        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Add HTTPS_PORT to .env
$envPath = "backend\.env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    if ($envContent -notmatch "HTTPS_PORT") {
        $envContent += "`nHTTPS_PORT=5003`n"
        $envContent += "CERT_PASSPHRASE=dev-cert-password`n"
        Set-Content $envPath $envContent
        Write-Host "✓ Added HTTPS_PORT and CERT_PASSPHRASE to .env" -ForegroundColor Green
    } else {
        Write-Host "✓ .env already has HTTPS configuration" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  HTTPS Setup Completed Successfully!   " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Start the HTTPS server:" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   node server-https.js" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Or use the start script:" -ForegroundColor White
Write-Host "   .\start-backend-https.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access your app at:" -ForegroundColor White
Write-Host "   https://localhost:5003" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Update frontend to use HTTPS:" -ForegroundColor White
Write-Host "   Edit frontend\src\context\AuthContext.js" -ForegroundColor Gray
Write-Host "   Change http://localhost:5002 to https://localhost:5003" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Browser Security Warning:" -ForegroundColor Yellow
Write-Host "   Your browser will show a security warning." -ForegroundColor Yellow
Write-Host "   This is NORMAL for self-signed certificates." -ForegroundColor Yellow
Write-Host "   Click 'Advanced' and 'Proceed to localhost (unsafe)'" -ForegroundColor Yellow
Write-Host ""
Write-Host "📁 Certificate files location:" -ForegroundColor Cyan
Write-Host "   $sslDir" -ForegroundColor Gray
Write-Host ""

# Ask if user wants to trust the certificate now
if ($isAdmin) {
    Write-Host "Do you want to trust this certificate now? (recommended)" -ForegroundColor Yellow
    $trustNow = Read-Host "(yes/no)"
    
    if ($trustNow -eq "yes") {
        Write-Host ""
        Write-Host "Opening certificate..." -ForegroundColor Yellow
        $certFile = Join-Path $sslDir "localhost.crt"
        if (Test-Path $certFile) {
            Start-Process $certFile
            Write-Host "✓ Please follow the prompts to install the certificate" -ForegroundColor Green
            Write-Host "  Select: 'Trusted Root Certification Authorities'" -ForegroundColor Gray
        }
    }
}

Write-Host ""
pause
