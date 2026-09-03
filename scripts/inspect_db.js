const { dbAll } = require('../src/db/database');

async function inspectDatabase() {
  console.log('====================================================');
  console.log('🔍 FULL DATABASE SCHEMA & DATA DISCOVERY');
  console.log('====================================================\n');

  const tables = await dbAll("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  
  for (const t of tables) {
    console.log(`\n====================================================`);
    console.log(`📋 Table: ${t.name}`);
    console.log(`====================================================`);
    console.log(`SQL Schema:\n${t.sql}\n`);

    const cols = await dbAll(`PRAGMA table_info(${t.name})`);
    console.log('Columns:');
    cols.forEach(c => console.log(`  - ${c.name} (${c.type}) ${c.pk ? '[PK]' : ''} ${c.notnull ? '[NOT NULL]' : ''} ${c.dflt_value ? `[DEFAULT: ${c.dflt_value}]` : ''}`));

    const foreignKeys = await dbAll(`PRAGMA foreign_key_list(${t.name})`);
    if (foreignKeys.length > 0) {
      console.log('Foreign Keys:');
      foreignKeys.forEach(fk => console.log(`  - ${fk.from} -> ${fk.table}(${fk.to})`));
    }

    const indexes = await dbAll(`PRAGMA index_list(${t.name})`);
    if (indexes.length > 0) {
      console.log('Indexes:');
      indexes.forEach(idx => console.log(`  - ${idx.name} (unique: ${idx.unique})`));
    }

    const count = await dbAll(`SELECT COUNT(*) as c FROM ${t.name}`);
    console.log(`Row Count: ${count[0].c}`);

    const sample = await dbAll(`SELECT * FROM ${t.name} LIMIT 3`);
    console.log('Sample Records:');
    console.log(JSON.stringify(sample, null, 2));
  }
}

inspectDatabase().catch(console.error);
