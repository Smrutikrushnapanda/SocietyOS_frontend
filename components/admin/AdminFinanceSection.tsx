'use client';

import React, { useState, useEffect } from 'react';
import { usePaymentStore, useToastStore, useAuthStore } from '../../store';
import { hasPermission } from '../../lib/auth/rbac';

export const AdminFinanceSection: React.FC = () => {
  const {
    dues,
    ledger,
    adminDues,
    adminPayments,
    maintenanceConfig,
    isLoadingAdminData,
    adminError,
    loadAdminFinance,
    adminMarkDuePaid,
    adminMarkDueOverdue,
    adminWaiveLateCharge,
    adminRecordPayment,
  } = usePaymentStore();
  const { showToast } = useToastStore();
  const { organizationId } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'dues' | 'billing' | 'expenses' | 'ledger' | 'budget'>('dues');
  const [duesFilter, setDuesFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [modalDueId, setModalDueId] = useState('');
  const [modalAmount, setModalAmount] = useState('');
  const [modalMethod, setModalMethod] = useState<'CASH' | 'UPI' | 'NET_BANKING' | 'CHEQUE' | 'CARD'>('CASH');
  const [waiveReason, setWaiveReason] = useState('');
  const [stopFutureCharges, setStopFutureCharges] = useState(true);
  const [waiverBusy, setWaiverBusy] = useState(false);
  const [waiverError, setWaiverError] = useState<string | null>(null);
  const [selectedDueForWaiver, setSelectedDueForWaiver] = useState<string | null>(null);

  const canWaiveLateCharge = hasPermission('late_charge:waive');
  const canManageDues = hasPermission('due:manage');
  const canManagePayments = hasPermission('payment:manage');

  useEffect(() => {
    if (organizationId) {
      loadAdminFinance();
    }
  }, [organizationId, loadAdminFinance]);

  // Expenses State (dynamic)
  const [expenses, setExpenses] = useState<
    { id: string; date: string; voucher: string; vendor: string; category: string; invoice: string; method: string; amount: number; status: string }[]
  >([]);

  // Billing Cycles (dynamic)
  const [billingCycles, setBillingCycles] = useState<
    { id: string; period: string; generated: string; total: string; collected: string; status: string }[]
  >([]);

  // Budget vs Actual (dynamic)
  const budgetItems: { head: string; budget: number; actual: number; pct: number }[] = [];

  const totalCollected = 0;
  const pendingDues = 0;
  const totalExpenses = 0;
  const netSurplus = 0;

  const filteredDues = dues.filter((d) => {
    if (duesFilter === 'all') return true;
    if (duesFilter === 'paid') return d.status === 'paid';
    if (duesFilter === 'partial') return d.status === 'partial';
    if (duesFilter === 'unpaid') return d.status === 'unpaid';
    return true;
  });

  const flatLedger = ledger.filter((l) => l.flat === selectedFlat);

  return (
    <div className="admin-section active" id="section-finance">
      <div className="section-header">
        <div>
          <h2>Finance, Billing & Society Accounts</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
            End-to-end dues collection, invoice billing, expense tracking, and ledgers.
          </p>
        </div>
        <div className="section-actions" id="finance-top-actions">
          <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
            + Record Payment
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowExpenseModal(true)}>
            + Log Expense
          </button>
        </div>
      </div>

      {selectedDueForWaiver && <div className="modal-overlay"><div className="modal-dialog" role="dialog" aria-modal="true" aria-label="Waive Late Charge"><form onSubmit={async event => {
        event.preventDefault(); if (waiverBusy) return; setWaiverBusy(true); setWaiverError(null);
        try { await adminWaiveLateCharge(selectedDueForWaiver, waiveReason.trim() || 'Administrative waiver', stopFutureCharges); setSelectedDueForWaiver(null); showToast('Late fees waived. Original maintenance bill remains payable.'); }
        catch (reason) { setWaiverError(reason instanceof Error ? reason.message : 'Unable to waive late fees'); }
        finally { setWaiverBusy(false); }
      }}><div className="modal-header"><h3>Waive Late Charge</h3></div><div className="modal-body"><p>Remove currently accrued late fees. Original maintenance amount stays payable.</p><label className="settings-field">Reason<textarea className="form-textarea" maxLength={500} value={waiveReason} onChange={event => setWaiveReason(event.target.value)} /></label><label><input type="checkbox" checked={stopFutureCharges} onChange={event => setStopFutureCharges(event.target.checked)} /> Stop further late charges for this bill</label>{waiverError && <p role="alert">{waiverError}</p>}</div><div className="modal-footer"><button type="button" className="btn btn-ghost btn-sm" disabled={waiverBusy} onClick={() => setSelectedDueForWaiver(null)}>Cancel</button><button className="btn btn-primary btn-sm" disabled={waiverBusy}>{waiverBusy ? 'Saving…' : 'Confirm Waiver'}</button></div></form></div></div>}
      {/* Income vs Expense Summary Strip */}
      <div className="finance-summary-strip">
        <div className="kpi-card kpi-pine">
          <span className="kpi-label">Total Collections</span>
          <span className="kpi-value">₹{totalCollected.toLocaleString('en-IN')}</span>
          <span className="kpi-sub">82% collection rate for Sep</span>
        </div>
        <div className="kpi-card kpi-warning">
          <span className="kpi-label">Pending Dues</span>
          <span className="kpi-value">₹{pendingDues.toLocaleString('en-IN')}</span>
          <span className="kpi-sub">6 flats with outstanding balance</span>
        </div>
        <div className="kpi-card kpi-danger">
          <span className="kpi-label">Society Expenses</span>
          <span className="kpi-value">₹{totalExpenses.toLocaleString('en-IN')}</span>
          <span className="kpi-sub">Total Sep logged spends</span>
        </div>
        <div className="kpi-card kpi-success">
          <span className="kpi-label">Net Society Surplus</span>
          <span className="kpi-value">+₹{netSurplus.toLocaleString('en-IN')}</span>
          <span className="kpi-sub">Income minus total expenditure</span>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="finance-subnav">
        <button
          className={`finance-nav-btn ${activeTab === 'dues' ? 'active' : ''}`}
          onClick={() => setActiveTab('dues')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
          <span>Dues & Collections</span>
        </button>
        <button
          className={`finance-nav-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span>Billing & Charges</span>
        </button>
        <button
          className={`finance-nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Society Expenses</span>
        </button>
        <button
          className={`finance-nav-btn ${activeTab === 'ledger' ? 'active' : ''}`}
          onClick={() => setActiveTab('ledger')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span>Flat Ledger Statements</span>
        </button>
        <button
          className={`finance-nav-btn ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" x2="18" y1="20" y2="10" />
            <line x1="12" x2="12" y1="20" y2="4" />
            <line x1="6" x2="6" y1="20" y2="14" />
          </svg>
          <span>Budget vs Actual</span>
        </button>
      </div>

      {/* TAB 1: DUES */}
      {activeTab === 'dues' && (
        <div className="finance-tab-content active" id="fintab-dues">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['all', 'paid', 'partial', 'unpaid'] as const).map((filter) => (
                <button
                  key={filter}
                  className={`btn btn-sm btn-ghost ${duesFilter === filter ? 'active' : ''}`}
                  onClick={() => setDuesFilter(filter)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {filter === 'all' ? 'All Units' : filter}
                </button>
              ))}
            </div>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => showToast('Automated WhatsApp reminder sent to all 6 pending units!')}
            >
              Send WhatsApp Reminder to All Pending Flats
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="dues-flat-table">
              <thead>
                <tr>
                  <th>Flat No.</th>
                  <th>Billing Period</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Payment Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDues.map((d) => {
                  const pct = Math.min(100, Math.round((d.amountPaid / (d.amountDue || 1)) * 100));
                  return (
                    <tr key={d.flat}>
                      <td>
                        <strong>Flat {d.flat}</strong>
                        <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>{d.residentName}</div>
                      </td>
                      <td>{d.billingPeriod}</td>
                      <td>₹{d.amountDue.toLocaleString('en-IN')}</td>
                      <td>₹{d.amountPaid.toLocaleString('en-IN')}</td>
                      <td style={{ minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              flex: 1,
                              height: '6px',
                              background: 'var(--border-subtle)',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}
                          >
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: pct === 100 ? 'var(--success)' : pct > 0 ? 'var(--saffron)' : 'var(--danger)'
                              }}
                            ></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            d.status === 'paid' ? 'badge-success' : d.status === 'partial' ? 'badge-warning' : 'badge-danger'
                          }`}
                        >
                          {d.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="table-action-btns">
                          {d.status !== 'paid' && canManageDues && d.id && (
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={async () => {
                                try {
                                  await adminMarkDuePaid(d.id!);
                                  showToast(`Due for Unit ${d.flat} marked as PAID.`);
                                } catch (err: any) {
                                  showToast(err.backendMessage || 'Failed to update due status');
                                }
                              }}
                            >
                              Mark Paid
                            </button>
                          )}
                          {d.lateCharge && d.lateCharge > 0 && canWaiveLateCharge && d.id && (
                            <button
                              className="btn btn-xs btn-secondary"
                              onClick={() => { setSelectedDueForWaiver(d.id!); setWaiveReason(''); setStopFutureCharges(true); setWaiverError(null); }}
                            >
                              Waive Late Charge
                            </button>
                          )}
                          <button
                            className="btn btn-xs btn-ghost"
                            onClick={() => showToast(`WhatsApp payment reminder sent to ${d.residentName}!`)}
                          >
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BILLING & CHARGES */}
      {activeTab === 'billing' && (
        <div className="finance-tab-content active" id="fintab-billing">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Active Billing Cycles & Charge Master</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Configure society maintenance tariffs and generate monthly assessment cycles.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => showToast('October 2026 billing cycle generation queued!')}
            >
              + Generate Billing Cycle
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            <div className="card">
              <h4 style={{ fontSize: '0.95rem', marginBottom: '12px' }}>Billing Cycles History</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {billingCycles.map((bc) => (
                  <div
                    key={bc.id}
                    style={{
                      background: 'var(--surface-sunken)',
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.875rem' }}>{bc.period}</strong>
                      <div style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                        Assessment: {bc.total} • Collected: {bc.collected}
                      </div>
                    </div>
                    <span className="badge badge-success">{bc.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '0.95rem' }}>Configured Charge Types</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => showToast('New charge modal opened.')}>
                  + Add Charge
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Base Maintenance Amount</span>
                  <strong>{maintenanceConfig ? `₹${maintenanceConfig.base_maintenance_amount} / flat monthly` : '—'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Sinking Fund Reserve</span>
                  <strong>—</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Covered Car Parking Slot</span>
                  <strong>—</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Clubhouse Maintenance Fee</span>
                  <strong>—</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="finance-tab-content active" id="fintab-expenses">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Society Operational Spends & Invoices</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Log vendor payments for security, housekeeping, AMC contracts, and repairs.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowExpenseModal(true)}>
              + Log New Expense
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Voucher #</th>
                  <th>Vendor / Payee</th>
                  <th>Category</th>
                  <th>Invoice No.</th>
                  <th>Payment Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date}</td>
                    <td>
                      <code>{exp.voucher}</code>
                    </td>
                    <td>
                      <strong>{exp.vendor}</strong>
                    </td>
                    <td>
                      <span className="badge badge-pine">{exp.category}</span>
                    </td>
                    <td>{exp.invoice}</td>
                    <td>{exp.method}</td>
                    <td>
                      <strong>₹{exp.amount.toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <span className="badge badge-success">{exp.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: FLAT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="finance-tab-content active" id="fintab-ledger">
          <div className="ledger-header-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Select Unit / Flat:</label>
                <select
                  className="form-select"
                  value={selectedFlat}
                  onChange={(e) => setSelectedFlat(e.target.value)}
                  style={{ minWidth: '160px', fontWeight: 700 }}
                >
                  <option value="">Select Unit</option>
                  {Array.from(new Set(dues.map((d) => d.flat))).map((flat) => (
                    <option key={flat} value={flat}>
                      Flat {flat}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
                Account Dossier: <strong>{dues.find((d) => d.flat === selectedFlat)?.residentName || '—'}</strong> • Balance:{' '}
                <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                  ₹{((dues.find((d) => d.flat === selectedFlat)?.amountDue ?? 0) - (dues.find((d) => d.flat === selectedFlat)?.amountPaid ?? 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="section-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => showToast('Ledger CSV exported.')}>
                Export CSV
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => showToast('PDF Account Statement downloaded.')}>
                Download Statement (PDF)
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="statement-table">
              <thead>
                <tr>
                  <th>Transaction Date</th>
                  <th>Ref #</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Debit (₹)</th>
                  <th>Credit (₹)</th>
                  <th>Running Balance (₹)</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {flatLedger.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--neutral)' }}>
                      No ledger transactions found.
                    </td>
                  </tr>
                ) : (
                  flatLedger.map((l, i) => (
                    <tr key={i}>
                      <td>{l.date}</td>
                      <td>
                        <code>{l.reference}</code>
                      </td>
                      <td>
                        <span className={`badge ${l.type === 'credit' ? 'badge-success' : 'badge-neutral'}`}>
                          {l.type.toUpperCase()}
                        </span>
                      </td>
                      <td>{l.description}</td>
                      <td>{l.debit ? `₹${l.debit.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                        {l.credit ? `₹${l.credit.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td>₹{l.balance.toLocaleString('en-IN')}</td>
                      <td>
                        <button className="btn btn-xs btn-ghost" onClick={() => showToast(`Receipt ${l.reference} downloaded.`)}>
                          PDF
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: BUDGET */}
      {activeTab === 'budget' && (
        <div className="finance-tab-content active" id="fintab-budget">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.05rem' }}>Annual Operating Budget vs Actual Spends</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral)' }}>
                Comparison by expense head to ensure society reserves are protected.
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => showToast('Budget allocation updated for FY 2026-27!')}>
              Edit Budget Caps
            </button>
          </div>

          <div className="budget-grid">
            {budgetItems.map((b, idx) => (
              <div key={idx} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ fontSize: '0.95rem' }}>{b.head}</h4>
                  <span className="badge badge-pine">{b.pct}% Used</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--neutral)' }}>Budget Cap: ₹{b.budget.toLocaleString('en-IN')}</span>
                  <strong>Spent: ₹{b.actual.toLocaleString('en-IN')}</strong>
                </div>
                <div
                  style={{
                    height: '8px',
                    background: 'var(--border-subtle)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: `${b.pct}%`,
                      height: '100%',
                      background: b.pct > 90 ? 'var(--danger)' : 'var(--pine)'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Record Payment */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Record Maintenance Payment</h3>
              <button className="modal-close-btn" onClick={() => setShowPaymentModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Associated Maintenance Due</label>
                <select
                  className="form-select"
                  value={modalDueId}
                  onChange={(e) => {
                    setModalDueId(e.target.value);
                    const selected = adminDues.find((d) => d.id === e.target.value);
                    if (selected) {
                      const outstanding = Number(selected.calculated_amount) + Number(selected.late_charge) - Number(selected.late_charge_waived);
                      setModalAmount(outstanding > 0 ? String(outstanding) : '0');
                    }
                  }}
                >
                  <option value="">Select a pending due...</option>
                  {adminDues.map((d) => (
                    <option key={d.id} value={d.id}>
                      Unit {d.flat_id ? d.flat_id.slice(0, 6) : 'N/A'} — Due: ₹{d.calculated_amount} ({d.status})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Amount (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={modalAmount}
                    onChange={(e) => setModalAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select
                    className="form-select"
                    value={modalMethod}
                    onChange={(e) => setModalMethod(e.target.value as any)}
                  >
                    <option value="CASH">CASH (Office Deposit)</option>
                    <option value="UPI">UPI (Direct Transfer/QR)</option>
                    <option value="NET_BANKING">NET_BANKING (NEFT/RTGS)</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="CARD">CARD (POS)</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  if (!modalDueId) {
                    showToast('Please select an active maintenance due.');
                    return;
                  }
                  if (!modalAmount || Number(modalAmount) <= 0) {
                    showToast('Please enter a valid payment amount.');
                    return;
                  }
                  try {
                    const due = adminDues.find((d) => d.id === modalDueId);
                    await adminRecordPayment({
                      maintenance_due_id: modalDueId,
                      amount: Number(modalAmount),
                      payment_method: modalMethod,
                      flat_id: due?.flat_id,
                    });
                    showToast('Internal payment record created successfully!');
                    setShowPaymentModal(false);
                  } catch (err: any) {
                    showToast(err.backendMessage || 'Failed to record payment');
                  }
                }}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Expense */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>+ Log Society Expense Voucher</h3>
              <button className="modal-close-btn" onClick={() => setShowExpenseModal(false)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Vendor / Payee</label>
                <input type="text" className="form-control" placeholder="e.g. Otis Elevator Service" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-control" placeholder="e.g. 15000" />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input type="text" className="form-control" placeholder="e.g. AMC Repair" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setShowExpenseModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  showToast('Expense voucher registered in society accounts.');
                  setShowExpenseModal(false);
                }}
              >
                Save Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
