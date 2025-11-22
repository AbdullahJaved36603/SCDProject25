const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require('fs');
const path = require('path');

// Backup function
function createBackup() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `backup_${timestamp}.json`);
  
  const data = fileDB.readDB();
  const backupData = {
    timestamp: new Date().toISOString(),
    totalRecords: data.length,
    records: data
  };
  
  fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup created: ${backupFile}`);
  return backupFile;
}

function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  const data = fileDB.readDB();
  const newRecord = { id: recordUtils.generateId(), name, value };
  data.push(newRecord);
  fileDB.writeDB(data);
  vaultEvents.emit('recordAdded', newRecord);
  createBackup(); // Automatic backup
  return newRecord;
}

function listRecords() {
  return fileDB.readDB();
}

function updateRecord(id, newName, newValue) {
  const data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  record.name = newName;
  record.value = newValue;
  fileDB.writeDB(data);
  vaultEvents.emit('recordUpdated', record);
  createBackup(); // Automatic backup
  return record;
}

function deleteRecord(id) {
  let data = fileDB.readDB();
  const record = data.find(r => r.id === id);
  if (!record) return null;
  data = data.filter(r => r.id !== id);
  fileDB.writeDB(data);
  vaultEvents.emit('recordDeleted', record);
  createBackup(); // Automatic backup
  return record;
}

// Function to list backups
function listBackups() {
  const backupDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupDir)) {
    return [];
  }
  
  const backupFiles = fs.readdirSync(backupDir)
    .filter(file => file.startsWith('backup_') && file.endsWith('.json'))
    .map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        filename: file,
        path: filePath,
        created: stats.birthtime,
        size: stats.size
      };
    })
    .sort((a, b) => b.created - a.created); // Sort by newest first
  
  return backupFiles;
}

module.exports = { 
  addRecord, 
  listRecords, 
  updateRecord, 
  deleteRecord, 
  listBackups 
};