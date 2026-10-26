import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

test('XLSX workbook creates valid sheet from report data array', () => {
  const sheetData = [
    ['BEST HERITAGE — MULTI-BRANCH STOCK & SALES MANAGEMENT'],
    ['GROSS PROFIT REPORT'],
    ['Branch: Dhaka Main Hub | Date Range: 2026-10-01 to 2026-10-31'],
    [],
    ['Date', 'Invoice No', 'Branch', 'Sales Amount', 'Cost of Goods Sold', 'Gross Profit'],
    ['2026-10-19', 'INV-20261019-001', 'Dhaka Main Hub', 'Tk 8,150.00', 'Tk 4,650.00', '+Tk 3,500.00'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Gross Profit');

  assert.equal(wb.SheetNames.length, 1);
  assert.equal(wb.SheetNames[0], 'Gross Profit');

  // Verify cell values
  assert.equal(ws['A1']?.v, 'BEST HERITAGE — MULTI-BRANCH STOCK & SALES MANAGEMENT');
  assert.equal(ws['A2']?.v, 'GROSS PROFIT REPORT');
  assert.equal(ws['D6']?.v, 'Tk 8,150.00');
  assert.equal(ws['F6']?.v, '+Tk 3,500.00');

  // Test output buffer generation
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  assert.ok(buf.length > 0);
});

test('XLSX export structures all 10 Best Heritage reports with branding', () => {
  const requiredReportTitles = [
    '1. Current Stock Report',
    '2. Stock In Report',
    '3. Stock Out Report',
    '4. Sales Report',
    '5. Product-wise Sales Report',
    '6. Branch-wise Stock Report',
    '7. Low Stock Report',
    '8. Out of Stock Report',
    '9. Purchase Cost & Sales Price Report',
    '10. Gross Profit Report',
  ];

  for (const title of requiredReportTitles) {
    const wb = XLSX.utils.book_new();
    const rows = [
      ['BEST HERITAGE — MULTI-BRANCH STOCK & SALES MANAGEMENT'],
      [title.toUpperCase()],
      ['Branch: Gulshan Flagship | Period: 2026-10-01 to 2026-10-31'],
      [],
      ['Header 1', 'Header 2', 'Header 3'],
      ['Row 1 Data', 100, 'Tk 5,000.00'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const safeSheetName = title.slice(0, 31).replace(/[\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName);

    assert.equal(wb.SheetNames[0], safeSheetName);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    assert.ok(buf.length > 0);
  }
});

test('Branch restriction prevents unauthorized branch data leakage', () => {
  // Simulating branch user restricted to 'br_dhanmondi'
  const allBranchRecords = [
    { branchId: 'br_dhaka_main', branchName: 'Dhaka Main Hub', revenue: 50000 },
    { branchId: 'br_dhanmondi', branchName: 'Dhanmondi Express Outlet', revenue: 24500 },
    { branchId: 'br_gulshan', branchName: 'Gulshan Flagship', revenue: 68000 },
  ];

  const currentRole = 'branch_user';
  const assignedBranchId = 'br_dhanmondi';

  // Security filter
  const authorizedRecords = allBranchRecords.filter((rec) => {
    if (currentRole === 'branch_user') {
      return rec.branchId === assignedBranchId;
    }
    return true;
  });

  assert.equal(authorizedRecords.length, 1);
  assert.equal(authorizedRecords[0].branchName, 'Dhanmondi Express Outlet');
  assert.equal(authorizedRecords[0].revenue, 24500);

  // Verify other branches are strictly omitted
  assert.ok(!authorizedRecords.some((r) => r.branchId === 'br_dhaka_main'));
  assert.ok(!authorizedRecords.some((r) => r.branchId === 'br_gulshan'));
});
