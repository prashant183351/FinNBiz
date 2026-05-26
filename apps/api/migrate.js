const fs = require('fs');
let text = fs.readFileSync('prisma/schema.prisma', 'utf8');

text = text.replace(/provider\s*=\s*"sqlite"/, 'provider = "mongodb"');
text = text.replace(/url\s*=\s*"file:\.\/dev\.db"/, 'url = env("DATABASE_URL")');

// Replace all IDs
text = text.replace(/id\s+String\s+@id\s+@default\(cuid\(\)\)/g, 'id String @id @default(auto()) @map("_id") @db.ObjectId');

// Find all foreign keys referenced in @relation
const relationRegex = /@relation\([^)]*fields:\s*\[([^\]]+)\].*\)/g;
let match;
const foreignKeys = new Set();
while ((match = relationRegex.exec(text)) !== null) {
  const fields = match[1].split(',').map(f => f.trim());
  fields.forEach(f => foreignKeys.add(f));
}

foreignKeys.forEach(fk => {
  const fkRegex = new RegExp(`(\\b${fk}\\b\\s+String\\??)(?!.*@db\\.ObjectId)`, 'g');
  text = text.replace(fkRegex, '$1 @db.ObjectId');
});

fs.writeFileSync('prisma/schema.prisma', text);
console.log('Successfully migrated schema to MongoDB format.');
