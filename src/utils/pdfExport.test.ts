import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePdfDocument } from './pdfExport';

test('generatePdfDocument generates valid PDF instance with headers and data', () => {
  const doc = generatePdfDocument({
    reportTitle: 'Current Stock Report',
    branchName: 'Dhaka Main Hub (Dhanmondi)',
    categoryFilter: 'Cosmetic Products',
    generatedBy: 'Super Admin',
    headers: ['Product Name', 'SKU', 'Category', 'Current Stock', 'Min Alert', 'Status'],
    dataRows: [
      ['Organic Aloe Vera Gel', 'BH-COS-01', 'Cosmetic Products', 25, 10, 'Available'],
      ['Radiance Vitamin C Serum', 'BH-COS-02', 'Cosmetic Products', 4, 10, 'Low Stock'],
    ],
    summaryStats: [
      { label: 'Total Items', value: 2 },
      { label: 'Total Stock', value: 29 },
    ],
  });

  assert.ok(doc);
  const pdfOutput = doc.output('arraybuffer');
  assert.ok(pdfOutput.byteLength > 0);
});

test('generatePdfDocument respects landscape mode for wide reports', () => {
  const wideDoc = generatePdfDocument({
    reportTitle: 'Gross Profit Report',
    branchName: 'All Branches',
    generatedBy: 'Super Admin',
    headers: ['Date', 'Invoice No', 'Branch', 'Product', 'Category', 'Qty', 'Unit Cost', 'Unit Price', 'Sales', 'COGS', 'Gross Profit'],
    dataRows: [
      ['2026-10-19', 'INV-001', 'Dhaka Main', 'Royal Oud EDP', 'Perfume Products', 2, 2500, 4500, 9000, 5000, 4000],
    ],
  });

  assert.ok(wideDoc);
  // Landscape A4 has width > height (pt: 841.89 > 595.28)
  const width = wideDoc.internal.pageSize.getWidth();
  const height = wideDoc.internal.pageSize.getHeight();
  assert.ok(width > height);
});
