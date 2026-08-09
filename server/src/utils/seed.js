// Seeds reference data for local development: the 10 priority + 3
// second-priority countries (HLD Section 1), one demo user per role
// (Section 4), and a few sample compliance_records with benefit_components
// so /records returns something immediately after `npm run seed`.
//
// Run with: npm run seed

const bcrypt = require('bcrypt');
// Local-dev-only seeding, so this talks to the SQLite connection directly
// (same as seedPostgres.js does for the Postgres/Neon side) rather than
// going through the async config/database.js layer every other repository
// in the app uses.
const db = require('../config/sqliteDb');

const COUNTRIES = [
  { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
  { code: 'IN', name: 'India', currency: 'INR' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR' },
  { code: 'JP', name: 'Japan', currency: 'JPY' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR' },
  { code: 'PH', name: 'Philippines', currency: 'PHP' },
  { code: 'SG', name: 'Singapore', currency: 'SGD' },
  { code: 'KR', name: 'South Korea', currency: 'KRW' },
  { code: 'TH', name: 'Thailand', currency: 'THB' },
  { code: 'VN', name: 'Vietnam', currency: 'VND' },
  { code: 'MM', name: 'Myanmar', currency: 'MMK' },
  { code: 'AU', name: 'Australia', currency: 'AUD' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
];

const DEMO_PASSWORD = 'Password123!';

const USERS = [
  { fullName: 'Chloe Compliance', email: 'compliance@hrckmp.test', role: 'compliance' },
  { fullName: 'Sam Sales', email: 'sales@hrckmp.test', role: 'sales' },
  { fullName: 'Cara CustomerService', email: 'cs@hrckmp.test', role: 'customer_service' },
  { fullName: 'Alex Admin', email: 'admin@hrckmp.test', role: 'admin' },
];

function seedCountries() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO countries (country_code, country_name, currency_code) VALUES (?, ?, ?)'
  );
  COUNTRIES.forEach((c) => insert.run(c.code, c.name, c.currency));
}

async function seedUsers() {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  USERS.forEach((u) => insert.run(u.fullName, u.email, passwordHash, u.role));
}

function seedRecords() {
  const complianceUser = db.prepare("SELECT user_id FROM users WHERE role = 'compliance'").get();
  const getCountryId = (code) => db.prepare('SELECT country_id FROM countries WHERE country_code = ?').get(code).country_id;

  const records = [
    {
      countryCode: 'SG',
      category: 'SOCIAL_INSURANCE',
      title: 'Singapore CPF Contribution Rates',
      summary: 'Mandatory Central Provident Fund contributions for Singapore Citizens and Permanent Residents.',
      fullText:
        'Employers and employees both contribute to the CPF for local employees. Rates vary by age band and wage. Contributions are not required for foreign employees, who are instead covered by their work pass conditions.',
      workerType: 'LOCAL',
      visibility: 'CLIENT_SHAREABLE',
      effectiveDate: '2025-01-01',
      sourceUrl: 'https://www.cpf.gov.sg/employer/employer-obligations/how-much-cpf-contributions-to-pay',
      status: 'PUBLISHED',
      components: [
        {
          componentName: 'CPF Contribution',
          workerType: 'LOCAL',
          employerRate: '17%',
          employeeRate: '20%',
          capCeiling: 'SGD 6,000 / month (Ordinary Wage ceiling)',
          calculationBasis: 'monthly gross wage',
        },
      ],
    },
    {
      countryCode: 'ID',
      category: 'STATUTORY_BENEFIT',
      title: 'Indonesia BPJS Contributions',
      summary: 'Multi-part social security and health contributions (BPJS Ketenagakerjaan and BPJS Kesehatan).',
      fullText:
        'Indonesian statutory contributions comprise several components including work accident, death, old-age, pension, and health insurance. Employer and employee shares differ per component, and some are capped at a monthly ceiling.',
      workerType: 'ALL_EMPLOYEES',
      visibility: 'INTERNAL_STAFF',
      effectiveDate: '2025-01-01',
      status: 'DRAFT',
      components: [
        {
          componentName: 'BPJS Ketenagakerjaan',
          workerType: 'ALL_EMPLOYEES',
          employerRate: '3.7%',
          employeeRate: '2%',
          capCeiling: 'Uncapped',
          calculationBasis: 'monthly gross wage',
        },
        {
          componentName: 'BPJS Kesehatan',
          workerType: 'ALL_EMPLOYEES',
          employerRate: '4%',
          employeeRate: '1%',
          capCeiling: 'IDR 12,000,000 / month',
          calculationBasis: 'monthly gross wage',
        },
      ],
    },
    {
      countryCode: 'PH',
      category: 'MATERNITY_PATERNITY',
      title: 'Philippines Expanded Maternity Leave',
      summary: '105 days of paid maternity leave under the Expanded Maternity Leave Law (RA 11210).',
      fullText:
        'Female workers in both the public and private sectors are entitled to 105 days of paid maternity leave, with an additional 15 days for solo parents and an option to extend by 30 days without pay.',
      workerType: 'LOCAL',
      visibility: 'CLIENT_SHAREABLE',
      effectiveDate: '2019-03-11',
      status: 'PUBLISHED',
      components: [],
    },
  ];

  const insertRecord = db.prepare(
    `INSERT INTO compliance_records
      (country_id, category, title, summary, full_text, worker_type, visibility, effective_date, source_url, status, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertComponent = db.prepare(
    `INSERT INTO benefit_components
      (record_id, component_name, worker_type, employer_rate, employee_rate, cap_ceiling, calculation_basis, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const alreadyExists = db.prepare(
    'SELECT 1 FROM compliance_records WHERE country_id = ? AND lower(title) = lower(?)'
  );

  records.forEach((r) => {
    const countryId = getCountryId(r.countryCode);
    if (alreadyExists.get(countryId, r.title)) return;

    const info = insertRecord.run(
      countryId,
      r.category,
      r.title,
      r.summary,
      r.fullText,
      r.workerType,
      r.visibility,
      r.effectiveDate,
      r.sourceUrl || null,
      r.status,
      complianceUser?.user_id ?? null,
      complianceUser?.user_id ?? null
    );
    r.components.forEach((c, idx) =>
      insertComponent.run(
        info.lastInsertRowid,
        c.componentName,
        c.workerType,
        c.employerRate,
        c.employeeRate,
        c.capCeiling,
        c.calculationBasis,
        idx
      )
    );
  });
}

async function main() {
  const alreadySeeded = db.prepare('SELECT COUNT(*) AS count FROM users').get().count > 0;
  if (alreadySeeded) {
    console.log('Database already has users — skipping seed. Delete the DB file to reseed from scratch.');
    return;
  }

  seedCountries();
  await seedUsers();
  seedRecords();

  console.log('Seed complete.');
  console.log(`Demo login (any role): <role>@hrckmp.test / ${DEMO_PASSWORD}`);
  console.log('Roles: compliance, sales, cs, admin (e.g. compliance@hrckmp.test)');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exitCode = 1;
});
