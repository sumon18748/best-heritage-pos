import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Building2,
  Package,
  Filter,
  BarChart3,
  Layers,
  ArrowLeftRight,
  Wallet,
  ShieldAlert,
} from 'lucide-react';
import {
  formatCurrencyBDT,
  calculateStockAlertStatus,
} from '../utils/stockCalculations';
import { exportReportToExcel } from '../utils/excelExport';
import { exportReportToPdf } from '../utils/pdfExport';
import { MainCategoryName } from '../types';

type ReportType =
  | 'current_stock'
  | 'stock_in'
  | 'stock_out'
  | 'sales'
  | 'product_sales'
  | 'branch_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'price_comparison'
  | 'gross_profit'
  | 'transfers'
  | 'cash_expenses';

export const ReportsView: React.FC = () => {
  const {
    products,
    branches,
    branchStocks,
    stockIns,
    stockOuts,
    sales,
    transfers,
    expenses,
    currentUser,
    selectedBranchId,
    canViewProfit,
  } = useApp();

  const [selectedReport, setSelectedReport] = useState<ReportType>('current_stock');
  const [startDate, setStartDate] = useState('2026-10-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const isBranchLocked = currentUser.role === 'manager' && !!currentUser.branchId;
  const [filterBranchId, setFilterBranchId] = useState<string>(
    isBranchLocked ? currentUser.branchId! : selectedBranchId
  );
  const [filterProductId, setFilterProductId] = useState<string>('all');

  const effectiveBranchId = isBranchLocked ? currentUser.branchId! : filterBranchId;

  // Master list of 12 reports, with profit report excluded if user cannot view profit
  const allReports: { id: ReportType; name: string; number: number; requiresProfitView?: boolean }[] = [
    { id: 'current_stock', name: '1. Current Stock Report', number: 1 },
    { id: 'stock_in', name: '2. Stock In Report', number: 2 },
    { id: 'stock_out', name: '3. Stock Out Report', number: 3 },
    { id: 'sales', name: '4. Sales Report', number: 4 },
    { id: 'product_sales', name: '5. Product-wise Sales Report', number: 5 },
    { id: 'branch_stock', name: '6. Branch-wise Stock Report', number: 6 },
    { id: 'low_stock', name: '7. Low Stock Report', number: 7 },
    { id: 'out_of_stock', name: '8. Out of Stock Report', number: 8 },
    { id: 'price_comparison', name: '9. Purchase Cost & Sales Price Report', number: 9 },
    { id: 'gross_profit', name: '10. Gross Profit & P&L Report', number: 10, requiresProfitView: true },
    { id: 'transfers', name: '11. Branch Transfers Movement Report', number: 11 },
    { id: 'cash_expenses', name: '12. Daily Cash & Expense Reconciliation', number: 12 },
  ];

  const reportList = allReports.filter((r) => !r.requiresProfitView || canViewProfit);

  // If user selected gross_profit but can't view profit, fallback to current_stock
  const activeReport = (selectedReport === 'gross_profit' && !canViewProfit) ? 'current_stock' : selectedReport;

  // Products filtered by selected category
  const categoryFilteredProducts = products.filter(
    (p) => selectedCategory === 'all' || p.categoryName === selectedCategory
  );

  const isDateInRange = (dateStr: string) => {
    return dateStr >= startDate && dateStr <= endDate;
  };

  const branchNameDisplay =
    effectiveBranchId === 'all'
      ? 'All Branches'
      : branches.find((b) => b.id === effectiveBranchId)?.name || 'Branch';

  // Build report dataset based on selected report
  let reportHeaders: string[] = [];
  let reportRows: (string | number)[][] = [];
  let summaryStats: { label: string; value: string }[] = [];

  switch (activeReport) {
    case 'current_stock': {
      if (canViewProfit) {
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Branch', 'Opening', 'Stock In', 'Stock Out', 'Sold', 'Current Stock', 'Unit Cost', 'Stock Valuation'];
      } else {
        // Manager privacy: Hide unit cost and stock valuation
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Branch', 'Opening', 'Stock In', 'Stock Out', 'Sold', 'Current Stock', 'Selling Price', 'Status'];
      }

      const data = branchStocks
        .filter((s) => (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
        .filter((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          if (!p) return false;
          if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
          if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
          return true;
        })
        .map((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          const b = branches.find((br) => br.id === s.branchId);
          const cost = p?.purchasePrice || 0;
          const sell = p?.sellingPrice || 0;
          const val = s.currentStock * cost;

          if (canViewProfit) {
            return [
              p?.name || 'Product',
              p?.sku || 'SKU',
              p?.categoryName || '—',
              b?.name || 'Branch',
              s.openingStock,
              s.stockIn,
              s.stockOut,
              s.quantitySold,
              s.currentStock,
              formatCurrencyBDT(cost),
              formatCurrencyBDT(val),
            ];
          } else {
            return [
              p?.name || 'Product',
              p?.sku || 'SKU',
              p?.categoryName || '—',
              b?.name || 'Branch',
              s.openingStock,
              s.stockIn,
              s.stockOut,
              s.quantitySold,
              s.currentStock,
              formatCurrencyBDT(sell),
              s.currentStock === 0 ? 'Out of Stock' : s.currentStock <= (p?.minAlertLevel || 5) ? 'Low Stock' : 'In Stock',
            ];
          }
        });
      reportRows = data;

      const totalQty = branchStocks
        .filter((s) => (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
        .filter((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          if (!p) return false;
          if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
          if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
          return true;
        })
        .reduce((sum, s) => sum + s.currentStock, 0);

      if (canViewProfit) {
        const totalVal = branchStocks
          .filter((s) => (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
          .filter((s) => {
            const p = products.find((prod) => prod.id === s.productId);
            if (!p) return false;
            if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
            if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
            return true;
          })
          .reduce((sum, s) => {
            const p = products.find((prod) => prod.id === s.productId);
            return sum + s.currentStock * (p?.purchasePrice || 0);
          }, 0);

        summaryStats = [
          { label: 'Total Current Stock', value: `${totalQty} units` },
          { label: 'Total Stock Valuation', value: formatCurrencyBDT(totalVal) },
        ];
      } else {
        summaryStats = [
          { label: 'Total Current Stock', value: `${totalQty} units` },
          { label: 'Product Lines', value: `${reportRows.length} items` },
        ];
      }
      break;
    }

    case 'stock_in': {
      reportHeaders = ['Date', 'SIN Ref', 'Branch', 'Category', 'Supplier', 'Invoice Ref', 'Items', 'Total Qty', 'Total Cost', 'Recorded By'];
      const filtered = stockIns.filter(
        (stk) =>
          isDateInRange(stk.date) &&
          (effectiveBranchId === 'all' || stk.branchId === effectiveBranchId) &&
          (selectedCategory === 'all' || stk.items.some((i) => {
            const p = products.find((prod) => prod.id === i.productId);
            return p?.categoryName === selectedCategory;
          })) &&
          (filterProductId === 'all' || stk.items.some((i) => i.productId === filterProductId))
      );
      reportRows = filtered.map((tx) => [
        tx.date,
        tx.referenceNo,
        tx.branchName,
        tx.items[0]?.categoryName || 'Mixed',
        tx.supplierName || '—',
        tx.supplierInvoiceNo || '—',
        tx.items.map((i) => `${i.productName} (${i.quantity})`).join('; '),
        tx.totalQuantity,
        formatCurrencyBDT(tx.totalPurchaseCost),
        tx.createdByName,
      ]);

      const totalQtyIn = filtered.reduce((sum, t) => sum + t.totalQuantity, 0);
      const totalCostIn = filtered.reduce((sum, t) => sum + t.totalPurchaseCost, 0);
      summaryStats = [
        { label: 'Total Stocked In', value: `${totalQtyIn} units` },
        { label: 'Total Purchase Amount', value: formatCurrencyBDT(totalCostIn) },
      ];
      break;
    }

    case 'stock_out': {
      reportHeaders = ['Date', 'SOUT Ref', 'Branch', 'Category', 'Reason', 'Reference Doc', 'Items Deducted', 'Quantity Deducted', 'Authorized By'];
      const filtered = stockOuts.filter(
        (stk) =>
          isDateInRange(stk.date) &&
          (effectiveBranchId === 'all' || stk.branchId === effectiveBranchId) &&
          (selectedCategory === 'all' || stk.items.some((i) => {
            const p = products.find((prod) => prod.id === i.productId);
            return p?.categoryName === selectedCategory;
          })) &&
          (filterProductId === 'all' || stk.items.some((i) => i.productId === filterProductId))
      );
      reportRows = filtered.map((tx) => [
        tx.date,
        tx.referenceNo,
        tx.branchName,
        tx.items[0]?.categoryName || 'General',
        tx.reason,
        tx.referenceDocNo || '—',
        tx.items.map((i) => `${i.productName} (${i.quantity})`).join('; '),
        tx.totalQuantity,
        tx.createdByName,
      ]);

      const totalQtyOut = filtered.reduce((sum, t) => sum + t.totalQuantity, 0);
      summaryStats = [
        { label: 'Total Stocked Out', value: `${totalQtyOut} units` },
        { label: 'Out Records', value: `${filtered.length} entries` },
      ];
      break;
    }

    case 'sales': {
      if (canViewProfit) {
        reportHeaders = ['Date', 'Invoice No', 'Branch', 'Customer', 'Category', 'Total Qty', 'Subtotal', 'Discount', 'Net Total', 'COGS', 'Gross Profit'];
      } else {
        // Manager privacy: Hide COGS and Gross Profit
        reportHeaders = ['Date', 'Invoice No', 'Branch', 'Customer', 'Category', 'Total Qty', 'Subtotal', 'Discount', 'Net Total', 'Payment Method', 'Sold By'];
      }

      const filtered = sales.filter(
        (s) =>
          isDateInRange(s.date) &&
          (effectiveBranchId === 'all' || s.branchId === effectiveBranchId) &&
          (selectedCategory === 'all' || s.items.some((i) => {
            const p = products.find((prod) => prod.id === i.productId);
            return p?.categoryName === selectedCategory;
          })) &&
          (filterProductId === 'all' || s.items.some((i) => i.productId === filterProductId))
      );

      reportRows = filtered.map((s) => {
        const sub = s.subtotal ?? s.totalSalesAmount;
        const disc = s.discountAmount ?? 0;
        if (canViewProfit) {
          return [
            s.date,
            s.invoiceNo,
            s.branchName,
            s.customerName,
            s.items[0]?.categoryName || 'Mixed',
            s.totalQuantitySold,
            formatCurrencyBDT(sub),
            formatCurrencyBDT(disc),
            formatCurrencyBDT(s.totalSalesAmount),
            formatCurrencyBDT(s.totalCostOfGoodsSold),
            formatCurrencyBDT(s.grossProfit),
          ];
        } else {
          return [
            s.date,
            s.invoiceNo,
            s.branchName,
            s.customerName,
            s.items[0]?.categoryName || 'Mixed',
            s.totalQuantitySold,
            formatCurrencyBDT(sub),
            formatCurrencyBDT(disc),
            formatCurrencyBDT(s.totalSalesAmount),
            s.paymentMethod.toUpperCase(),
            s.createdByName,
          ];
        }
      });

      const totalRevenue = filtered.reduce((sum, s) => sum + s.totalSalesAmount, 0);
      const totalUnits = filtered.reduce((sum, s) => sum + s.totalQuantitySold, 0);

      if (canViewProfit) {
        const totalProfit = filtered.reduce((sum, s) => sum + s.grossProfit, 0);
        summaryStats = [
          { label: 'Total Invoices', value: `${filtered.length}` },
          { label: 'Units Sold', value: `${totalUnits} pcs` },
          { label: 'Total Net Revenue', value: formatCurrencyBDT(totalRevenue) },
          { label: 'Total Gross Profit', value: formatCurrencyBDT(totalProfit) },
        ];
      } else {
        summaryStats = [
          { label: 'Total Invoices', value: `${filtered.length}` },
          { label: 'Units Sold', value: `${totalUnits} pcs` },
          { label: 'Total Net Revenue', value: formatCurrencyBDT(totalRevenue) },
        ];
      }
      break;
    }

    case 'product_sales': {
      if (canViewProfit) {
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Qty Sold', 'Avg Selling Price', 'Total Revenue', 'Total COGS', 'Gross Profit', 'Margin %'];
      } else {
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Qty Sold', 'Avg Selling Price', 'Total Revenue'];
      }

      const map = new Map<string, { qty: number; revenue: number; cost: number; name: string; sku: string; category: string }>();

      sales
        .filter((s) => isDateInRange(s.date) && (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
        .forEach((s) => {
          s.items.forEach((item) => {
            const p = products.find((prod) => prod.id === item.productId);
            if (selectedCategory !== 'all' && p?.categoryName !== selectedCategory) return;
            if (filterProductId !== 'all' && item.productId !== filterProductId) return;

            const existing = map.get(item.productId) || {
              qty: 0,
              revenue: 0,
              cost: 0,
              name: item.productName,
              sku: p?.sku || 'SKU',
              category: p?.categoryName || '—',
            };
            existing.qty += item.quantity;
            existing.revenue += item.totalSales;
            existing.cost += item.totalCost;
            map.set(item.productId, existing);
          });
        });

      reportRows = Array.from(map.values()).map((val) => {
        const profit = val.revenue - val.cost;
        const avgPrice = val.qty > 0 ? val.revenue / val.qty : 0;
        const marginPct = val.revenue > 0 ? ((profit / val.revenue) * 100).toFixed(1) : '0';

        if (canViewProfit) {
          return [
            val.name,
            val.sku,
            val.category,
            val.qty,
            formatCurrencyBDT(avgPrice),
            formatCurrencyBDT(val.revenue),
            formatCurrencyBDT(val.cost),
            formatCurrencyBDT(profit),
            `${marginPct}%`,
          ];
        } else {
          return [
            val.name,
            val.sku,
            val.category,
            val.qty,
            formatCurrencyBDT(avgPrice),
            formatCurrencyBDT(val.revenue),
          ];
        }
      });

      const totalSoldQty = Array.from(map.values()).reduce((sum, v) => sum + v.qty, 0);
      const totalRev = Array.from(map.values()).reduce((sum, v) => sum + v.revenue, 0);

      summaryStats = [
        { label: 'Products Traded', value: `${map.size} items` },
        { label: 'Total Volume Sold', value: `${totalSoldQty} pcs` },
        { label: 'Total Turnover', value: formatCurrencyBDT(totalRev) },
      ];
      break;
    }

    case 'branch_stock': {
      reportHeaders = ['Branch Name', 'Category', 'Total Products Count', 'Total Stock Qty', 'In Stock Items', 'Low Stock Items', 'Out of Stock Items'];
      
      const targetBranches = effectiveBranchId === 'all'
        ? branches
        : branches.filter((b) => b.id === effectiveBranchId);

      reportRows = targetBranches.map((br) => {
        const branchStocksForBranch = branchStocks
          .filter((s) => s.branchId === br.id)
          .filter((s) => {
            const p = products.find((prod) => prod.id === s.productId);
            if (!p) return false;
            if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
            if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
            return true;
          });

        let inStock = 0;
        let lowStock = 0;
        let outStock = 0;
        let totalQty = 0;

        branchStocksForBranch.forEach((s) => {
          totalQty += s.currentStock;
          const prod = products.find((p) => p.id === s.productId);
          const min = prod?.minAlertLevel || 5;
          const status = calculateStockAlertStatus(s.currentStock, min);
          if (status === 'out_of_stock') outStock++;
          else if (status === 'low_stock') lowStock++;
          else inStock++;
        });

        return [
          br.name,
          selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
          branchStocksForBranch.length,
          totalQty,
          inStock,
          lowStock,
          outStock,
        ];
      });

      const totalChainStock = reportRows.reduce((sum, r) => sum + Number(r[3]), 0);
      summaryStats = [
        { label: 'Branches In Report', value: `${reportRows.length}` },
        { label: 'Total Chain Inventory', value: `${totalChainStock} units` },
      ];
      break;
    }

    case 'low_stock': {
      reportHeaders = ['Product Name', 'SKU', 'Category', 'Branch', 'Current Stock', 'Min Alert Level', 'Deficit to Min', 'Supplier', 'Status'];
      const data = branchStocks
        .filter((s) => (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
        .filter((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          if (!p) return false;
          if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
          if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
          const status = calculateStockAlertStatus(s.currentStock, p.minAlertLevel);
          return status === 'low_stock';
        })
        .map((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          const b = branches.find((br) => br.id === s.branchId);
          const min = p?.minAlertLevel || 5;
          const deficit = Math.max(0, min - s.currentStock);
          return [
            p?.name || 'Product',
            p?.sku || 'SKU',
            p?.categoryName || '—',
            b?.name || 'Branch',
            s.currentStock,
            min,
            deficit,
            (p as any)?.supplierName || 'Primary Supplier',
            'LOW STOCK ALERT',
          ];
        });
      reportRows = data;

      summaryStats = [
        { label: 'Low Stock Products', value: `${reportRows.length} lines` },
        { label: 'Recommended Reorder', value: 'Review alerts' },
      ];
      break;
    }

    case 'out_of_stock': {
      reportHeaders = ['Product Name', 'SKU', 'Category', 'Branch', 'Current Stock', 'Min Level Required', 'Selling Price', 'Supplier', 'Status'];
      const data = branchStocks
        .filter((s) => (effectiveBranchId === 'all' || s.branchId === effectiveBranchId))
        .filter((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          if (!p) return false;
          if (selectedCategory !== 'all' && p.categoryName !== selectedCategory) return false;
          if (filterProductId !== 'all' && s.productId !== filterProductId) return false;
          return s.currentStock === 0;
        })
        .map((s) => {
          const p = products.find((prod) => prod.id === s.productId);
          const b = branches.find((br) => br.id === s.branchId);
          return [
            p?.name || 'Product',
            p?.sku || 'SKU',
            p?.categoryName || '—',
            b?.name || 'Branch',
            0,
            p?.minAlertLevel || 5,
            formatCurrencyBDT(p?.sellingPrice || 0),
            (p as any)?.supplierName || 'Primary Supplier',
            'OUT OF STOCK',
          ];
        });
      reportRows = data;

      summaryStats = [
        { label: 'Stock-Out Incidents', value: `${reportRows.length} items` },
        { label: 'Lost Sales Risk', value: reportRows.length > 0 ? 'Urgent Reorder' : 'Clean' },
      ];
      break;
    }

    case 'price_comparison': {
      if (canViewProfit) {
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Purchase Cost', 'Selling Price', 'Unit Profit', 'Gross Margin %', 'Supplier'];
      } else {
        reportHeaders = ['Product Name', 'SKU', 'Category', 'Selling Price', 'Unit', 'Min Stock Level', 'Status'];
      }

      const filtered = categoryFilteredProducts.filter(
        (p) => filterProductId === 'all' || p.id === filterProductId
      );

      reportRows = filtered.map((p) => {
        const profit = p.sellingPrice - p.purchasePrice;
        const margin = p.sellingPrice > 0 ? ((profit / p.sellingPrice) * 100).toFixed(1) : '0';

        if (canViewProfit) {
          return [
            p.name,
            p.sku,
            p.categoryName,
            formatCurrencyBDT(p.purchasePrice),
            formatCurrencyBDT(p.sellingPrice),
            formatCurrencyBDT(profit),
            `${margin}%`,
            (p as any)?.supplierName || '—',
          ];
        } else {
          return [
            p.name,
            p.sku,
            p.categoryName,
            formatCurrencyBDT(p.sellingPrice),
            p.unitOfMeasure || 'pcs',
            p.minAlertLevel,
            p.status.toUpperCase(),
          ];
        }
      });

      if (canViewProfit) {
        const avgMargin =
          filtered.length > 0
            ? (
                filtered.reduce((sum, p) => sum + (p.sellingPrice > 0 ? ((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100 : 0), 0) /
                filtered.length
              ).toFixed(1)
            : '0';

        summaryStats = [
          { label: 'Active Catalog Items', value: `${filtered.length} products` },
          { label: 'Average Catalog Margin', value: `${avgMargin}%` },
        ];
      } else {
        summaryStats = [
          { label: 'Active Catalog Items', value: `${filtered.length} products` },
        ];
      }
      break;
    }

    case 'gross_profit': {
      // Super Admin and Admin only (never shown to Manager)
      reportHeaders = ['Invoice Date', 'Invoice No', 'Branch', 'Category', 'Customer', 'Revenue', 'Cost of Goods Sold (COGS)', 'Gross Profit', 'Margin %'];

      const filtered = sales.filter(
        (s) =>
          isDateInRange(s.date) &&
          (effectiveBranchId === 'all' || s.branchId === effectiveBranchId) &&
          (selectedCategory === 'all' || s.items.some((i) => {
            const p = products.find((prod) => prod.id === i.productId);
            return p?.categoryName === selectedCategory;
          })) &&
          (filterProductId === 'all' || s.items.some((i) => i.productId === filterProductId))
      );

      reportRows = filtered.map((s) => {
        const margin = s.totalSalesAmount > 0 ? ((s.grossProfit / s.totalSalesAmount) * 100).toFixed(1) : '0';
        return [
          s.date,
          s.invoiceNo,
          s.branchName,
          s.items[0]?.categoryName || 'Mixed',
          s.customerName,
          formatCurrencyBDT(s.totalSalesAmount),
          formatCurrencyBDT(s.totalCostOfGoodsSold),
          formatCurrencyBDT(s.grossProfit),
          `${margin}%`,
        ];
      });

      const totalRev = filtered.reduce((sum, s) => sum + s.totalSalesAmount, 0);
      const totalCOGS = filtered.reduce((sum, s) => sum + s.totalCostOfGoodsSold, 0);
      const totalGrossProfit = totalRev - totalCOGS;
      const overallMargin = totalRev > 0 ? ((totalGrossProfit / totalRev) * 100).toFixed(1) : '0';

      summaryStats = [
        { label: 'Total Revenue', value: formatCurrencyBDT(totalRev) },
        { label: 'Total COGS', value: formatCurrencyBDT(totalCOGS) },
        { label: 'Total Gross Profit', value: formatCurrencyBDT(totalGrossProfit) },
        { label: 'Gross Margin %', value: `${overallMargin}%` },
      ];
      break;
    }

    case 'transfers': {
      reportHeaders = ['Transfer No', 'Date', 'From Branch', 'To Branch', 'Category', 'Product', 'Quantity', 'Unit Cost', 'Status', 'Dispatched By', 'Received By'];

      const filtered = transfers.filter((t) => {
        if (!isDateInRange(t.date)) return false;
        if (effectiveBranchId !== 'all') {
          if (t.sourceBranchId !== effectiveBranchId && t.destinationBranchId !== effectiveBranchId) return false;
        }
        if (selectedCategory !== 'all' && t.categoryName !== selectedCategory) return false;
        if (filterProductId !== 'all' && t.productId !== filterProductId) return false;
        return true;
      });

      reportRows = filtered.map((t) => [
        t.transferNo,
        t.date,
        t.sourceBranchName,
        t.destinationBranchName,
        t.categoryName,
        `${t.productName} (${t.sku})`,
        t.quantity,
        canViewProfit ? formatCurrencyBDT(t.unitPurchaseCost) : '—',
        t.status.toUpperCase(),
        t.dispatchedBy || '—',
        t.receivedBy || '—',
      ]);

      const totalQty = filtered.reduce((sum, t) => sum + t.quantity, 0);
      const completedCount = filtered.filter((t) => t.status === 'Received').length;

      summaryStats = [
        { label: 'Total Transfers', value: `${filtered.length} orders` },
        { label: 'Units Moved', value: `${totalQty} units` },
        { label: 'Completed Deliveries', value: `${completedCount} received` },
      ];
      break;
    }

    case 'cash_expenses': {
      reportHeaders = ['Date', 'Branch', 'Category', 'Description', 'Payment Source', 'Amount', 'Recorded By', 'Status'];

      const filtered = expenses.filter((e) => {
        if (!isDateInRange(e.date)) return false;
        if (effectiveBranchId !== 'all' && e.branchId !== effectiveBranchId) return false;
        return true;
      });

      reportRows = filtered.map((e) => [
        e.date,
        e.branchName,
        e.category.toUpperCase(),
        e.description,
        e.paymentSource === 'Physical Cash' ? 'Physical Cash in Till' : 'Bank Account',
        formatCurrencyBDT(e.amount),
        e.recordedByName,
        'Authorized',
      ]);

      const totalExp = filtered.reduce((sum, e) => sum + e.amount, 0);
      const cashExp = filtered.filter((e) => e.paymentSource === 'Physical Cash').reduce((sum, e) => sum + e.amount, 0);
      const bankExp = filtered.filter((e) => e.paymentSource === 'Bank Account').reduce((sum, e) => sum + e.amount, 0);

      summaryStats = [
        { label: 'Total Operating Expenses', value: formatCurrencyBDT(totalExp) },
        { label: 'Till Cash Spent', value: formatCurrencyBDT(cashExp) },
        { label: 'Bank Transfers Spent', value: formatCurrencyBDT(bankExp) },
      ];
      break;
    }
  }

  // Handle Export to Excel
  const handleExportExcel = () => {
    const reportItem = allReports.find((r) => r.id === activeReport);
    exportReportToExcel({
      reportTitle: reportItem?.name || 'Best Heritage Business Report',
      branchName: branchNameDisplay,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      dateRange: `${startDate} to ${endDate}`,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ').toUpperCase()})`,
      headers: reportHeaders,
      dataRows: reportRows,
      summaryStats: summaryStats,
      fileName: `BestHeritage_${activeReport}_${new Date().toISOString().slice(0, 10)}`,
    });
  };

  // Handle Export to PDF
  const handleExportPDF = () => {
    const reportItem = allReports.find((r) => r.id === activeReport);
    exportReportToPdf({
      reportTitle: reportItem?.name || 'Best Heritage Business Report',
      branchName: branchNameDisplay,
      categoryFilter: selectedCategory === 'all' ? 'All 3 Categories' : selectedCategory,
      dateRange: `${startDate} to ${endDate}`,
      generatedBy: `${currentUser.name} (${currentUser.role.replace('_', ' ').toUpperCase()})`,
      headers: reportHeaders,
      dataRows: reportRows,
      summaryStats: summaryStats,
      fileName: `BestHeritage_${activeReport}_${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `Best Heritage - ${allReports.find((r) => r.id === activeReport)?.name}`,
        `Branch: ${branchNameDisplay} | Category: ${selectedCategory} | Range: ${startDate} to ${endDate}`,
        `Generated By: ${currentUser.name} | Date: ${new Date().toLocaleDateString()}`,
        '',
        reportHeaders.map((h) => `"${h}"`).join(','),
        ...reportRows.map((row) =>
          row
            .map((cell) => {
              const val = String(cell).replace(/"/g, '""');
              return `"${val}"`;
            })
            .join(',')
        ),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `BestHeritage_Report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Reports & Audits</h1>
            <span className="text-xs bg-slate-100 text-slate-800 font-semibold px-2 py-0.5 rounded border border-slate-300">
              Best Heritage Management
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Generate and export stock movement, sales, branch transfers, cash reconciliation, and financial analytics.
          </p>
          {!canViewProfit && (
            <div className="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Manager Mode: Sensitive purchase cost and profit figures are privacy-protected.</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Excel, PDF, and CSV */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="Download formatted Excel workbook (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
            title="Download print-ready PDF document (.pdf)"
          >
            <FileText className="w-4 h-4" />
            <span>Export to PDF (.pdf)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-colors"
            title="Download CSV spreadsheet (.csv)"
          >
            <Download className="w-3.5 h-3.5 text-slate-300" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">
          Product Category Scope:
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            All 3 Categories
          </button>
          <button
            onClick={() => setSelectedCategory('Cosmetic Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Cosmetic Products'
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100'
            }`}
          >
            Cosmetic Products
          </button>
          <button
            onClick={() => setSelectedCategory('Food Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Food Products'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            Food Products
          </button>
          <button
            onClick={() => setSelectedCategory('Perfume Products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedCategory === 'Perfume Products'
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
            }`}
          >
            Perfume Products
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4">
        <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block mb-2.5">
          Select Report Type:
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {reportList.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`p-2.5 rounded-lg text-left text-xs font-medium transition-all border ${
                activeReport === r.id
                  ? 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">From Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">To Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Branch Filter</label>
          {isBranchLocked ? (
            <div className="px-2.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg font-semibold text-slate-700 truncate">
              {currentUser.branchName}
            </div>
          ) : (
            <select
              value={filterBranchId}
              onChange={(e) => setFilterBranchId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
            >
              <option value="all">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Filter</label>
          <select
            value={filterProductId}
            onChange={(e) => setFilterProductId(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
          >
            <option value="all">All Products</option>
            {categoryFilteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary KPI Cards */}
      {summaryStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryStats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs">
              <p className="text-[11px] text-slate-500 font-medium">{stat.label}</p>
              <p className="text-base font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Generated Report Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {allReports.find((r) => r.id === activeReport)?.name} ({reportRows.length} records)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {startDate} ~ {endDate} | {branchNameDisplay} | {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                {reportHeaders.map((head, idx) => (
                  <th key={idx} className="py-2.5 px-4 whitespace-nowrap">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}

              {reportRows.length === 0 && (
                <tr>
                  <td colSpan={reportHeaders.length || 1} className="py-12 text-center text-slate-400 text-xs">
                    No data records found for this report configuration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
