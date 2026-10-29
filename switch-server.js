#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import os from 'os';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VPS_HOST = '76.13.246.224:5001';
const VPS_API = `http://${VPS_HOST}/api`;
const VPS_SOCKET = `http://${VPS_HOST}`;

// Detect primary non-internal IPv4 LAN address
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('192.168.') || net.address.startsWith('10.') || net.address.startsWith('172.'))) {
        return net.address;
      }
    }
  }
  return '10.211.183.171'; // Fallback
}

const lanIp = getLanIp();
const LOCAL_MOBILE_HOST = `${lanIp}:5001`;
const LOCAL_MOBILE_API = `http://${LOCAL_MOBILE_HOST}/api`;
const LOCAL_MOBILE_SOCKET = `http://${LOCAL_MOBILE_HOST}`;

const LOCAL_WEB_API = 'http://localhost:5001/api';
const LOCAL_WEB_SOCKET = 'http://localhost:5001';

const target = (process.argv[2] || 'status').toLowerCase();

function updateFile(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✓ Updated: ${path.relative(__dirname, filePath)}`);
  } catch (err) {
    console.error(`  ✗ Error writing ${filePath}:`, err.message);
  }
}

async function pingUrl(url, timeout = 2500) {
  return new Promise((resolve) => {
    const start = Date.now();
    try {
      const parsed = new URL(url);
      const req = http.get({
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        timeout
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          resolve({ ok: res.statusCode === 200, latency: Date.now() - start, status: res.statusCode });
        });
      });
      req.on('error', (err) => resolve({ ok: false, latency: Date.now() - start, error: err.message }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, latency: Date.now() - start, error: 'Timeout' });
      });
    } catch (e) {
      resolve({ ok: false, latency: 0, error: e.message });
    }
  });
}

async function printStatus() {
  console.log('\n======================================================');
  console.log('       WorkLogy Server Target & Health Monitor');
  console.log('======================================================');
  console.log(`Detected Mac LAN IP: ${lanIp}`);
  console.log('------------------------------------------------------');

  const localRes = await pingUrl('http://127.0.0.1:5001/api/health');
  const vpsRes = await pingUrl(`http://${VPS_HOST}/api/health`);

  console.log(`[1] Local Server (localhost:5001 / ${lanIp}:5001):`);
  if (localRes.ok) {
    console.log(`    Status:  🟢 ONLINE (${localRes.latency}ms)`);
  } else {
    console.log(`    Status:  🔴 OFFLINE (${localRes.error || 'Not running'})`);
    console.log(`    Hint:    Run 'cd backend && npm run dev' to start local server.`);
  }

  console.log(`[2] Cloud VPS Server (${VPS_HOST}):`);
  if (vpsRes.ok) {
    console.log(`    Status:  🟢 ONLINE (${vpsRes.latency}ms)`);
  } else {
    console.log(`    Status:  🔴 OFFLINE (${vpsRes.error || 'Unreachable'})`);
  }

  console.log('------------------------------------------------------');
  console.log('Current .env Configurations:');

  const files = [
    { name: 'frontend/.env', path: path.join(__dirname, 'frontend/.env'), key: 'VITE_API_BASE_URL' },
    { name: 'mobile/customer-app/.env', path: path.join(__dirname, 'mobile/customer-app/.env'), key: 'EXPO_PUBLIC_API_URL' },
    { name: 'mobile/vendor-app/.env', path: path.join(__dirname, 'mobile/vendor-app/.env'), key: 'EXPO_PUBLIC_API_URL' }
  ];

  files.forEach(f => {
    if (fs.existsSync(f.path)) {
      const content = fs.readFileSync(f.path, 'utf8');
      const match = content.match(new RegExp(`${f.key}=(.*)`));
      const val = match ? match[1].trim() : 'Not set';
      const isLocal = val.includes('localhost') || val.includes('10.') || val.includes('192.168.');
      const tag = isLocal ? '🟢 [LOCAL]' : '☁️  [VPS]  ';
      console.log(`  ${tag} ${f.name.padEnd(26)} -> ${val}`);
    } else {
      console.log(`  ⚪ [MISSING] ${f.name}`);
    }
  });

  console.log('======================================================');
  console.log('Usage:');
  console.log('  node switch-server.js local   -> Point all apps to Local Backend');
  console.log('  node switch-server.js vps     -> Point all apps to Cloud VPS Server');
  console.log('  node switch-server.js status  -> Show this status view');
  console.log('======================================================\n');
}

