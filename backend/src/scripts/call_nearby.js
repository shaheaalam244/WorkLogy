import jwt from 'jsonwebtoken';
import http from 'http';
import dotenv from 'dotenv';
dotenv.config();

const token = jwt.sign(
  { id: '6ae0213770d51a1f67ac7505', role: 'vendor' },
  process.env.JWT_SECRET || 'worklogy_super_secret_jwt_key_2026_secure',
  { expiresIn: '1d' }
);

const options = {
  hostname: 'localhost',
  port: 5001,
  path: '/api/jobs/nearby?tab=all',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status code:', res.statusCode);
    console.log('Response body:', JSON.stringify(JSON.parse(data), null, 2));
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
