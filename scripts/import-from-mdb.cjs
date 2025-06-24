const ADODB = require('node-adodb');
const fs = require('fs');
const Papa = require('papaparse');

// --- CONFIGURATION ---
// 1. MDB file path
const MDB_FILE_PATH = 'D:\\Program Files (x86)\\SmartOffice\\Smart Office Suite\\SmartOffice.mdb';

// 2. Table Names in MDB
const EMPLOYEE_TABLE_MDB = 'Userinfo';
const ATTENDANCE_TABLE_MDB = 'Checkinout';

// 3. Output file names
const EMPLOYEE_OUTPUT_CSV = 'exported_employees.csv';
const ATTENDANCE_OUTPUT_CSV = 'exported_attendance.csv';
// --- END CONFIGURATION ---

const connection = ADODB.open(`Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${MDB_FILE_PATH};`);

async function exportTableToCSV(tableName, outputFileName) {
  console.log(`--- Exporting "${tableName}" to ${outputFileName} ---`);
  try {
    console.log(`Querying "${tableName}" table from MDB...`);
    const data = await connection.query(`SELECT * FROM ${tableName}`);
    console.log(`Found ${data.length} records.`);

    if (!data || data.length === 0) {
      console.log('No data found. Skipping file creation.');
      return;
    }

    const csv = Papa.unparse(data);
    
    fs.writeFileSync(outputFileName, csv);

    console.log(`Successfully exported data to "${outputFileName}".`);
    console.log(`You can find this file in the root of the project directory.`);

  } catch (error) {
    console.error(`An error occurred during the export of "${tableName}":`, error);
  }
  console.log(`--- Finished exporting "${tableName}" ---`);
}

async function main() {
  console.log('Starting data export process...');
  await exportTableToCSV(EMPLOYEE_TABLE_MDB, EMPLOYEE_OUTPUT_CSV);
  console.log('\n'); // Add a space between exports
  await exportTableToCSV(ATTENDANCE_TABLE_MDB, ATTENDANCE_OUTPUT_CSV);
  console.log('\nExport process complete.');
}

main().catch(console.error); 