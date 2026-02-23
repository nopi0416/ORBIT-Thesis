import ExcelJS from 'exceljs';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

const outputDir = path.resolve(process.cwd(), 'test-data', 'bulk-add');

const HEADERS = [
  'Account Type',
  'Admin Role',
  'Employee ID',
  'Name',
  'Email',
  'Role',
  'Geo',
  'Organizational Unit',
  'Department',
];

const ROLES = ['Requestor', 'L1 Approver', 'L2 Approver', 'L3 Approver', 'Payroll'];
const OUS = ['Company A', 'Company B'];
const DEPARTMENTS_COMPANY_A = [
  'Marketing',
  'Security',
  'Product Management',
  'Data Engineering',
  'Business Intelligence',
  'Compliance',
];
const GEO = 'Philippines';

const FIRST_NAMES = [
  'Liam','Noah','Oliver','Elijah','James','William','Benjamin','Lucas','Henry','Alexander',
  'Mason','Michael','Ethan','Daniel','Jacob','Logan','Jackson','Levi','Sebastian','Mateo',
  'Jack','Owen','Theodore','Aiden','Samuel','Joseph','John','David','Wyatt','Matthew',
  'Luke','Asher','Carter','Julian','Grayson','Leo','Jayden','Gabriel','Isaac','Lincoln',
  'Anthony','Hudson','Dylan','Ezra','Thomas','Charles','Christopher','Jaxon','Maverick','Josiah',
];

const LAST_NAMES = [
  'Reyes','Santos','Cruz','Bautista','Garcia','Mendoza','Torres','Ramos','Flores','Gonzales',
  'Navarro','Castillo','Aquino','Domingo','Fernandez','Lopez','Perez','Rivera','Delos Reyes','Villanueva',
  'Santiago','Mercado','Valdez','Soriano','Natividad','Panganiban','Arceo','Espino','Aguilar','Manaloto',
  'Salazar','Rosales','Trinidad','Molina','Caballero','Arellano','Aguirre','Pascual','Camacho','Beltran',
  'Serrano','Yap','Go','Lim','Tan','Uy','Dizon','Alcantara','Dela Cruz','Villafuerte',
];

function roleForIndex(index) {
  return ROLES[index % ROLES.length];
}

function ouForRole(role, index) {
  if (role === 'Requestor') return 'Company A';
  return OUS[index % OUS.length];
}

function departmentFor(role, ou, index) {
  if (role !== 'Requestor') return '';
  if (ou !== 'Company A') return '';
  return DEPARTMENTS_COMPANY_A[index % DEPARTMENTS_COMPANY_A.length];
}

