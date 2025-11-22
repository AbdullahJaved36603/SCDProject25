// main.js
require('dotenv').config();
const readline = require('readline');
const db = require('./db');           // your db module
require('./events/logger');           // initialize events

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisified question function
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Get creation date helper
function getCreationDate(record) {
  if (record.created) return new Date(record.created);
  if (record.id) return new Date(record.id);
  return new Date();
}

// Detect storage type
function detectStorageType(records) {
  if (!records.length) return 'unknown';
  const r = records[0];
  return r.id && typeof r.id === 'string' && r.id.length > 10 ? 'mongodb' : 'file';
}

// Menu display
function showMenu() {
  console.log(`
===== NodeVault =====
1. Add Record
2. List Records
3. Update Record
4. Delete Record
5. Search Records
6. Sort Records
7. Export Data
8. View Backups
9. View Vault Statistics
10. Exit
=====================
`);
}

// Core loop
async function main() {
  console.log('🚀 Starting NodeVault Application...');
  console.log('📁 Current directory:', process.cwd());
  console.log('🔧 Checking storage configuration...');

  let running = true;

  while (running) {
    try {
      showMenu();
      const option = await askQuestion('Choose option: ');

      switch (option.trim()) {
        case '1': {
          const name = await askQuestion('Enter name: ');
          const value = await askQuestion('Enter value: ');
          try {
            const record = await db.addRecord({ name, value });
            console.log(`✅ Record added: ID ${record.id}`);
          } catch (err) {
            console.log('❌ Failed to add record:', err.message);
          }
          break;
        }

        case '2': {
          const records = await db.listRecords();
          if (!records.length) console.log('No records found.');
          else {
            const storage = detectStorageType(records);
            console.log(`📊 Records from ${storage}:`);
            records.forEach(r => {
              const date = getCreationDate(r).toISOString().split('T')[0];
              console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value} | Created: ${date}`);
            });
          }
          break;
        }

        case '3': {
          const id = await askQuestion('Enter record ID to update: ');
          const name = await askQuestion('New name: ');
          const value = await askQuestion('New value: ');
          const updated = await db.updateRecord(id, name, value);
          console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
          break;
        }

        case '4': {
          const id = await askQuestion('Enter record ID to delete: ');
          const confirm = await askQuestion('Are you sure? (y/n): ');
          if (confirm.toLowerCase() === 'y') {
            const deleted = await db.deleteRecord(id);
            console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          } else {
            console.log('Deletion cancelled.');
          }
          break;
        }

        case '5': {
          const keyword = await askQuestion('Enter search keyword: ');
          const records = await db.listRecords();
          const results = records.filter(r =>
            r.name.toLowerCase().includes(keyword.toLowerCase()) ||
            r.id.toString().includes(keyword)
          );
          if (!results.length) console.log('No records found.');
          else {
            const storage = detectStorageType(results);
            console.log(`Found ${results.length} matching records (from ${storage}):`);
            results.forEach((r, i) => {
              const date = getCreationDate(r).toISOString().split('T')[0];
              console.log(`${i + 1}. ID: ${r.id} | Name: ${r.name} | Created: ${date}`);
            });
          }
          break;
        }

        case '6': {
          const field = await askQuestion('Sort by (name/date): ');
          const order = await askQuestion('Order (ascending/descending): ');
          const records = await db.listRecords();
          const sorted = [...records].sort((a, b) => {
            if (field === 'name') {
              return order === 'descending' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name);
            } else {
              return order === 'descending' ? getCreationDate(b) - getCreationDate(a) : getCreationDate(a) - getCreationDate(b);
            }
          });
          const storage = detectStorageType(records);
          console.log(`Sorted Records (from ${storage}):`);
          sorted.forEach((r, i) => {
            const date = getCreationDate(r).toISOString().split('T')[0];
            console.log(`${i + 1}. ID: ${r.id} | Name: ${r.name} | Created: ${date}`);
          });
          break;
        }

        case '7': {
          const confirm = await askQuestion('Export all data? (y/n): ');
          if (confirm.toLowerCase() !== 'y') break;
          const records = await db.listRecords();
          const storage = detectStorageType(records);
          const exportContent = `
VAULT DATA EXPORT
=================
Date: ${new Date().toLocaleString()}
Total Records: ${records.length}
Storage: ${storage}

${records.map((r, i) => {
  const date = getCreationDate(r).toISOString().split('T')[0];
  return `${i + 1}. ID: ${r.id} | Name: ${r.name} | Value: ${r.value} | Created: ${date}`;
}).join('\n')}
          `.trim();
          fs.writeFileSync('export.txt', exportContent);
          console.log('✅ Data exported to export.txt');
          break;
        }

        case '8':
          const backups = db.listBackups();
          if (!backups.length) console.log('No backups found.');
          else backups.forEach((b, i) => console.log(`${i + 1}. ${b.filename} | Created: ${b.created.toLocaleString()} | Size: ${b.size} bytes`));
          break;

        case '9': {
          const confirm = await askQuestion('View statistics? (y/n): ');
          if (confirm.toLowerCase() !== 'y') break;
          const records = await db.listRecords();
          if (!records.length) {
            console.log('No records for statistics.');
            break;
          }
          const storage = detectStorageType(records);
          const total = records.length;
          const lastModified = new Date(Math.max(...records.map(r => getCreationDate(r).getTime())));
          const longestName = records.reduce((prev, cur) => cur.name.length > prev.name.length ? cur : prev);
          const creationDates = records.map(r => getCreationDate(r));
          console.log(`
Vault Statistics
--------------------------
Storage: ${storage}
Total Records: ${total}
Last Modified: ${lastModified.toLocaleString()}
Longest Name: ${longestName.name} (${longestName.name.length} chars)
Earliest Record: ${new Date(Math.min(...creationDates)).toISOString().split('T')[0]}
Latest Record: ${new Date(Math.max(...creationDates)).toISOString().split('T')[0]}
--------------------------
          `.trim());
          break;
        }

        case '10':
          console.log('👋 Exiting NodeVault...');
          rl.close();
          if (db.disconnectDB) await db.disconnectDB();
          running = false;
          break;

        default:
          console.log('⚠️ Invalid option.');
      }
    } catch (err) {
      console.log('❌ Error:', err.message);
    }
  }

  process.exit(0);
}

main();
