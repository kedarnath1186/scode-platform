const { dbRun, dbAll, initDB } = require('../src/db/database');

async function migrateBranding() {
  console.log('🔄 Starting branding migration for database.sqlite...');
  await initDB();

  // 1. Update businesses table
  const businesses = await dbAll('SELECT id, email FROM businesses WHERE email LIKE "%orbit9%"');
  console.log(`Found ${businesses.length} businesses with orbit9 in email`);
  for (const b of businesses) {
    const newEmail = b.email.replace(/orbit9\.in/gi, 'scode.in').replace(/orbit9/gi, 'scode');
    await dbRun('UPDATE businesses SET email = ? WHERE id = ?', [newEmail, b.id]);
    console.log(`  Updated business #${b.id}: ${b.email} -> ${newEmail}`);
  }

  // 2. Update admin_users table
  const admins = await dbAll('SELECT id, email FROM admin_users WHERE email LIKE "%orbit9%"');
  console.log(`Found ${admins.length} admin users with orbit9 in email`);
  for (const a of admins) {
    const newEmail = a.email.replace(/orbit9\.in/gi, 'scode.in').replace(/orbit9/gi, 'scode');
    await dbRun('UPDATE admin_users SET email = ? WHERE id = ?', [newEmail, a.id]);
    console.log(`  Updated admin user #${a.id}: ${a.email} -> ${newEmail}`);
  }

  // 3. Update users table
  const users = await dbAll('SELECT id, email FROM users WHERE email LIKE "%orbit9%"');
  console.log(`Found ${users.length} users with orbit9 in email`);
  for (const u of users) {
    const newEmail = u.email.replace(/orbit9\.in/gi, 'scode.in').replace(/orbit9/gi, 'scode');
    await dbRun('UPDATE users SET email = ? WHERE id = ?', [newEmail, u.id]);
    console.log(`  Updated user #${u.id}: ${u.email} -> ${newEmail}`);
  }

  // 4. Update leads table
  const leads = await dbAll('SELECT id, email, message FROM leads WHERE email LIKE "%orbit9%" OR message LIKE "%orbit9%" OR message LIKE "%Orbit9%"');
  console.log(`Found ${leads.length} leads with orbit9 references`);
  for (const l of leads) {
    const newEmail = l.email ? l.email.replace(/orbit9\.in/gi, 'scode.in').replace(/orbit9/gi, 'scode') : l.email;
    const newMessage = l.message ? l.message.replace(/orbit9/gi, 'SCode') : l.message;
    await dbRun('UPDATE leads SET email = ?, message = ? WHERE id = ?', [newEmail, newMessage, l.id]);
    console.log(`  Updated lead #${l.id}`);
  }

  // 5. Update platform_settings table
  const settings = await dbAll('SELECT key, value FROM platform_settings WHERE value LIKE "%orbit9%" OR value LIKE "%Orbit9%"');
  console.log(`Found ${settings.length} platform settings with orbit9 references`);
  for (const s of settings) {
    const newValue = s.value.replace(/orbit9\.in/gi, 'scode.in').replace(/orbit9/gi, 'SCode').replace(/Orbit9/g, 'SCode');
    await dbRun('UPDATE platform_settings SET value = ? WHERE key = ?', [newValue, s.key]);
    console.log(`  Updated setting ${s.key}`);
  }

  console.log('✅ Branding migration completed successfully.');
}

if (require.main === module) {
  migrateBranding()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrateBranding };
