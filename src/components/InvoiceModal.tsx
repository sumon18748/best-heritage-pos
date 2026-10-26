import React from 'react';
import { SaleTransaction } from '../types';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrencyBDT } from '../utils/stockCalculations';

interface InvoiceModalProps {
  sale: SaleTransaction;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[95vh] overflow-y-auto text-slate-800">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle className="w-5 h-5" />
            </span>
            <span className="text-sm font-bold text-slate-900">
              {sale.status === 'completed' ? 'Sale Completed Successfully' : 'Cancelled Sale Record'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="mt-4 p-4 border border-slate-200 rounded-xl bg-white print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <img
                  src="/logo.jpg"
                  alt="Best Heritage Foods"
                  className="w-10 h-10 rounded-lg object-contain bg-slate-900 p-0.5 border border-slate-700 shadow-xs"
                />
                <div>
                  <h2 className="text-xl font-bold font-serif tracking-tight text-slate-900">
                    BEST HERITAGE
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">Best Heritage Group • Retail & POS</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Branch: <span className="font-semibold text-slate-800">{sale.branchName}</span>
              </p>
              <p className="text-[11px] text-slate-400">Multi-Branch Stock & Sales System</p>
            </div>

            <div className="text-right">
              <div className="text-xs uppercase font-bold text-slate-400 tracking-wider">SALES INVOICE</div>
              <div className="text-base font-bold font-mono text-slate-900">{sale.invoiceNo}</div>
              <div className="text-xs text-slate-500 mt-1">Date: {sale.date}</div>
              <div className="text-xs text-slate-500">Method: <strong className="text-slate-800">{sale.paymentMethod}</strong></div>
              {sale.status === 'cancelled' && (
                <div className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                  VOID / CANCELLED
                </div>
              )}
            </div>
          </div>

          {/* Customer & Staff Info */}
          <div className="grid grid-cols-2 gap-4 py-3 border-b border-slate-100 text-xs">
            <div>
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Bill To:</p>
              <p className="font-bold text-slate-800">{sale.customerName}</p>
              {sale.customerPhone && <p className="text-slate-500 font-mono">{sale.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 uppercase font-semibold">Served By:</p>
              <p className="font-semibold text-slate-800">{sale.createdByName}</p>
              <p className="text-slate-500 text-[11px]">{sale.createdAt}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-4">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-300 bg-slate-50 text-slate-700 font-semibold">
                <tr>
                  <th className="py-2 px-3">SL</th>
                  <th className="py-2 px-3">Product Description & SKU</th>
                  <th className="py-2 px-3 text-center">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Price</th>
                  <th className="py-2 px-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
                        <span>{it.productName}</span>
                        {it.isDecant && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            🧴 {it.decantVariantName || `${it.decantMlAmount} ml`}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{it.sku}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium">{it.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-slate-700">
                      {formatCurrencyBDT(it.sellingPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrencyBDT(it.totalSales)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items:</span>
                <span className="font-semibold text-slate-800">{sale.items.length} ({sale.totalQuantitySold} units)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">
                  {formatCurrencyBDT(sale.subtotal ?? sale.totalSalesAmount)}
                </span>
              </div>
              {sale.discountAmount && sale.discountAmount > 0 ? (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>
                    Discount {sale.discountType === 'percentage' ? `(${sale.discountValue}%)` : '(Cash)'}:
                  </span>
                  <span>- {formatCurrencyBDT(sale.discountAmount)}</span>
                </div>
              ) : null}
              <div className="h-px bg-slate-200 my-1"></div>
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Net Payable:</span>
                <span className="text-emerald-700">{formatCurrencyBDT(sale.totalSalesAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Payment Received:</span>
                <span>{sale.paymentMethod}</span>
              </div>
            </div>
          </div>

          {sale.notes && (
            <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600">
              <span className="font-semibold">Notes:</span> {sale.notes}
            </div>
          )}

          {sale.status === 'cancelled' && sale.cancellationReason && (
            <div className="mt-3 p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-800">
              <span className="font-bold">Cancellation Reason:</span> {sale.cancellationReason} (by {sale.cancelledByName} at {sale.cancelledAt})
            </div>
          )}

          {/* Footer & Signature Line */}
          <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
            <div className="text-center w-36">
              <div className="border-t border-slate-400 pt-1 text-[11px] font-medium">Customer Signature</div>
            </div>
            <div className="text-center text-[10px] text-slate-400">
              <p className="font-semibold text-slate-600">Thank you for shopping with Best Heritage!</p>
              <p>Quality, Heritage & Trust • Dhaka, Bangladesh</p>
            </div>
            <div className="text-center w-36">
              <div className="border-t border-slate-400 pt-1 text-[11px] font-medium">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
