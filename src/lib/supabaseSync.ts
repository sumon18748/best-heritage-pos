import { supabase } from './supabase';
import {
  Branch,
  User,
  Category,
  Product,
  BranchProductStock,
  StockInTransaction,
  StockOutTransaction,
  SaleTransaction,
  BranchTransfer,
  OperatingExpense,
  ExpenseCategoryItem,
  BranchOpeningBalance,
  StockMovement,
  MainCategoryName,
} from '../types';

// ====================================================================
// Fetch All Collections from Supabase
// ====================================================================

export async function fetchAllCollections() {
  try {
    const [
      branchesRes,
      usersRes,
      categoriesRes,
      productsRes,
      stocksRes,
      stockInsRes,
      stockOutsRes,
      salesRes,
      transfersRes,
      expensesRes,
      expCategoriesRes,
      openingBalancesRes,
      movementsRes,
    ] = await Promise.all([
      supabase.from('branches').select('*'),
      supabase.from('users').select('*'),
      supabase.from('categories').select('*'),
      supabase.from('products').select('*'),
      supabase.from('branch_stocks').select('*'),
      supabase.from('stock_ins').select('*'),
      supabase.from('stock_outs').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('branch_transfers').select('*'),
      supabase.from('operating_expenses').select('*'),
      supabase.from('expense_categories').select('*'),
      supabase.from('branch_opening_balances').select('*'),
      supabase.from('stock_movements').select('*'),
    ]);

    const branches: Branch[] | null = branchesRes.data
      ? branchesRes.data.map((b: any) => ({
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address || '',
          contactNumber: b.contact_number || '',
          isActive: b.is_active ?? true,
          createdAt: b.created_at || new Date().toISOString(),
        }))
      : null;

    const rawUsers = usersRes.data || [];
    const configRow = rawUsers.find((u: any) => u.id === 'config_role_permissions');
    const rolePermissions = configRow?.permissions || null;

    const users: User[] | null = usersRes.data
      ? rawUsers
          .filter((u: any) => u.id !== 'config_role_permissions')
          .map((u: any) => ({
            id: u.id,
            username: u.username,
            name: u.name,
            email: u.email,
            role: u.role,
            branchId: u.branch_id || undefined,
            branchName: u.branch_name || undefined,
            phone: u.phone || '',
            password: u.password || '123456',
            status: u.status || 'active',
            permissions: u.permissions || undefined,
            createdAt: u.created_at || new Date().toISOString(),
          }))
      : null;

    const categories: Category[] | null = categoriesRes.data
      ? categoriesRes.data.map((c: any) => ({
          id: c.id,
          name: c.name as MainCategoryName,
          description: c.description || '',
          iconName: c.icon_name || undefined,
        }))
      : null;

    const products: Product[] | null = productsRes.data
      ? productsRes.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || undefined,
          categoryId: p.category_id,
          categoryName: p.category_name as MainCategoryName,
          subcategory: p.subcategory || undefined,
          purchasePrice: Number(p.purchase_price) || 0,
          sellingPrice: Number(p.selling_price) || 0,
          openingStock: Number(p.opening_stock) || 0,
          minAlertLevel: Number(p.min_alert_level) || 5,
          unitOfMeasure: p.unit_of_measure || 'pcs',
          status: (p.status || 'active') as 'active' | 'inactive',
          packageSize: p.package_size ? Number(p.package_size) : undefined,
          packageUnit: p.package_unit || undefined,
          bottleCapacityMl: p.bottle_capacity_ml ? Number(p.bottle_capacity_ml) : undefined,
          decantConfig: p.decant_config || undefined,
          createdAt: p.created_at || new Date().toISOString(),
        }))
      : null;

    const branchStocks: BranchProductStock[] | null = stocksRes.data
      ? stocksRes.data.map((s: any) => ({
          id: s.id,
          branchId: s.branch_id,
          productId: s.product_id,
          openingStock: Number(s.opening_stock) || 0,
          stockIn: Number(s.stock_in) || 0,
          salesReturn: Number(s.sales_return) || 0,
          stockOut: Number(s.stock_out) || 0,
          quantitySold: Number(s.quantity_sold) || 0,
          purchaseReturn: Number(s.purchase_return) || 0,
          currentStock: Number(s.current_stock) || 0,
          openBottleMlRemaining: Number(s.open_bottle_ml_remaining) || 0,
          minAlertLevel: Number(s.min_alert_level) || 5,
          lastUpdated: s.updated_at || new Date().toLocaleString(),
        }))
      : null;

    const stockIns: StockInTransaction[] | null = stockInsRes.data
      ? stockInsRes.data.map((si: any) => ({
          id: si.id,
          referenceNo: si.reference_no,
          date: si.date,
          branchId: si.branch_id,
          branchName: si.branch_name || '',
          supplierName: si.supplier_name || undefined,
          supplierInvoiceNo: si.supplier_invoice_no || undefined,
          remarks: si.remarks || undefined,
          totalQuantity: Number(si.total_quantity) || 0,
          totalPurchaseCost: Number(si.total_purchase_cost) || 0,
          createdByUserId: si.created_by_user_id || '',
          createdByName: si.created_by_name || '',
          items: si.items || [],
          createdAt: si.created_at || new Date().toISOString(),
        }))
      : null;

    const stockOuts: StockOutTransaction[] | null = stockOutsRes.data
      ? stockOutsRes.data.map((so: any) => ({
          id: so.id,
          referenceNo: so.reference_no,
          date: so.date,
          branchId: so.branch_id,
          branchName: so.branch_name || '',
          reason: so.reason,
          referenceDocNo: so.reference_doc_no || undefined,
          remarks: so.remarks || undefined,
          totalQuantity: Number(so.total_quantity) || 0,
          createdByUserId: so.created_by_user_id || '',
          createdByName: so.created_by_name || '',
          items: so.items || [],
          createdAt: so.created_at || new Date().toISOString(),
        }))
      : null;

    const sales: SaleTransaction[] | null = salesRes.data
      ? salesRes.data.map((s: any) => ({
          id: s.id,
          invoiceNo: s.invoice_no,
          date: s.date,
          branchId: s.branch_id,
          branchName: s.branch_name || '',
          customerName: s.customer_name || 'Walk-in Customer',
          customerPhone: s.customer_phone || undefined,
          paymentMethod: s.payment_method,
          notes: s.notes || undefined,
          totalQuantitySold: Number(s.total_quantity_sold) || 0,
          subtotal: Number(s.subtotal) || 0,
          discountType: s.discount_type || undefined,
          discountValue: s.discount_value ? Number(s.discount_value) : undefined,
          discountAmount: Number(s.discount_amount) || 0,
          totalCostOfGoodsSold: Number(s.total_cost_of_goods_sold) || 0,
          totalSalesAmount: Number(s.total_sales_amount) || 0,
          grossProfit: Number(s.gross_profit) || 0,
          createdByUserId: s.created_by_user_id || '',
          createdByName: s.created_by_name || '',
          status: s.status || 'completed',
          items: s.items || [],
          cancellationReason: s.cancellation_reason || undefined,
          cancelledAt: s.cancelled_at || undefined,
          cancelledByName: s.cancelled_by_name || undefined,
          createdAt: s.created_at || new Date().toISOString(),
        }))
      : null;

    const transfers: BranchTransfer[] | null = transfersRes.data
      ? transfersRes.data.map((t: any) => ({
          id: t.id,
          transferNo: t.transfer_no,
          date: t.date,
          sourceBranchId: t.source_branch_id,
          sourceBranchName: t.source_branch_name || '',
          destinationBranchId: t.destination_branch_id,
          destinationBranchName: t.destination_branch_name || '',
          productId: t.product_id,
          productName: t.product_name || '',
          sku: t.product_sku || '',
          categoryName: 'Perfume Products' as MainCategoryName,
          quantity: Number(t.quantity) || 0,
          unitPurchaseCost: Number(t.unit_purchase_cost) || 0,
          totalTransferCost: Number(t.total_transfer_cost) || 0,
          status: t.status,
          notes: t.notes || undefined,
          dispatchedBy: t.dispatched_by || undefined,
          dispatchedAt: t.dispatched_at || undefined,
          receivedBy: t.received_by || undefined,
          receivedAt: t.received_at || undefined,
          cancelledBy: t.cancelled_by || undefined,
          cancelledAt: t.cancelled_at || undefined,
          cancellationReason: t.cancellation_reason || undefined,
          createdAt: t.created_at || new Date().toISOString(),
        }))
      : null;

    const expenses: OperatingExpense[] | null = expensesRes.data
      ? expensesRes.data.map((e: any) => ({
          id: e.id,
          voucherNo: e.voucher_no,
          date: e.date,
          branchId: e.branch_id,
          branchName: e.branch_name || '',
          category: e.category,
          amount: Number(e.amount) || 0,
          paymentSource: e.payment_source,
          description: e.description || '',
          vendorName: e.vendor_name || undefined,
          recordedByUserId: e.recorded_by_user_id || '',
          recordedByName: e.recorded_by_name || '',
          createdAt: e.created_at || new Date().toISOString(),
        }))
      : null;

    const expenseCategories: ExpenseCategoryItem[] | null = expCategoriesRes.data
      ? expCategoriesRes.data.map((ec: any) => ({
          id: ec.id,
          name: ec.name,
          description: ec.description || '',
          isDefault: ec.is_default ?? false,
          createdAt: new Date().toISOString(),
        }))
      : null;

    const openingBalances: BranchOpeningBalance[] | null = openingBalancesRes.data
      ? openingBalancesRes.data.map((ob: any) => ({
          id: ob.id,
          branchId: ob.branch_id,
          branchName: ob.branch_name || '',
          date: ob.set_date || new Date().toISOString().split('T')[0],
          openingCashAmount: Number(ob.cash_in_hand) || 0,
          openingBankAmount: Number(ob.bank_balance) || 0,
          setByUserId: ob.set_by_user_id || '',
          setByName: ob.set_by_name || '',
          createdAt: ob.created_at || new Date().toISOString(),
        }))
      : null;

    const movements: StockMovement[] | null = movementsRes.data
      ? movementsRes.data.map((m: any) => ({
          id: m.id,
          timestamp: m.timestamp,
          date: m.date,
          branchId: m.branch_id,
          branchName: m.branch_name || '',
          productId: m.product_id,
          productName: m.product_name || '',
          sku: m.sku,
          type: m.type,
          quantityChange: Number(m.quantity_change) || 0,
          balanceAfter: Number(m.balance_after) || 0,
          referenceNo: m.reference_no,
          notes: m.notes || undefined,
          userId: m.user_id,
          userName: m.user_name,
        }))
      : null;

    return {
      branches,
      users,
      categories,
      products,
      branchStocks,
      stockIns,
      stockOuts,
      sales,
      transfers,
      expenses,
      expenseCategories,
      openingBalances,
      movements,
      rolePermissions,
    };
  } catch (error) {
    console.error('Failed to fetch from Supabase:', error);
    return null;
  }
}

