const readline = require('readline');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('./events/logger'); // Initialize event logger

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Search function
function searchRecords() {
  rl.question('Enter search keyword: ', keyword => {
    const records = db.listRecords();
    const results = records.filter(record => 
      record.name.toLowerCase().includes(keyword.toLowerCase()) ||
      record.id.toString().includes(keyword)
    );
    
    if (results.length === 0) {
      console.log('No records found.');
    } else {
      console.log(`Found ${results.length} matching records:`);
      results.forEach((record, index) => {
        const createdDate = new Date(record.id).toISOString().split('T')[0];
        console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Created: ${createdDate}`);
      });
    }
    menu();
  });
}

// Sorting function
function sortRecords() {
  rl.question('Choose field to sort by (name/date): ', field => {
    if (field.toLowerCase() !== 'name' && field.toLowerCase() !== 'date') {
      console.log('Invalid field. Please choose "name" or "date".');
      return sortRecords();
    }
    
    rl.question('Choose order (ascending/descending): ', order => {
      const records = db.listRecords();
      let sortedRecords = [...records];
      
      if (field.toLowerCase() === 'name') {
        sortedRecords.sort((a, b) => {
          return order.toLowerCase() === 'descending' 
            ? b.name.localeCompare(a.name) 
            : a.name.localeCompare(b.name);
        });
      } else { // sort by date (using ID as timestamp)
        sortedRecords.sort((a, b) => {
          return order.toLowerCase() === 'descending' 
            ? b.id - a.id 
            : a.id - b.id;
        });
      }
      
      console.log('Sorted Records:');
      sortedRecords.forEach((record, index) => {
        if (field.toLowerCase() === 'name') {
          console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name}`);
        } else {
          const createdDate = new Date(record.id).toISOString().split('T')[0];
          console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Created: ${createdDate}`);
        }
      });
      menu();
    });
  });
}

// Export function
function exportData() {
  const records = db.listRecords();
  const exportDate = new Date().toLocaleString();
  
  const exportContent = `
VAULT DATA EXPORT
=================
Export Date: ${exportDate}
Total Records: ${records.length}
File: export.txt

RECORDS:
${records.map((record, index) => 
    `${index + 1}. ID: ${record.id} | Name: ${record.name} | Value: ${record.value} | Created: ${new Date(record.id).toISOString().split('T')[0]}`
).join('\n')}
  `.trim();

  try {
    fs.writeFileSync('export.txt', exportContent);
    console.log('✅ Data exported successfully to export.txt');
  } catch (error) {
    console.log('❌ Error exporting data:', error.message);
  }
  menu();
}

// View backups function
function viewBackups() {
  const backups = db.listBackups();
  if (backups.length === 0) {
    console.log('No backups found.');
  } else {
    console.log('Available Backups:');
    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.filename} | Created: ${backup.created.toLocaleString()} | Size: ${backup.size} bytes`);
    });
  }
  menu();
}

// Statistics function
function showStatistics() {
  const records = db.listRecords();
  
  if (records.length === 0) {
    console.log('No records available for statistics.');
    return menu();
  }

  // Calculate statistics
  const totalRecords = records.length;
  
  // Find last modified date (using the latest ID as proxy for modification time)
  const lastModified = new Date(Math.max(...records.map(r => r.id)));
  
  // Find longest name
  const longestNameRecord = records.reduce((longest, current) => 
    current.name.length > longest.name.length ? current : longest
  , records[0]);
  
  // Find earliest and latest creation dates
  const creationDates = records.map(r => new Date(r.id));
  const earliestRecord = new Date(Math.min(...creationDates));
  const latestRecord = new Date(Math.max(...creationDates));
  
  // Display statistics
  console.log(`
Vault Statistics:
--------------------------
Total Records: ${totalRecords}
Last Modified: ${lastModified.toLocaleString()}
Longest Name: ${longestNameRecord.name} (${longestNameRecord.name.length} characters)
Earliest Record: ${earliestRecord.toISOString().split('T')[0]}
Latest Record: ${latestRecord.toISOString().split('T')[0]}
--------------------------
  `.trim());

  menu();
}

function menu() {
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

  rl.question('Choose option: ', ans => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', name => {
          rl.question('Enter value: ', value => {
            db.addRecord({ name, value });
            console.log('✅ Record added successfully!');
            menu();
          });
        });
        break;

      case '2':
        const records = db.listRecords();
        if (records.length === 0) console.log('No records found.');
        else records.forEach(r => console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value}`));
        menu();
        break;

      case '3':
        rl.question('Enter record ID to update: ', id => {
          rl.question('New name: ', name => {
            rl.question('New value: ', value => {
              const updated = db.updateRecord(Number(id), name, value);
              console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', id => {
          const deleted = db.deleteRecord(Number(id));
          console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
          menu();
        });
        break;

      case '5':
        searchRecords();
        break;

      case '6':
        sortRecords();
        break;

      case '7':
        exportData();
        break;

      case '8':
        viewBackups();
        break;

      case '9':
        showStatistics();
        break;

      case '10':
        console.log('👋 Exiting NodeVault...');
        rl.close();
        break;

      default:
        console.log('Invalid option.');
        menu();
    }
  });
}

menu();