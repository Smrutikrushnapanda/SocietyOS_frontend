'use client';

import React, { useState } from 'react';
import { usePaymentStore, useToastStore } from '../../store';

export const AdminFinanceSection: React.FC = () => {
  const { dues, ledger, recordPayment } = usePaymentStore();
  const { showToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'dues' | 'billing' | 'expenses' | 'ledger' | 'budget'>('dues');
  const [duesFilter, setDuesFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [selectedFlat, setSelectedFlat] = useState('A-101');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Expenses State
  const [expenses, setExpenses] = useState([
    { id: '1', date: '25 Sep 2026', voucher: 'VCH-2026-089', vendor: 'SecureForce Services', category: 'Security Guard Wages', invoice: 'INV-SF-9912', method: 'NEFT Bank Transfer', amount: 84000, status: 'Paid' },
    { id: '2', date: '20 Sep 2026', voucher: 'VCH-2026-088', vendor: 'Tata Power DDL', category: 'Common Electricity (Pumps/Lifts)', invoice: 'TP-SEP-3341', method: 'Direct Auto-Debit', amount: 42500, status: 'Paid' },
    { id: '3', date: '18 Sep 2026', voucher: 'VCH-2026-087', vendor: 'Otis Elevator AMC', category: 'Quarterly AMC Maintenance', invoice: 'OTIS-Q3-102', method: 'RTGS Transfer', amount: 28000, status: 'Paid' },
    { id: '4', date: '12 Sep 2026', voucher: 'VCH-2026-086', vendor: 'AquaFlow Care', category: 'Overhead Tank Chemical Cleaning', invoice: 'AQ-1092', method: 'Cheque #881204', amount: 14500, status: 'Paid' }
  ]);

  // Billing Cycles
  const [billingCycles, setBillingCycles] = useState([
    { id: '1', period: 'September 2026', generated: '01 Sep 2026', total: '₹2,36,400', collected: '₹1,94,100 (82%)', status: 'Active' },
    { id: '2', period: 'August 2026', generated: '01 Aug 2026', total: '₹2,36,400', collected: '₹2,31,900 (98%)', status: 'Closed' },
    { id: '3', period: 'July 2026', generated: '01 Jul 2026', total: '₹2,36,400', collected: '₹2,36,400 (100%)', status: 'Audited' }
  ]);

  // Budget vs Actual
  const budgetItems = [
    { head: 'Manned Security Roster', budget: 1000000, actual: 840000, pct: 84 },
    { head: 'Common Utilities & Electricity', budget: 600000, actual: 510000, pct: 85 },
    { head: 'AMC & Equipment Maintenance', budget: 450000, actual: 336000, pct: 75 },
    { head: 'Housekeeping & Gardening', budget: 350000, actual: 290000, pct: 83 },
    { head: 'Administrative & Software', budget: 150000, actual: 120000, pct: 80 }
  ];

  const totalCollected = 194100;
  const pendingDues = 42300;
  const totalExpenses = 169000;
  const netSurplus = 25100;

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
                          {d.status !== 'paid' && (
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => {
                                recordPayment(d.flat, d.amountDue - d.amountPaid, 'admin-cash');
                                showToast(`Payment recorded for Flat ${d.flat}!`);
                              }}
                            >
                              Record Payment
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
                  <span>Base Maintenance Rate</span>
                  <strong>₹3.50 / sq.ft. monthly</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Sinking Fund Reserve</span>
                  <strong>₹500 / flat monthly</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>Covered Car Parking Slot</span>
                  <strong>₹300 / bay monthly</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Clubhouse Maintenance Fee</span>
                  <strong>₹450 / flat monthly</strong>
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
                  <option value="A-101">Flat A-101</option>
                  <option value="A-102">Flat A-102</option>
                  <option value="A-201">Flat A-201</option>
                  <option value="A-202">Flat A-202</option>
                  <option value="B-303">Flat B-303</option>
                  <option value="B-501">Flat B-501</option>
                </select>
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--neutral)' }}>
                Account Dossier: <strong>Aarav Sharma</strong> • Balance: <span style={{ color: 'var(--success)', fontWeight: 700 }}>₹0.00 Cleared</span>
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
                    <td>10 Sep 2026</td>
                    <td><code>TXN-991204</code></td>
                    <td><span className="badge badge-success">Credit</span></td>
                    <td>Maintenance Payment via UPI Auto-Pay</td>
                    <td>—</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>₹4,500</td>
                    <td>₹0.00</td>
                    <td><button className="btn btn-xs btn-ghost" onClick={() => showToast('Receipt downloaded.')}>PDF</button></td>
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
                <label className="form-label">Unit / Flat</label>
                <select className="form-select" defaultValue="A-101">
                  <option value="A-101">Flat A-101 (Aarav Sharma)</option>
                  <option value="A-102">Flat A-102 (Priya Mukherjee)</option>
                  <option value="A-201">Flat A-201 (Deepak Verma)</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Payment Amount (₹)</label>
                  <input type="number" className="form-control" defaultValue="4500" />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Channel</label>
                  <select className="form-select">
                    <option>UPI / QR Scan</option>
                    <option>NEFT / IMPS Transfer</option>
                    <option>Cheque Deposit</option>
                    <option>Cash at Office</option>
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
                onClick={() => {
                  showToast('Payment credited & instant WhatsApp receipt dispatched!');
                  setShowPaymentModal(false);
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
