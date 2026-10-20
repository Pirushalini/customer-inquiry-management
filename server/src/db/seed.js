import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  console.log('🚀 Starting database migration and seed process...');

  try {
    // 1. Run schema.sql
    const schemaPath = path.resolve(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log('Applying database schema...');
    await pool.query(schemaSql);
    console.log('✓ Schema applied successfully.');

    // 2. Hash default staff passwords
    const defaultPassword = 'NinjaPass123!';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // 3. Upsert staff accounts
    console.log('Seeding staff accounts...');
    const staffQuery = `
      INSERT INTO staff_users (name, email, password_hash)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) 
      DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash
      RETURNING id, name, email;
    `;

    const sarahRes = await pool.query(staffQuery, ['Sarah Jenkins', 'sarah@coffeeninja.com', passwordHash]);
    const sarah = sarahRes.rows[0];
    console.log(`✓ Staff User 1: ${sarah.name} (${sarah.email}) - ID: ${sarah.id}`);

    const alexRes = await pool.query(staffQuery, ['Alex Rivera', 'alex@coffeeninja.com', passwordHash]);
    const alex = alexRes.rows[0];
    console.log(`✓ Staff User 2: ${alex.name} (${alex.email}) - ID: ${alex.id}`);

    // 4. Seed sample inquiries if none exist for Sarah
    const existingSarahInquiries = await pool.query(
      'SELECT COUNT(*) FROM inquiries WHERE created_by = $1',
      [sarah.id]
    );

    if (parseInt(existingSarahInquiries.rows[0].count, 10) === 0) {
      console.log('Seeding initial inquiries for Sarah Jenkins...');
      const inquiryInsert = `
        INSERT INTO inquiries (created_by, customer_name, contact, subject, description, status, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;

      await pool.query(inquiryInsert, [
        sarah.id,
        'Michael Scott',
        'michael@dundermifflin.com',
        'Special Blend Roast Bulk Order',
        'Customer requested pricing and delivery timeline for 50 bags of dark roast espresso beans.',
        'New',
        1
      ]);

      await pool.query(inquiryInsert, [
        sarah.id,
        'Dwight Schrute',
        '+1 555-0199',
        'Artisan Single-Origin Roast In-Store Demo',
        'Inquiring whether Coffee Ninja can host an in-store tasting demo for local organic produce partners.',
        'In Progress',
        1
      ]);

      await pool.query(inquiryInsert, [
        sarah.id,
        'Jim Halpert',
        'jim@athlead.com',
        'Office Cold Brew Subscription',
        'Requested weekly keg delivery for company headquarters. Contract confirmed and delivery scheduled.',
        'Resolved',
        1
      ]);
      console.log('✓ Seeded 3 sample inquiries for Sarah.');
    }

    // 5. Seed sample inquiry for Alex if none exist
    const existingAlexInquiries = await pool.query(
      'SELECT COUNT(*) FROM inquiries WHERE created_by = $1',
      [alex.id]
    );

    if (parseInt(existingAlexInquiries.rows[0].count, 10) === 0) {
      console.log('Seeding initial inquiries for Alex Rivera...');
      await pool.query(`
        INSERT INTO inquiries (created_by, customer_name, contact, subject, description, status, version)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        alex.id,
        'Pam Beesly',
        'pam@artstudio.org',
        'Catering for Gallery Exhibition',
        'Need pour-over station and barista for Friday evening reception (approx 40 guests).',
        'New',
        1
      ]);
      console.log('✓ Seeded 1 sample inquiry for Alex.');
    }

    console.log('✅ Database migration and seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error running database migration/seed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSeed();