// ====================================================================
// Background Upsert & Delete Sync Helpers
// ====================================================================

export async function syncProductUpsert(p: Product) {
  try {
    const { error } = await supabase.from('products').upsert({
      id: p.id,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || null,
      category_id: p.categoryId,
      category_name: p.categoryName,
      subcategory: p.subcategory || null,
      purchase_price: p.purchasePrice || 0,
      selling_price: p.sellingPrice || 0,
      opening_stock: p.openingStock || 0,
      min_alert_level: p.minAlertLevel || 5,
      unit_of_measure: p.unitOfMeasure || 'pcs',
      package_size: p.packageSize || null,
      package_unit: p.packageUnit || null,
      bottle_capacity_ml: p.bottleCapacityMl || null,
      is_decant_allowed: p.decantConfig?.isDecantAllowed ?? false,
      decant_variants: p.decantConfig?.decantVariants || null,
      decant_config: p.decantConfig || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncProductUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync product failed:', err);
  }
}

export async function syncProductDelete(id: string) {
  try {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) console.error('Supabase syncProductDelete error:', error);
  } catch (err) {
    console.warn('Sync product delete failed:', err);
  }
}

export async function syncBranchStockUpsert(s: BranchProductStock) {
  try {
    const { error } = await supabase.from('branch_stocks').upsert({
      id: s.id,
      branch_id: s.branchId,
      product_id: s.productId,
      opening_stock: s.openingStock || 0,
      stock_in: s.stockIn || 0,
      sales_return: s.salesReturn || 0,
      stock_out: s.stockOut || 0,
      quantity_sold: s.quantitySold || 0,
      purchase_return: s.purchaseReturn || 0,
      current_stock: s.currentStock || 0,
      open_bottle_ml_remaining: s.openBottleMlRemaining || 0,
      min_alert_level: s.minAlertLevel || 5,
    }, { onConflict: 'branch_id,product_id' });

    if (error) {
      console.error('Supabase syncBranchStockUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync branch stock failed:', err);
  }
}

export async function syncStockInUpsert(si: StockInTransaction) {
  try {
    const { error } = await supabase.from('stock_ins').upsert({
      id: si.id,
      reference_no: si.referenceNo,
      date: si.date,
      branch_id: si.branchId,
      branch_name: si.branchName,
      supplier_name: si.supplierName || null,
      supplier_invoice_no: si.supplierInvoiceNo || null,
      remarks: si.remarks || null,
      total_quantity: si.totalQuantity || 0,
      total_purchase_cost: si.totalPurchaseCost || 0,
      created_by_user_id: si.createdByUserId || null,
      created_by_name: si.createdByName || null,
      items: si.items || [],
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncStockInUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync stock in failed:', err);
  }
}

export async function syncStockOutUpsert(so: StockOutTransaction) {
  try {
    const { error } = await supabase.from('stock_outs').upsert({
      id: so.id,
      reference_no: so.referenceNo,
      date: so.date,
      branch_id: so.branchId,
      branch_name: so.branchName,
      reason: so.reason,
      reference_doc_no: so.referenceDocNo || null,
      remarks: so.remarks || null,
      total_quantity: so.totalQuantity || 0,
      created_by_user_id: so.createdByUserId || null,
      created_by_name: so.createdByName || null,
      items: so.items || [],
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncStockOutUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync stock out failed:', err);
  }
}

export async function syncSaleUpsert(s: SaleTransaction) {
  try {
    const { error } = await supabase.from('sales').upsert({
      id: s.id,
      invoice_no: s.invoiceNo,
      date: s.date,
      branch_id: s.branchId,
      branch_name: s.branchName,
      customer_name: s.customerName || 'Walk-in Customer',
      customer_phone: s.customerPhone || null,
      payment_method: s.paymentMethod,
      notes: s.notes || null,
      total_quantity_sold: s.totalQuantitySold || 0,
      subtotal: s.subtotal || 0,
      discount_type: s.discountType || null,
      discount_value: s.discountValue || 0,
      discount_amount: s.discountAmount || 0,
      total_cost_of_goods_sold: s.totalCostOfGoodsSold || 0,
      total_sales_amount: s.totalSalesAmount || 0,
      gross_profit: s.grossProfit || 0,
      created_by_user_id: s.createdByUserId || null,
      created_by_name: s.createdByName || null,
      status: s.status || 'completed',
      items: s.items || [],
      cancellation_reason: s.cancellationReason || null,
      cancelled_at: s.cancelledAt || null,
      cancelled_by_name: s.cancelledByName || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncSaleUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync sale failed:', err);
  }
}

export async function syncTransferUpsert(t: BranchTransfer) {
  try {
    const { error } = await supabase.from('branch_transfers').upsert({
      id: t.id,
      transfer_no: t.transferNo,
      date: t.date,
      source_branch_id: t.sourceBranchId,
      source_branch_name: t.sourceBranchName,
      destination_branch_id: t.destinationBranchId,
      destination_branch_name: t.destinationBranchName,
      product_id: t.productId,
      product_name: t.productName,
      product_sku: t.sku,
      quantity: t.quantity || 0,
      unit_purchase_cost: t.unitPurchaseCost || 0,
      total_transfer_cost: t.totalTransferCost || 0,
      status: t.status,
      notes: t.notes || null,
      dispatched_by: t.dispatchedBy || null,
      dispatched_at: t.dispatchedAt || null,
      received_by: t.receivedBy || null,
      received_at: t.receivedAt || null,
      cancelled_by: t.cancelledBy || null,
      cancelled_at: t.cancelledAt || null,
      cancellation_reason: t.cancellationReason || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncTransferUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync transfer failed:', err);
  }
}

export async function syncExpenseUpsert(e: OperatingExpense) {
  try {
    const { error } = await supabase.from('operating_expenses').upsert({
      id: e.id,
      voucher_no: e.voucherNo,
      date: e.date,
      branch_id: e.branchId,
      branch_name: e.branchName,
      category: e.category,
      amount: e.amount || 0,
      payment_source: e.paymentSource,
      description: e.description || '',
      vendor_name: e.vendorName || null,
      recorded_by_user_id: e.recordedByUserId || null,
      recorded_by_name: e.recordedByName || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncExpenseUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync expense failed:', err);
  }
}

export async function syncExpenseDelete(id: string) {
  try {
    const { error } = await supabase.from('operating_expenses').delete().eq('id', id);
    if (error) console.error('Supabase syncExpenseDelete error:', error);
  } catch (err) {
    console.warn('Sync expense delete failed:', err);
  }
}

export async function syncExpenseCategoryUpsert(ec: ExpenseCategoryItem) {
  try {
    const { error } = await supabase.from('expense_categories').upsert({
      id: ec.id,
      name: ec.name,
      description: ec.description || null,
      is_default: ec.isDefault ?? false,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncExpenseCategoryUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync expense category failed:', err);
  }
}

export async function syncExpenseCategoryDelete(id: string) {
  try {
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) console.error('Supabase syncExpenseCategoryDelete error:', error);
  } catch (err) {
    console.warn('Sync expense category delete failed:', err);
  }
}

export async function syncBranchUpsert(b: Branch) {
  try {
    const { error } = await supabase.from('branches').upsert({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address || null,
      contact_number: b.contactNumber || null,
      is_active: b.isActive ?? true,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncBranchUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync branch failed:', err);
  }
}

export async function syncBranchDelete(id: string) {
  try {
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) console.error('Supabase syncBranchDelete error:', error);
  } catch (err) {
    console.warn('Sync branch delete failed:', err);
  }
}

export async function syncUserUpsert(u: User) {
  try {
    const { error } = await supabase.from('users').upsert({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      branch_id: u.branchId || null,
      branch_name: u.branchName || null,
      phone: u.phone || null,
      password: u.password || '123456',
      status: u.status || 'active',
      permissions: u.permissions || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncUserUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync user failed:', err);
  }
}

export async function syncRolePermissionsUpsert(rolePermissions: Record<string, any>) {
  try {
    const { error } = await supabase.from('users').upsert({
      id: 'config_role_permissions',
      username: 'CONFIG_ROLES',
      name: 'Role Permissions Config',
      email: 'roles_config@system.local',
      role: 'super_admin',
      permissions: rolePermissions,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncRolePermissionsUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync role permissions failed:', err);
  }
}

export async function syncUserDelete(id: string) {
  try {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error('Supabase syncUserDelete error:', error);
  } catch (err) {
    console.warn('Sync user delete failed:', err);
  }
}

export async function syncOpeningBalanceUpsert(ob: BranchOpeningBalance) {
  try {
    const { error } = await supabase.from('branch_opening_balances').upsert({
      id: ob.id,
      branch_id: ob.branchId,
      branch_name: ob.branchName,
      set_date: ob.date,
      cash_in_hand: ob.openingCashAmount || 0,
      bank_balance: ob.openingBankAmount || 0,
      set_by_user_id: ob.setByUserId || null,
      set_by_name: ob.setByName || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncOpeningBalanceUpsert error:', error);
    }
  } catch (err) {
    console.warn('Sync opening balance failed:', err);
  }
}

export async function syncMovementInsert(m: StockMovement) {
  try {
    const { error } = await supabase.from('stock_movements').upsert({
      id: m.id,
      timestamp: m.timestamp,
      date: m.date,
      branch_id: m.branchId,
      branch_name: m.branchName,
      product_id: m.productId,
      product_name: m.productName,
      sku: m.sku,
      type: m.type,
      quantity_change: m.quantityChange || 0,
      balance_after: m.balanceAfter || 0,
      reference_no: m.referenceNo,
      notes: m.notes || null,
      user_id: m.userId || null,
      user_name: m.userName || null,
    }, { onConflict: 'id' });

    if (error) {
      console.error('Supabase syncMovementInsert error:', error);
    }
  } catch (err) {
    console.warn('Sync movement failed:', err);
  }
}