async function switchToLocal() {
  console.log(`\n🔄 Switching all configurations to LOCAL BACKEND (${lanIp}:5001 / localhost:5001)...`);

  // 1. Frontend
  const frontendEnv = `VITE_API_BASE_URL=${LOCAL_WEB_API}\nVITE_SOCKET_URL=${LOCAL_WEB_SOCKET}\n`;
  updateFile(path.join(__dirname, 'frontend/.env'), frontendEnv);

  // 2. Customer App
  const customerEnv = `# WorkLogy Customer App Local Backend (${lanIp})\nEXPO_PUBLIC_API_URL=${LOCAL_MOBILE_API}\nEXPO_PUBLIC_SOCKET_URL=${LOCAL_MOBILE_SOCKET}\n`;
  updateFile(path.join(__dirname, 'mobile/customer-app/.env'), customerEnv);

  // 3. Vendor App
  const vendorEnv = `# WorkLogy Vendor Pro App Local Backend (${lanIp})\nEXPO_PUBLIC_API_URL=${LOCAL_MOBILE_API}\nEXPO_PUBLIC_SOCKET_URL=${LOCAL_MOBILE_SOCKET}\n`;
  updateFile(path.join(__dirname, 'mobile/vendor-app/.env'), vendorEnv);

  console.log('\n✨ All environments are now configured for LOCAL BACKEND!');
  console.log(`- Web Frontend:  ${LOCAL_WEB_API}`);
  console.log(`- Customer App:  ${LOCAL_MOBILE_API}`);
  console.log(`- Vendor App:    ${LOCAL_MOBILE_API}`);
  console.log('\nTip: If Expo or Vite is running, reload it (press "r" in Expo terminal) to apply.');
}

async function switchToVps() {
  console.log(`\n🔄 Switching all configurations to CLOUD VPS SERVER (${VPS_HOST})...`);

  // 1. Frontend
  const frontendEnv = `VITE_API_BASE_URL=${VPS_API}\nVITE_SOCKET_URL=${VPS_SOCKET}\n`;
  updateFile(path.join(__dirname, 'frontend/.env'), frontendEnv);

  // 2. Customer App
  const customerEnv = `# WorkLogy Customer App Live VPS Backend\nEXPO_PUBLIC_API_URL=${VPS_API}\nEXPO_PUBLIC_SOCKET_URL=${VPS_SOCKET}\n`;
  updateFile(path.join(__dirname, 'mobile/customer-app/.env'), customerEnv);

  // 3. Vendor App
  const vendorEnv = `# WorkLogy Vendor Pro App Live VPS Backend\nEXPO_PUBLIC_API_URL=${VPS_API}\nEXPO_PUBLIC_SOCKET_URL=${VPS_SOCKET}\n`;
  updateFile(path.join(__dirname, 'mobile/vendor-app/.env'), vendorEnv);

  console.log('\n✨ All environments are now configured for CLOUD VPS SERVER!');
  console.log(`- Web Frontend:  ${VPS_API}`);
  console.log(`- Customer App:  ${VPS_API}`);
  console.log(`- Vendor App:    ${VPS_API}`);
  console.log('\nTip: If Expo or Vite is running, reload it (press "r" in Expo terminal) to apply.');
}

if (target === 'local') {
  switchToLocal();
} else if (target === 'vps') {
  switchToVps();
} else {
  printStatus();
}
