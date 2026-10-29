import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI;

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(__dirname, `../../backups/pre_qa_reset_backup_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`Connecting to MongoDB for backup...`);
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  const collections = await db.listCollections().toArray();
  console.log(`Creating full JSON backup in ${backupDir}...`);

  for (const col of collections) {
    const docs = await db.collection(col.name).find({}).toArray();
    const filePath = path.join(backupDir, `${col.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`  ✓ Backed up ${col.name} (${docs.length} records) -> ${filePath}`);
  }

  console.log(`\nBackup successfully completed! Location: ${backupDir}`);
  await mongoose.disconnect();
  return backupDir;
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
