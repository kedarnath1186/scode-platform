const { dbAll } = require('../src/db/database');

async function run() {
  const users = await dbAll('SELECT * FROM users');
  const businesses = await dbAll('SELECT * FROM businesses');
  const leads = await dbAll('SELECT * FROM leads');
  const services = await dbAll('SELECT * FROM services');

  console.log('=== REAL DATABASE SUMMARY ===');
  console.log('Total Users:', users.length);
  console.log('Total Businesses:', businesses.length);
  console.log('Total Leads:', leads.length);
  console.log('Total Services:', services.length);

  console.log('\n=== REAL USERS (CUSTOMERS) ===');
  users.forEach(u => {
    console.log(`[User #${u.id}] Name: "${u.name}" | Email: "${u.email}" | Phone: "${u.phone}" | City: "${u.city}" | GST: "${u.gst_number}" | BizID: ${u.business_id}`);
  });

  console.log('\n=== REAL BUSINESSES ===');
  businesses.forEach(b => {
    console.log(`[Biz #${b.id}] Name: "${b.name}" | Cat: "${b.category}" | City: "${b.city}" | GST: "${b.gst_number}" | OwnerID: ${b.owner_id}`);
  });

  console.log('\n=== REAL LEADS / INQUIRIES ===');
  leads.forEach(l => {
    console.log(`[Lead #${l.id}] Name: "${l.name}" | BizID: ${l.business_id} | Service: "${l.service_requested}" | Msg: "${l.message}"`);
  });
}

run().catch(console.error);
