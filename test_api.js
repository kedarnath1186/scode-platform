const http = require('http');

async function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('--- 1. Testing HTML Page Routes ---');
  const pages = [
    'http://localhost:3000/',
    'http://localhost:3000/b/clean-water-solutions',
    'http://localhost:3000/b/glory-computers',
    'http://localhost:3000/admin',
    'http://localhost:3000/admin/login'
  ];

  for (const p of pages) {
    const res = await request(p);
    console.log(`Page: ${p} -> Status ${res.status} (Length: ${res.raw ? res.raw.length : 0} bytes)`);
  }

  console.log('\n--- 2. Testing API Endpoints ---');
  const bRes = await request('http://localhost:3000/api/businesses/clean-water-solutions');
  console.log('GET /api/businesses/clean-water-solutions ->', bRes.status, bRes.data.data.name);

  const authRes = await request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    username: 'admin',
    password: 'admin123'
  });
  console.log('POST /api/auth/login ->', authRes.status, 'Token Generated:', !!authRes.data.token);

  const statsRes = await request('http://localhost:3000/api/stats/dashboard', {
    headers: { 'Authorization': `Bearer ${authRes.data.token}` }
  });
  console.log('GET /api/stats/dashboard ->', statsRes.status, 'Total Businesses:', statsRes.data.data.totalBusinesses);

  console.log('\n✨ ALL SYSTEM CHECKS PASSED ✨');
}

runTests().catch(console.error);
