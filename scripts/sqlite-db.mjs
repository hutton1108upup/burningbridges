import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
export function openDB(filename=':memory:') {
  const sqlite=new DatabaseSync(filename);
  sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get()) sqlite.exec(readFileSync(new URL('../migrations/0001_commerce.sql',import.meta.url),'utf8'));
  sqlite.exec(readFileSync(new URL('../migrations/0002_google_auth.sql',import.meta.url),'utf8'));
  if(!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='provider_jobs'").get()) sqlite.exec(readFileSync(new URL('../migrations/0003_provider_jobs.sql',import.meta.url),'utf8'));
  const providerColumns=new Set(sqlite.prepare("PRAGMA table_info(provider_jobs)").all().map(x=>x.name));
  for(const column of ['scene_asset_id','enqueue_token','enqueue_until','enqueued_at']) if(!providerColumns.has(column)) sqlite.exec(`ALTER TABLE provider_jobs ADD COLUMN ${column} ${column==='enqueue_until'||column==='enqueued_at'?'INTEGER':'TEXT'}`);
  const db={
    prepare(query) {
      return {bind(...values) {
        const statement=sqlite.prepare(query);
        return {
          query,values,
          async first(){return statement.get(...values)||null;},
          async all(){return {results:statement.all(...values)};},
          async raw(){return statement.all(...values).map(row=>statement.columns().map(column=>row[column.name]));},
          async run(){return statement.run(...values);},
        };
      }};
    },
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results=statements.map(item=>sqlite.prepare(item.query).run(...item.values));
        sqlite.exec('COMMIT');return results;
      } catch(error) {sqlite.exec('ROLLBACK');throw error;}
    },
    sqlite,close:()=>sqlite.close(),
  };
  return db;
}
