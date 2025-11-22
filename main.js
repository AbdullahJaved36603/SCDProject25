const readline = require('readline');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('./events/logger'); // Initialize event logger

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to get creation date from record
function getCreationDate(record) {
  // If record has 'created' field (MongoDB), use that
  if (record.created) {
    return new Date(record.created);
  }
  // If record has 'id' as timestamp (file system), use that
  if (record.id) {
    return new Date(record.id);
  }
  // Fallback to current date
  return new Date();
}

// Search function
function searchRecords() {
  rl.question('Enter search keyword: ', async (keyword) => {
    const records = await db.listRecords();
    const results = records.filter(record => 
      record.name.toLowerCase().includes(keyword.toLowerCase()) ||
      record.id.toString().includes(keyword)
    );
    
    if (results.length === 0) {
      console.log('No records found.');
    } else {
      console.log(`Found ${results.length} matching records:`);
      results.forEach((record, index) => {
        const createdDate = getCreationDate(record).toISOString().split('T')[0];
        console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Created: ${createdDate}`);
      });
    }
    menu();
  });
}

// Sorting function
function sortRecords() {
  rl.question('Choose field to sort by (name/date): ', async (field) => {
    if (field.toLowerCase() !== 'name' && field.toLowerCase() !== 'date') {
      console.log('Invalid field. Please choose "name" or "date".');
      return sortRecords();
    }
    
    rl.question('Choose order (ascending/descending): ', async (order) => {
      const records = await db.listRecords();
      let sortedRecords = [...records];
      
      if (field.toLowerCase() === 'name') {
        sortedRecords.sort((a, b) => {
          return order.toLowerCase() === 'descending' 
            ? b.name.localeCompare(a.name) 
            : a.name.localeCompare(b.name);
        });
      } else { // sort by date
        sortedRecords.sort((a, b) => {
          const dateA = getCreationDate(a);
          const dateB = getCreationDate(b);
          return order.toLowerCase() === 'descending' 
            ? dateB - dateA 
            : dateA - dateB;
        });
      }
      
      console.log('Sorted Records:');
      sortedRecords.forEach((record, index) => {
        if (field.toLowerCase() === 'name') {
          console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name}`);
        } else {
          const createdDate = getCreationDate(record).toISOString().split('T')[0];
          console.log(`${index + 1}. ID: ${record.id} | Name: ${record.name} | Created: ${createdDate}`);
        }
      });
      menu();
    });
  });
}

// Export function
function exportData() {
  rl.question('Are you sure you want to export data? (y/n): ', async (confirm) => {
    if (confirm.toLowerCase() !== 'y') {
      console.log('Export cancelled.');
      return menu();
    }
    
    const records = await db.listRecords();
    const exportDate = new Date().toLocaleString();
    
    const exportContent = `
VAULT DATA EXPORT
=================
Export Date: ${exportDate}
Total Records: ${records.length}
File: export.txt

RECORDS:
${records.map((record, index) => {
    const createdDate = getCreationDate(record).toISOString().split('T')[0];
    return `${index + 1}. ID: ${record.id} | Name: ${record.name} | Value: ${record.value} | Created: ${createdDate}`;
}).join('\n')}
    `.trim();

    try {
      fs.writeFileSync('export.txt', exportContent);
      console.log('✅ Data exported successfully to export.txt');
    } catch (error) {
      console.log('❌ Error exporting data:', error.message);
    }
    menu();
  });
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
  rl.question('Do you want to view vault statistics? (y/n): ', async (confirm) => {
    if (confirm.toLowerCase() !== 'y') {
      console.log('Statistics view cancelled.');
      return menu();
    }
    
    const records = await db.listRecords();
    
    if (records.length === 0) {
      console.log('No records available for statistics.');
      return menu();
    }

    // Calculate statistics
    const totalRecords = records.length;
    
    // Find last modified date (using the latest creation date)
    const lastModified = new Date(Math.max(...records.map(r => getCreationDate(r).getTime())));
    
    // Find longest name
    const longestNameRecord = records.reduce((longest, current) => 
      current.name.length > longest.name.length ? current : longest
    , records[0]);
    
    // Find earliest and latest creation dates
    const creationDates = records.map(r => getCreationDate(r));
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
  });
}

// Update menu function to handle async operations
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

  rl.question('Choose option: ', (ans) => {
    switch (ans.trim()) {
      case '1':
        rl.question('Enter name: ', (name) => {
          rl.question('Enter value: ', async (value) => {
            await db.addRecord({ name, value });
            console.log('✅ Record added successfully!');
            menu();
          });
        });
        break;

      case '2':
        (async () => {
          const records = await db.listRecords();
          if (records.length === 0) {
            console.log('No records found.');
          } else {
            records.forEach(r => {
              const createdDate = getCreationDate(r).toISOString().split('T')[0];
              console.log(`ID: ${r.id} | Name: ${r.name} | Value: ${r.value} | Created: ${createdDate}`);
            });
          }
          menu();
        })();
        break;

      case '3':
        rl.question('Enter record ID to update: ', (id) => {
          rl.question('New name: ', (name) => {
            rl.question('New value: ', async (value) => {
              const updated = await db.updateRecord(id, name, value);
              console.log(updated ? '✅ Record updated!' : '❌ Record not found.');
              menu();
            });
          });
        });
        break;

      case '4':
        rl.question('Enter record ID to delete: ', (id) => {
          rl.question('Are you sure? (y/n): ', async (confirm) => {
            if (confirm.toLowerCase() === 'y') {
              const deleted = await db.deleteRecord(id);
              console.log(deleted ? '🗑️ Record deleted!' : '❌ Record not found.');
            } else {
              console.log('Deletion cancelled.');
            }
            menu();
          });
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