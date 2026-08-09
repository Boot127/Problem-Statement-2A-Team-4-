const fs = require('fs');
const os = require('os');
const path = require('path');
const jwt = require('jsonwebtoken');

const databasePath = path.join(os.tmpdir(), `hrckmp-admin-archive-${process.pid}-${Date.now()}.db`);
process.env.SQLITE_DB_PATH = databasePath;
process.env.DB_PROVIDER = 'sqlite';
process.env.ENABLE_DEV_SEED = 'false';

const app = require('../src/app');
const env = require('../src/config/env');
const db = require('../src/config/db');
const permitDb = require('../src/config/database');
const reviewDb = require('../src/config/reviewSqliteDb');
const recordRepository = require('../src/repositories/recordRepository');
const permitRepository = require('../src/repositories/permitRepository');
const reviewRepository = require('../src/repositories/reviewRepository');

const recordFixture = path.resolve(__dirname, '..', 'uploads', 'records', 'admin-archive-test-record.txt');
const permitFixture = path.resolve(__dirname, '..', 'uploads', 'admin-archive-test-source.pdf');
const checks = [];

function check(name, value) {
  if (!value) throw new Error(`Failed check: ${name}`);
  checks.push(name);
}

function seed() {
  for (const table of [
    'notifications','review_comments','record_versions','review_requests','permit_group_members',
    'permit_source_documents','permit_documents','work_permit_steps','permit_groups','work_permits',
    'record_attachments','benefit_components','compliance_records','audit_logs','users','countries',
  ]) db.prepare(`DELETE FROM ${table}`).run();

  db.prepare("INSERT INTO users(user_id,full_name,email,password_hash,role) VALUES (1,'Admin','admin@test','x','admin'),(2,'Sales','sales@test','x','sales')").run();
  db.prepare("INSERT INTO countries(country_id,country_code,country_name) VALUES (1,'SG','Singapore')").run();
  const now = new Date().toISOString();
  const addRecord = db.prepare('INSERT INTO compliance_records(record_id,country_id,category,title,status,previous_status,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  addRecord.run(1,1,'LABOUR_LAW','Restore content','ARCHIVED','DRAFT',now,now,now);
  addRecord.run(2,1,'OTHER','Delete content','ARCHIVED','DRAFT',now,now,now);
  addRecord.run(10,1,'OTHER','Archive tracking content','PUBLISHED',null,null,now,now);
  db.prepare("INSERT INTO benefit_components(record_id,component_name) VALUES (1,'Kept component'),(2,'Deleted component')").run();
  db.prepare("INSERT INTO record_attachments(record_id,file_name,file_path) VALUES (2,'fixture','/uploads/records/admin-archive-test-record.txt')").run();

  const addPermit = db.prepare('INSERT INTO work_permits(permit_id,country_code,permit_type,title,status,previous_status,archived_at,information_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  addPermit.run(1,'SG','EP','Restore permit','ARCHIVED','PUBLISHED',now,'CURRENT',now,now);
  addPermit.run(2,'SG','S Pass','Delete permit','ARCHIVED','DRAFT',now,'CURRENT',now,now);
  addPermit.run(10,'SG','Test','Archive tracking permit','DRAFT',null,null,'CURRENT',now,now);
  db.prepare("INSERT INTO work_permit_steps(permit_id,process_type,step_number,step_title) VALUES (1,'NEW',1,'Kept step'),(2,'NEW',1,'Deleted step')").run();
  db.prepare("INSERT INTO permit_documents(permit_id,process_type,document_name) VALUES (1,'NEW','Kept doc'),(2,'NEW','Deleted doc')").run();
  db.prepare("INSERT INTO permit_source_documents(permit_id,original_file_name,stored_file_name,mime_type,file_size,source_type,status,uploaded_at) VALUES (2,'fixture.pdf','admin-archive-test-source.pdf','application/pdf',1,'OTHER','ACTIVE',?)").run(now);
  db.prepare("INSERT INTO permit_groups(group_id,group_name,status,created_at,updated_at) VALUES (1,'Fixture Group','ACTIVE',?,?)").run(now,now);
  db.prepare('INSERT INTO permit_group_members(group_id,permit_id,added_at) VALUES (1,1,?),(1,2,?)').run(now,now);

  const addReview = db.prepare('INSERT INTO review_requests(request_id,target_type,target_id,title,review_status,previous_status,archived_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  addReview.run(1,'work_permit',1,'Restore review','ARCHIVED','CHANGES_REQUESTED',now,now,now);
  addReview.run(2,'work_permit',999,'Delete review','ARCHIVED','PENDING',now,now,now);
  addReview.run(3,'work_permit',999,'Protected review','ARCHIVED','APPROVED',now,now,now);
  addReview.run(4,'work_permit',999,'Legacy archived review','ARCHIVED',null,now,now,now);
  addReview.run(10,'work_permit',999,'Archive tracking review','PENDING',null,null,now,now);
  db.prepare("INSERT INTO review_comments(request_id,author_name,comment,created_at) VALUES (1,'A','Keep',?),(2,'A','Delete',?)").run(now,now);
  db.prepare("INSERT INTO notifications(request_id,message,created_at) VALUES (2,'Delete',?),(3,'Keep',?)").run(now,now);
  db.prepare("INSERT INTO record_versions(target_type,target_id,version,snapshot,published_at,review_id) VALUES ('work_permit',999,1,'{}',?,3)").run(now);

  fs.mkdirSync(path.dirname(recordFixture), { recursive: true });
  fs.writeFileSync(recordFixture, 'disposable archive cleanup fixture');
  fs.writeFileSync(permitFixture, 'disposable archive cleanup fixture');
}

async function request(base, token, pathSuffix = '', options = {}) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${base}${pathSuffix}`, { ...options, headers });
  let body = {};
  try { body = await response.json(); } catch { /* an empty response is valid for this helper */ }
  return { status: response.status, body };
}

async function main() {
  seed();
  recordRepository.archive(10,1);
  check('normal content archive remembers state', db.prepare('SELECT previous_status,archived_at FROM compliance_records WHERE record_id=10').get().previous_status==='PUBLISHED' && Boolean(db.prepare('SELECT archived_at FROM compliance_records WHERE record_id=10').get().archived_at));
  await permitRepository.archive(10,new Date().toISOString());
  check('normal permit archive remembers state', db.prepare('SELECT previous_status,archived_at FROM work_permits WHERE permit_id=10').get().previous_status==='DRAFT' && Boolean(db.prepare('SELECT archived_at FROM work_permits WHERE permit_id=10').get().archived_at));
  reviewRepository.transition(10,'ARCHIVED','Test reviewer',new Date().toISOString());
  check('normal review archive remembers state', db.prepare('SELECT previous_status,archived_at FROM review_requests WHERE request_id=10').get().previous_status==='PENDING' && Boolean(db.prepare('SELECT archived_at FROM review_requests WHERE request_id=10').get().archived_at));
  db.prepare('DELETE FROM review_requests WHERE request_id=10').run();
  db.prepare('DELETE FROM work_permits WHERE permit_id=10').run();
  db.prepare('DELETE FROM compliance_records WHERE record_id=10').run();
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    const base = `http://127.0.0.1:${server.address().port}/api/v1/admin/archives`;
    const token = (role,id) => jwt.sign({ sub:id,role,email:`${role}@test` }, env.jwtSecret, { expiresIn:'5m' });
    const admin = token('admin',1);

    check('unauthenticated API returns 401', (await request(base)).status === 401);
    check('non-admin API returns 403', (await request(base,token('sales',2))).status === 403);
    check('non-admin restore returns 403', (await request(base,token('sales',2),'/COMPLIANCE_CONTENT/1/restore',{method:'POST'})).status === 403);
    check('non-admin delete returns 403', (await request(base,token('sales',2),'/COMPLIANCE_CONTENT/1',{method:'DELETE'})).status === 403);
    check('unsupported entity type returns 400', (await request(base,admin,'?entityType=USERS')).status === 400);
    const listing = await request(base,admin,'?entityType=COMPLIANCE_CONTENT&search=Restore');
    check('admin listing and counts', listing.status===200 && listing.body.items.length===1 && listing.body.counts.WORK_PERMIT===2);

    check('content restore request', (await request(base,admin,'/COMPLIANCE_CONTENT/1/restore',{method:'POST'})).status===200);
    check('content restores previous state', db.prepare('SELECT status FROM compliance_records WHERE record_id=1').get().status==='DRAFT');
    check('content restore keeps components', db.prepare('SELECT COUNT(*) n FROM benefit_components WHERE record_id=1').get().n===1);
    check('content delete request', (await request(base,admin,'/COMPLIANCE_CONTENT/2',{method:'DELETE'})).status===200);
    check('content children deleted', !db.prepare('SELECT 1 FROM compliance_records WHERE record_id=2').get() && db.prepare('SELECT COUNT(*) n FROM benefit_components WHERE record_id=2').get().n===0 && db.prepare('SELECT COUNT(*) n FROM record_attachments WHERE record_id=2').get().n===0);
    check('content attachment file deleted', !fs.existsSync(recordFixture));

    check('permit restore request', (await request(base,admin,'/WORK_PERMIT/1/restore',{method:'POST'})).status===200);
    check('permit restores previous state', db.prepare('SELECT status FROM work_permits WHERE permit_id=1').get().status==='PUBLISHED');
    check('permit restore keeps all children', db.prepare('SELECT COUNT(*) n FROM work_permit_steps WHERE permit_id=1').get().n===1 && db.prepare('SELECT COUNT(*) n FROM permit_documents WHERE permit_id=1').get().n===1 && db.prepare('SELECT COUNT(*) n FROM permit_group_members WHERE permit_id=1').get().n===1);
    check('permit delete request', (await request(base,admin,'/WORK_PERMIT/2',{method:'DELETE'})).status===200);
    check('permit dependents deleted', !db.prepare('SELECT 1 FROM work_permits WHERE permit_id=2').get() && db.prepare('SELECT COUNT(*) n FROM work_permit_steps WHERE permit_id=2').get().n===0 && db.prepare('SELECT COUNT(*) n FROM permit_documents WHERE permit_id=2').get().n===0 && db.prepare('SELECT COUNT(*) n FROM permit_source_documents WHERE permit_id=2').get().n===0 && db.prepare('SELECT COUNT(*) n FROM permit_group_members WHERE permit_id=2').get().n===0);
    check('permit source file deleted', !fs.existsSync(permitFixture));

    check('review restore request', (await request(base,admin,'/REVIEW/1/restore',{method:'POST'})).status===200);
    check('review restores previous state', db.prepare('SELECT review_status FROM review_requests WHERE request_id=1').get().review_status==='CHANGES_REQUESTED');
    check('review restore keeps comments', db.prepare('SELECT COUNT(*) n FROM review_comments WHERE request_id=1').get().n===1);
    check('legacy review restore request', (await request(base,admin,'/REVIEW/4/restore',{method:'POST'})).status===200);
    check('legacy review uses safe Pending fallback', db.prepare('SELECT review_status FROM review_requests WHERE request_id=4').get().review_status==='PENDING');
    check('unversioned review delete request', (await request(base,admin,'/REVIEW/2',{method:'DELETE'})).status===200);
    check('review comments and notifications deleted', !db.prepare('SELECT 1 FROM review_requests WHERE request_id=2').get() && db.prepare('SELECT COUNT(*) n FROM review_comments WHERE request_id=2').get().n===0 && db.prepare('SELECT COUNT(*) n FROM notifications WHERE request_id=2').get().n===0);
    check('versioned review deletion blocked', (await request(base,admin,'/REVIEW/3',{method:'DELETE'})).status===409 && Boolean(db.prepare('SELECT 1 FROM review_requests WHERE request_id=3').get()) && Boolean(db.prepare('SELECT 1 FROM record_versions WHERE review_id=3').get()));

    const actions = db.prepare('SELECT admin_action FROM audit_logs WHERE admin_action IS NOT NULL').all().map((row) => row.admin_action);
    check('archive admin actions audited', actions.includes('RESTORE_ARCHIVED') && actions.includes('PERMANENT_DELETE'));
    check('foreign keys remain valid', db.prepare('PRAGMA foreign_key_check').all().length===0);
    console.log(`Admin Archive Management: ${checks.length} checks passed`);
    checks.forEach((name) => console.log(`  PASS ${name}`));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await permitDb.close();
    reviewDb.close();
    db.close();
    for (const file of [recordFixture,permitFixture,databasePath,`${databasePath}-wal`,`${databasePath}-shm`]) {
      try { fs.unlinkSync(file); } catch { /* already removed */ }
    }
  }
}

main().catch((error) => { console.error(error); process.exitCode=1; });