function createValidRows() {
  const rows = [];

  for (let i = 0; i < 50; i += 1) {
    const employeeNumber = 111 + i;
    const employeeId = `EMP${employeeNumber}`;
    const firstName = FIRST_NAMES[i];
    const lastName = LAST_NAMES[i];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}.${employeeNumber}@companyx.ph`;
    const role = roleForIndex(i);
    const ou = ouForRole(role, i);
    const department = departmentFor(role, ou, i);

    rows.push([
      'User',
      '',
      employeeId,
      fullName,
      email,
      role,
      GEO,
      ou,
      department,
    ]);
  }

  rows.push(['Admin', 'Company Admin', '', 'Ariana Del Rosario', 'ariana.delrosario.admin@companyx.ph', '', '', 'Company A', '']);
  rows.push(['Admin', 'Company Admin', '', 'Martin Velasco', 'martin.velasco.admin@companyx.ph', '', '', 'Company B', '']);
  rows.push(['Admin', 'Super Admin', '', 'Cassandra Villareal', 'cassandra.villareal.superadmin@companyx.ph', '', '', '', '']);
  rows.push(['Admin', 'Super Admin', '', 'Raphael Montemayor', 'raphael.montemayor.superadmin@companyx.ph', '', '', '', '']);

  return rows;
}

function createErrorRows() {
  const rows = [];

  rows.push(['User', '', '', 'Missing EmployeeId', 'missing.employeeid@companyx.ph', 'L1 Approver', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP111', 'Duplicate EmployeeId A', 'duplicate.eid.a@companyx.ph', 'L2 Approver', GEO, 'Company B', '']);
  rows.push(['User', '', 'EMP111', 'Duplicate EmployeeId B', 'duplicate.eid.b@companyx.ph', 'L3 Approver', GEO, 'Company B', '']);
  rows.push(['User', '', 'EMP11-2', 'Non Alphanumeric EID', 'non.alphanumeric.eid@companyx.ph', 'Payroll', GEO, 'Company B', '']);
  rows.push(['User', '', 'EMP113', 'Invalid Email', 'invalid-email', 'L1 Approver', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP114', '', 'missing.name@companyx.ph', 'L2 Approver', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP115', 'Missing Role', 'missing.role@companyx.ph', '', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP116', 'Role Not Found', 'role.notfound@companyx.ph', 'Director', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP117', 'Missing Geo', 'missing.geo@companyx.ph', 'Payroll', '', 'Company B', '']);
  rows.push(['User', '', 'EMP118', 'Geo Not Found', 'geo.notfound@companyx.ph', 'L3 Approver', 'Mars', 'Company B', '']);
  rows.push(['User', '', 'EMP119', 'Missing OU', 'missing.ou@companyx.ph', 'L1 Approver', GEO, '', '']);
  rows.push(['User', '', 'EMP120', 'OU Not Found', 'ou.notfound@companyx.ph', 'L2 Approver', GEO, 'Company C', '']);
  rows.push(['User', '', 'EMP121', 'Requestor Missing Dept', 'requestor.no.dept@companyx.ph', 'Requestor', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP122', 'Requestor Dept Not Found', 'requestor.dept.notfound@companyx.ph', 'Requestor', GEO, 'Company A', 'Operations']);
  rows.push(['User', '', 'EMP123', 'Requestor Wrong OU', 'requestor.wrong.ou@companyx.ph', 'Requestor', GEO, 'Company B', 'Marketing']);

  rows.push(['Admin', '', '', 'Admin Missing Role', 'admin.missing.role@companyx.ph', '', '', 'Company A', '']);
  rows.push(['Admin', 'Regional Admin', '', 'Admin Invalid Role', 'admin.invalid.role@companyx.ph', '', '', 'Company A', '']);
  rows.push(['Admin', 'Company Admin', '', 'Admin Missing OU', 'admin.company.no.ou@companyx.ph', '', '', '', '']);

  rows.push(['Contractor', '', 'EMP124', 'Invalid AccountType', 'invalid.account.type@companyx.ph', 'Payroll', GEO, 'Company A', '']);

  rows.push(['User', '', 'EMP125', 'Duplicate Email A', 'duplicate.email@companyx.ph', 'L1 Approver', GEO, 'Company A', '']);
  rows.push(['User', '', 'EMP126', 'Duplicate Email B', 'duplicate.email@companyx.ph', 'L2 Approver', GEO, 'Company A', '']);

  return rows;
}

async function writeWorkbook(fileName, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Users');

  worksheet.addRow(HEADERS);
  rows.forEach((row) => worksheet.addRow(row));

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns = [
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 28 },
    { width: 36 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
    { width: 24 },
  ];

  const outputPath = path.resolve(outputDir, fileName);
  await workbook.xlsx.writeFile(outputPath);
  return outputPath;
}

async function run() {
  await mkdir(outputDir, { recursive: true });

  const validPath = await writeWorkbook('bulk_add_valid_54_users_philippines.xlsx', createValidRows());
  const errorPath = await writeWorkbook('bulk_add_error_cases_philippines.xlsx', createErrorRows());

  console.log(`Created: ${validPath}`);
  console.log(`Created: ${errorPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
