const http = require('http');
const assert = require('assert');

// 1. Test JWT_SECRET check in production
const testJwtProductionCheck = () => {
  const originalEnv = process.env.NODE_ENV;
  const originalSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    
    // Clear require cache for auth middleware
    delete require.cache[require.resolve('../src/middleware/auth')];
    
    let threw = false;
    try {
      require('../src/middleware/auth');
    } catch (e) {
      threw = true;
      assert(e.message.includes('JWT_SECRET'), 'Expected error message to mention JWT_SECRET');
    }
    assert(threw, 'Expected auth.js to throw error when JWT_SECRET missing in production');
    console.log('  ✅ [PASS] Security: Auth middleware throws in production if JWT_SECRET missing');
  } finally {
    process.env.NODE_ENV = originalEnv;
    if (originalSecret) process.env.JWT_SECRET = originalSecret;
    delete require.cache[require.resolve('../src/middleware/auth')];
  }
};

testJwtProductionCheck();
console.log('All standalone security unit checks passed!');
