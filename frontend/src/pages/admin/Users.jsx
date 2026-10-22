import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Ban, 
  CheckCircle, 
  Mail, 
  Phone, 
  Calendar, 
  RefreshCw,
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  XCircle,
  Eye,
  X
} from 'lucide-react';
import { adminAPI } from '../../api/admin.api';
import Loader from '../../components/common/Loader';
import { formatDate } from '../../utils/formatters';

export default function AdminUsers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Suspension modal
  const [suspendModal, setSuspendModal] = useState({
    open: false,
    customerId: null,
    customerName: '',
    targetStatus: 'suspended',
    reason: '',
    submitting: false,
    error: ''
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await adminAPI.getCustomers(params);
      if (res?.customers) {
        setCustomers(res.customers);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const openSuspendModal = (customer, targetStatus) => {
    setSuspendModal({
      open: true,
      customerId: customer._id,
      customerName: customer.name,
      targetStatus,
      reason: '',
      submitting: false,
      error: ''
    });
  };

  const handleConfirmStatus = async () => {
    const { customerId, targetStatus, reason } = suspendModal;
    if (targetStatus === 'suspended' && !reason.trim()) {
      setSuspendModal(prev => ({ ...prev, error: 'A reason is required to suspend an account.' }));
      return;
    }

    try {
      setSuspendModal(prev => ({ ...prev, submitting: true, error: '' }));
      await adminAPI.updateCustomerStatus(customerId, {
        status: targetStatus,
        reason: reason.trim()
      });

      setSuspendModal({ open: false, customerId: null, customerName: '', targetStatus: 'suspended', reason: '', submitting: false, error: '' });
      fetchCustomers();
    } catch (err) {
      setSuspendModal(prev => ({
        ...prev,
        submitting: false,
        error: err.response?.data?.message || 'Failed to update account status'
      }));
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-3xl p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60">
              Customer Management
            </span>
            <span className="text-xs text-slate-500 font-medium">· Database Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            Users & Customers
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mt-1">
            Search registered customers, monitor job requests and booking history, and manage platform account access with audit trails.
          </p>
        </div>

        <button
          onClick={fetchCustomers}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, email or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {['all', 'active', 'suspended'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-purple-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-20">
          <Loader text="Loading customer accounts..." />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No customers found</h3>
          <p className="text-xs text-slate-500 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 shadow-2xs rounded-2xl overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="p-4">Customer Details</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Registered</th>
                <th className="p-4 text-center">Requests Posted</th>
                <th className="p-4 text-center">Bookings Active / Done</th>
                <th className="p-4 text-center">Cancellations</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {customers.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/80 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                        {c.name?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-[10px] text-slate-400">ID: {c._id.slice(-6)}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <p className="text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-slate-400" /> {c.email}
                    </p>
                    {c.phone && (
                      <p className="text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" /> {c.phone}
                      </p>
                    )}
                  </td>

                  <td className="p-4 text-slate-500 whitespace-nowrap">
                    {formatDate(c.createdAt)}
                  </td>

                  <td className="p-4 text-center font-bold text-slate-800">
                    {c.totalRequests}
                  </td>

                  <td className="p-4 text-center">
                    <span className="font-semibold text-emerald-700">{c.completedBookings} done</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="font-semibold text-blue-700">{c.totalBookings} total</span>
                  </td>

                  <td className="p-4 text-center">
                    <span className={`font-semibold ${c.cancelledBookings > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {c.cancelledBookings}
                    </span>
                  </td>

                  <td className="p-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      c.status === 'suspended' || c.isActive === false
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {c.status === 'suspended' || c.isActive === false ? 'Suspended' : 'Active'}
                    </span>
                    {c.suspensionReason && (
                      <p className="text-[10px] text-rose-600 mt-1 max-w-[150px] truncate" title={c.suspensionReason}>
                        {c.suspensionReason}
                      </p>
                    )}
                  </td>

                  <td className="p-4 text-right whitespace-nowrap">
                    {c.status === 'suspended' || c.isActive === false ? (
                      <button
                        onClick={() => openSuspendModal(c, 'active')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => openSuspendModal(c, 'suspended')}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SUSPENSION DIALOG WITH REQUIRED REASON */}
      {suspendModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <h3 className="text-lg font-black text-slate-900">
                {suspendModal.targetStatus === 'suspended' ? 'Suspend Customer Account' : 'Reactivate Customer Account'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Customer: <span className="font-bold text-slate-800">{suspendModal.customerName}</span>
              </p>
            </div>

            {suspendModal.error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {suspendModal.error}
              </div>
            )}

            {suspendModal.targetStatus === 'suspended' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  Suspension Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="State the policy violation or administrative reason for restricting this account..."
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-purple-600"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSuspendModal(prev => ({ ...prev, open: false }))}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatus}
                disabled={suspendModal.submitting}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition disabled:opacity-50 ${
                  suspendModal.targetStatus === 'suspended' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {suspendModal.submitting ? 'Updating...' : suspendModal.targetStatus === 'suspended' ? 'Confirm Suspension' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
