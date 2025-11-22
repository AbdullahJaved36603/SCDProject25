const fileDB = require('./file');
const recordUtils = require('./record');
const vaultEvents = require('../events');
const fs = require('fs');
const path = require('path');
const mongodb = require('./mongodb');

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

// Enhanced functions with better error handling and debugging
async function addRecord({ name, value }) {
  recordUtils.validateRecord({ name, value });
  
  try {
    // Try MongoDB first
    console.log('🔄 Attempting to save to MongoDB...');
    const newRecord = await mongodb.addRecord({ name, value });
    console.log('✅ Successfully saved to MongoDB');
    vaultEvents.emit('recordAdded', newRecord);
    createBackup();
    return newRecord;
  } catch (error) {
    // Fallback to file system
    console.log('🔄 MongoDB save failed, using file-based storage. Error:', error.message);
    const data = fileDB.readDB();
    const newRecord = { id: recordUtils.generateId(), name, value };
    data.push(newRecord);
    fileDB.writeDB(data);
    vaultEvents.emit('recordAdded', newRecord);
    createBackup();
    return newRecord;
  }
}

async function listRecords() {
  try {
    // Try MongoDB first
    console.log('🔄 Attempting to load from MongoDB...');
    const records = await mongodb.listRecords();
    console.log('✅ Successfully loaded from MongoDB');
    return records;
  } catch (error) {
    // Fallback to file system
    console.log('🔄 MongoDB load failed, using file-based storage. Error:', error.message);
    return fileDB.readDB();
  }
}

async function updateRecord(id, newName, newValue) {
  try {
    // Try MongoDB first
    console.log('🔄 Attempting to update in MongoDB...');
    const updatedRecord = await mongodb.updateRecord(id, newName, newValue);
    if (updatedRecord) {
      console.log('✅ Successfully updated in MongoDB');
      vaultEvents.emit('recordUpdated', updatedRecord);
      createBackup();
      return updatedRecord;
    }
    return null;
  } catch (error) {
    // Fallback to file system
    console.log('🔄 MongoDB update failed, using file-based storage. Error:', error.message);
    const data = fileDB.readDB();
    const record = data.find(r => r.id === Number(id));
    if (!record) return null;
    record.name = newName;
    record.value = newValue;
    fileDB.writeDB(data);
    vaultEvents.emit('recordUpdated', record);
    createBackup();
    return record;
  }
}

async function deleteRecord(id) {
  try {
    // Try MongoDB first
    console.log('🔄 Attempting to delete from MongoDB...');
    const deletedRecord = await mongodb.deleteRecord(id);
    if (deletedRecord) {
      console.log('✅ Successfully deleted from MongoDB');
      vaultEvents.emit('recordDeleted', deletedRecord);
      createBackup();
      return deletedRecord;
    }
    return null;
  } catch (error) {
    // Fallback to file system
    console.log('🔄 MongoDB delete failed, using file-based storage. Error:', error.message);
    let data = fileDB.readDB();
    const record = data.find(r => r.id === Number(id));
    if (!record) return null;
    data = data.filter(r => r.id !== Number(id));
    fileDB.writeDB(data);
    vaultEvents.emit('recordDeleted', record);
    createBackup();
    return record;
  }
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
    .sort((a, b) => b.created - a.created);
  
  return backupFiles;
}

module.exports = { 
  addRecord, 
  listRecords, 
  updateRecord, 
  deleteRecord, 
  listBackups 
};