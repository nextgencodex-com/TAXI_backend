/*
Migration script: add_readable_ids.js

Purpose:
- For existing documents in collections sharedRides, vehicles, rides, bookings
  add fields:
    - readableId: SMST-<timestamp>-<4digits>
    - bookingId: SMST-... (for collections where bookingId makes sense: sharedRides, rides, bookings)
    - vehicleId: SMST-... (for vehicles)

Behavior:
- Updates documents in-place (no rename/copy).
- Uses batched writes (keeps <= 400 ops per batch to be safe).
- Skip docs that already have a readableId to avoid double-updating.

Usage:
  NODE_ENV=production node src/scripts/add_readable_ids.js

Make sure the environment variables for Firebase Admin are available (same as server startup).
Run this in a staging project first.
*/

const admin = require('firebase-admin');
const path = require('path');

// Load same config that server uses if available
try {
  require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
} catch (e) {}

// If your app already initialized admin in config, you can require that instead.
// Here we'll initialize using environment variables (service account fields) if not already.
if (!admin.apps.length) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

function generateReadableId(prefix = 'STSL') {
  // Generate a 6-digit random number (100000-999999) and append a timestamp for uniqueness
  const sixDigits = Math.floor(100000 + Math.random() * 900000)
  return `${prefix}-${sixDigits}-${Date.now()}`;
}

async function updateCollection(collectionName, opts = {}) {
  console.log(`\n--- Processing collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  console.log(`Found ${snapshot.size} documents in ${collectionName}`);
  if (snapshot.empty) return { updated: 0 };

  let batch = db.batch();
  let ops = 0;
  let updated = 0;
  const toUpdateDocs = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Skip if already has readableId
    if (data && (data.readableId || data.bookingId || data.vehicleId)) {
      // We will still set missing fields individually below, but skip if readableId exists to be safe
      if (data.readableId) continue;
    }

    const updates = {};
    const rid = generateReadableId('STSL');
    updates.readableId = rid;

    if (opts.setBookingId) {
      // Only set bookingId if missing
      if (!data.bookingId) updates.bookingId = rid;
    }
    if (opts.setVehicleId) {
      if (!data.vehicleId) updates.vehicleId = rid;
    }

    if (Object.keys(updates).length === 0) continue;

    if (opts.dryRun) {
      // Collect docs that would be updated in dry-run mode
      toUpdateDocs.push({ id: doc.id, updates });
      updated += 1;
      continue;
    }

    batch.update(doc.ref, updates);
    ops += 1;
    updated += 1;

    // Commit every 400 ops
    if (ops >= 400) {
      await batch.commit();
      console.log(`Committed a batch of ${ops} updates for ${collectionName}`);
      batch = db.batch();
      ops = 0;
    }
  }

  if (!opts.dryRun && ops > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${ops} updates for ${collectionName}`);
  }

  if (opts.dryRun) {
    console.log(`Dry-run: ${toUpdateDocs.length} documents would be updated in ${collectionName}`);
    toUpdateDocs.slice(0, 20).forEach(d => {
      console.log(` - ${d.id}: ${JSON.stringify(d.updates)}`);
    });
    if (toUpdateDocs.length > 20) console.log(` ... and ${toUpdateDocs.length - 20} more`);
  }

  return { updated };
}

async function main() {
  try {
    // Determine run mode: default = dry-run. To actually apply updates, pass --apply or set MIGRATION_AUTO_APPLY=true
    const args = process.argv.slice(2);
    const requestedDryRun = args.includes('--dry-run') || process.env.MIGRATION_DRY_RUN === 'true';
    const requestedApply = args.includes('--apply') || process.env.MIGRATION_AUTO_APPLY === 'true' || process.env.MIGRATION_AUTO_APPLY === '1';

    const dryRun = !requestedApply && requestedDryRun !== false;

    console.log('Starting migration to add readableId / bookingId / vehicleId');
    console.log(`Mode: ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY (committing updates)'}`);

    if (dryRun) {
      console.log('Dry-run will preview changes. To apply, re-run with --apply or set MIGRATION_AUTO_APPLY=true');
    }

    const work = [
      { name: 'sharedRides', opts: { setBookingId: true, dryRun } },
      { name: 'vehicles', opts: { setVehicleId: true, dryRun } },
      { name: 'rides', opts: { setBookingId: true, dryRun } },
      { name: 'bookings', opts: { setBookingId: true, dryRun } },
    ];

    for (const w of work) {
      const res = await updateCollection(w.name, w.opts);
      console.log(`Updated ${res.updated} docs in ${w.name}`);
    }

    console.log('\nMigration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

// If this script is invoked directly, run main()
if (require.main === module) {
  main();
}
