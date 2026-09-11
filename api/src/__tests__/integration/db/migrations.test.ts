import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { testPool } from '../setup/integration.setup';

const initDir = path.join(__dirname, '../../../../../db/init');

describe('schema_migrations', () => {
  const files = fs
    .readdirSync(initDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  it('has one row per db/init file', async () => {
    const { rows } = await testPool.query(
      'select filename from schema_migrations order by filename',
    );

    expect(rows.map((row) => row.filename).sort()).toEqual(files);
  });

  it('stores the sha256 of each file', async () => {
    const { rows } = await testPool.query(
      'select filename, checksum from schema_migrations',
    );
    const stored = Object.fromEntries(
      rows.map((row) => [row.filename, row.checksum]),
    );

    for (const name of files) {
      const sum = createHash('sha256')
        .update(fs.readFileSync(path.join(initDir, name)))
        .digest('hex');
      expect({ name, checksum: stored[name] }).toEqual({ name, checksum: sum });
    }
  });
});
