const mongoose = require('mongoose');

// Record Schema
const recordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  },
  created: {
    type: Date,
    default: Date.now
  }
});

const Record = mongoose.model('Record', recordSchema);

// MongoDB connection
let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vaultdb';
  
  try {
    await mongoose.connect(MONGODB_URI);
    isConnected = true;
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.log('❌ MongoDB connection failed, using file-based storage');
    console.log('Error:', error.message);
  }
}

// MongoDB operations
async function addRecord({ name, value }) {
  await connectDB();
  
  if (!isConnected) {
    throw new Error('MongoDB not available');
  }
  
  const newRecord = new Record({ name, value });
  await newRecord.save();
  return {
    id: newRecord._id.toString(),
    name: newRecord.name,
    value: newRecord.value,
    created: newRecord.created
  };
}

async function listRecords() {
  await connectDB();
  
  if (!isConnected) {
    throw new Error('MongoDB not available');
  }
  
  const records = await Record.find().sort({ created: -1 });
  return records.map(record => ({
    id: record._id.toString(),
    name: record.name,
    value: record.value,
    created: record.created
  }));
}

async function updateRecord(id, newName, newValue) {
  await connectDB();
  
  if (!isConnected) {
    throw new Error('MongoDB not available');
  }
  
  try {
    const updatedRecord = await Record.findByIdAndUpdate(
      id,
      { name: newName, value: newValue },
      { new: true }
    );
    
    if (!updatedRecord) return null;
    
    return {
      id: updatedRecord._id.toString(),
      name: updatedRecord.name,
      value: updatedRecord.value,
      created: updatedRecord.created
    };
  } catch (error) {
    return null;
  }
}

async function deleteRecord(id) {
  await connectDB();
  
  if (!isConnected) {
    throw new Error('MongoDB not available');
  }
  
  try {
    const deletedRecord = await Record.findByIdAndDelete(id);
    return deletedRecord ? {
      id: deletedRecord._id.toString(),
      name: deletedRecord.name,
      value: deletedRecord.value,
      created: deletedRecord.created
    } : null;
  } catch (error) {
    return null;
  }
}

module.exports = {
  addRecord,
  listRecords,
  updateRecord,
  deleteRecord
};