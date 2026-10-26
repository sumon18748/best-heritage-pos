import React from 'react';
import { AlertTriangle, ShieldAlert, Archive, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  itemType: 'Product' | 'Branch' | 'User';
  canDelete: boolean;
  blockReason?: string;
  hasHistory?: boolean;
  isSuperAdmin?: boolean;
  onConfirmDelete: () => void;
  onConfirmForceDelete?: () => void;
  onConfirmArchive?: () => void;
  onClose: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title,
  itemName,
  itemType,
  canDelete,
  blockReason,
  hasHistory,
  isSuperAdmin,
  onConfirmDelete,
  onConfirmForceDelete,
  onConfirmArchive,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className={`p-4 flex items-center justify-between border-b ${canDelete || isSuperAdmin ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
          <div className="flex items-center space-x-2.5">
            {canDelete || isSuperAdmin ? (
              <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <ShieldAlert className="w-5 h-5" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {isSuperAdmin && (
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Target: <span className="font-semibold text-slate-800">{itemName}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {!canDelete && !isSuperAdmin ? (
            <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3.5 space-y-2">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed font-medium">
                  {blockReason || `This ${itemType.toLowerCase()} is associated with operational records and cannot be permanently deleted.`}
                </div>
              </div>
              <p className="text-[11px] text-amber-800/90 pl-6">
                Permanent deletion is restricted to protect audit logs, invoice histories, and stock calculations. You can safely deactivate it instead.
              </p>
            </div>
          ) : !canDelete && isSuperAdmin ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5">
                <div className="flex items-center space-x-2 text-xs font-semibold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Notice: Active stock or historical links detected</span>
                </div>
                <p className="text-[11px] text-amber-800 pl-6">
                  {blockReason}
                </p>
              </div>
              <div className="text-xs text-slate-700 bg-rose-50 border border-rose-200 p-3 rounded-xl">
                <span className="font-bold text-rose-800 block mb-0.5">Super Admin Master Delete Access:</span>
                As Super Admin, you have full authority to permanently delete this {itemType.toLowerCase()}. All associated branch inventory records will be cleanly removed.
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this {itemType.toLowerCase()}? This action will remove all related stock entries from the database.
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {onConfirmArchive && (!canDelete || isSuperAdmin) && (
            <button
              onClick={() => {
                onConfirmArchive();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Deactivate / Archive</span>
            </button>
          )}

          {(!canDelete && isSuperAdmin && onConfirmForceDelete) ? (
            <button
              onClick={() => {
                onConfirmForceDelete();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Force Delete (Super Admin)</span>
            </button>
          ) : canDelete || isSuperAdmin ? (
            <button
              onClick={() => {
                onConfirmDelete();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Permanently Delete</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};
