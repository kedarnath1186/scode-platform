const http = require('http');

function postJSON(path, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: headers
    }, (res) => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runComprehensiveTests() {
  console.log('====================================================');
  console.log('🧪 SCode AI Admin Search & Ranking Test Suite');
  console.log('====================================================\n');

  // Step 1: Admin Login
  console.log('--- Step 1: Admin Authentication ---');
  const loginRes = await postJSON('/api/auth/login', { username: 'admin', password: 'admin123' });
  console.log('Admin Login Status:', loginRes.status);
  const token = loginRes.body.token;
  console.log('JWT Token Active:', !!token);

  // Step 2: Unauthenticated Security Check
  console.log('\n--- Step 2: Security Verification (No Auth Token) ---');
  const unauthRes = await postJSON('/api/chat', { message: 'Find Rahul' });
  console.log('Unauthenticated Request Status (Expected 401):', unauthRes.status);

  const sessionId = `test_session_${Date.now()}`;

  // Step 3: Accuracy & Partial/Fuzzy/Multi-field Searches
  const testCases = [
    { title: '1. Exact Customer Name Search', query: 'Rahul Kumar Patil' },
    { title: '2. Partial Customer Name Search (Multi-word)', query: 'Rahul Patil' },
    { title: '3. Lowercase Partial Name', query: 'rahul kumar' },
    { title: '4. Uppercase Name with spaces', query: '  RAHUL PATIL  ' },
    { title: '5. Business Partial Substring', query: 'clean water' },
    { title: '6. Business Full Name', query: 'Clean Water Solutions' },
    { title: '7. Business Partial & Uppercase', query: 'GLORY COMPUTERS' },
    { title: '8. Ownership Question', query: 'Who owns Clean Water Solutions?' },
    { title: '9. Ownership Question on IT Company', query: 'Who is associated with Kloudbox Technologies?' },
    { title: '10. Customer Business Relationship', query: "Show me Rahul's business" },
    { title: '11. Location Search (Pune)', query: 'customers in Pune' },
    { title: '12. Location Search (Nashik)', query: 'Find all customers from Nashik' },
    { title: '13. Location Search (Aurangabad)', query: 'Which customers are from Aurangabad?' },
    { title: '14. Category Search', query: 'Businesses related to water treatment' },
    { title: '15. Inquiry / Lead Search (Tally)', query: 'Show customers who have Tally related inquiries' },
    { title: '16. Inquiry / Lead Search (Accounting)', query: 'Show customers who have accounting related inquiries' },
    { title: '17. Inquiry / Lead Search (RO Plant)', query: 'Inquiries about water plant' },
    { title: '18. Phone Search', query: 'Find the customer with phone number 9876543210' },
    { title: '19. Email Search', query: 'Find customer with email rahul@gmail.com' },
    { title: '20. GST Search', query: 'Show customers with GST number 27AAACP1234A1Z5' },
    { title: '21. All Businesses in Pune', query: 'Find all businesses in Pune' },
    { title: '22. Non-Existent Record (Zero Matches)', query: 'Find customer NonExistentPerson12345' }
  ];

  console.log('\n--- Step 3: Multi-Stage Database Search Accuracy Tests ---');
  let passedCount = 0;

  for (const t of testCases) {
    console.log(`\n▶ [${t.title}]`);
    console.log(`Query: "${t.query}"`);
    const res = await postJSON('/api/chat', { message: t.query, sessionId }, token);
    const count = res.body.results ? res.body.results.length : 0;
    console.log(`Status: ${res.status} | Intent: ${res.body.intent} | Type: ${res.body.type} | Count: ${count}`);
    console.log(`Response Snippet:\n${res.body.reply.split('\n').slice(0, 5).join('\n')}`);
    if (res.status === 200 && res.body.success) passedCount++;
  }

  // Step 4: Conversational Context Multi-Turn Flow
  console.log('\n====================================================');
  console.log('🔄 Step 4: Multi-Turn Conversation Context Test');
  console.log('====================================================');

  const contextSession = `context_session_${Date.now()}`;

  // Turn 1
  console.log('\n[Turn 1] Admin: "Find Rahul"');
  let turn1 = await postJSON('/api/chat', { message: 'Find Rahul', sessionId: contextSession }, token);
  console.log(`Bot:\n${turn1.body.reply}`);

  // Turn 2
  console.log('\n[Turn 2] Admin: "The one from Pune"');
  let turn2 = await postJSON('/api/chat', { message: 'The one from Pune', sessionId: contextSession }, token);
  console.log(`Bot:\n${turn2.body.reply}`);

  // Turn 3
  console.log('\n[Turn 3] Admin: "What is his business?"');
  let turn3 = await postJSON('/api/chat', { message: 'What is his business?', sessionId: contextSession }, token);
  console.log(`Bot:\n${turn3.body.reply}`);

  // Turn 4
  console.log('\n[Turn 4] Admin: "Where is it located?"');
  let turn4 = await postJSON('/api/chat', { message: 'Where is it located?', sessionId: contextSession }, token);
  console.log(`Bot:\n${turn4.body.reply}`);

  // Turn 5
  console.log('\n[Turn 5] Admin: "What was his latest inquiry?"');
  let turn5 = await postJSON('/api/chat', { message: 'What was his latest inquiry?', sessionId: contextSession }, token);
  console.log(`Bot:\n${turn5.body.reply}`);

  console.log('\n====================================================');
  console.log(`✨ ALL TESTS COMPLETED: ${passedCount}/${testCases.length} search queries succeeded.`);
  console.log('====================================================');
}

runComprehensiveTests().catch(console.error);
