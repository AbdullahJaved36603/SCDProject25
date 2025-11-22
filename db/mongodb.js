// db/mongodb.js
require('dotenv').config(); // Load .env
const mongoose = require('mongoose');

// Schema definition
const recordSchema = new mongoose.Schema({
  name: { type: String, required: true },
  value: { type: String, required: true },
  created: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', recordSchema);

let isConnected = false;

// Connect to MongoDB
async function connectDB() {
  if (isConnected) return true;

  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/vaultdb';
  console.log('🔄 Connecting to MongoDB:', MONGODB_URI);

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    isConnected = true;
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.log('❌ MongoDB connection failed:', error.message);
    isConnected = false;
    throw error;
  }
}

// Add a record
async function addRecord({ name, value }) {
  try {
    await connectDB();
    const newRecord = new Record({ name, value });
    const savedRecord = await newRecord.save();

    return {
      id: savedRecord._id.toString(),
      name: savedRecord.name,
      value: savedRecord.value,
      created: savedRecord.created
    };
  } catch (error) {
    console.log('❌ MongoDB addRecord failed:', error.message);
    throw error;
  }
}

// List all records
async function listRecords() {
  try {
    await connectDB();
    const records = await Record.find().sort({ created: -1 });
    return records.map(r => ({
      id: r._id.toString(),
      name: r.name,
      value: r.value,
      created: r.created
    }));
  } catch (error) {
    console.log('❌ MongoDB listRecords failed:', error.message);
    throw error;
  }
}

// Update a record by id
async function updateRecord(id, newName, newValue) {
  try {
    await connectDB();

    const updated = await Record.findByIdAndUpdate(
      id,
      { name: newName, value: newValue },
      { new: true, runValidators: true }
    );

    if (!updated) return null;

    return {
      id: updated._id.toString(),
      name: updated.name,
      value: updated.value,
      created: updated.created
    };
  } catch (error) {
    console.log('❌ MongoDB updateRecord failed:', error.message);
    throw error;
  }
}

// Delete a record by id
async function deleteRecord(id) {
  try {
    await connectDB();

    const deleted = await Record.findByIdAndDelete(id);
    if (!deleted) return null;

    return {
      id: deleted._id.toString(),
      name: deleted.name,
      value: deleted.value,
      created: deleted.created
    };
  } catch (error) {
    console.log('❌ MongoDB deleteRecord failed:', error.message);
    throw error;
  }
}

// Add at the bottom of mongodb.js
async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('🔌 MongoDB connection closed');
  }
}

module.exports = {
  addRecord,
  listRecords,
  updateRecord,
  deleteRecord,
  connectDB,
  disconnectDB
};

