import React, { useState } from 'react';
import {
    Plus, Search, Download, Trash2, Package, CreditCard,
    RotateCcw, ClipboardList, CheckCircle
} from 'lucide-react';
import useStore from '../store/useStore';
import TransactionForm from '../components/TransactionForm';
import { formatCurrency, formatDate, downloadBillPDF } from '../utils/billPdf';
import { transactionsService } from '../services/firestoreService';
import toast from 'react-hot-toast';

const TAB_CONFIG = [
    { key: 'purchase', label: 'Purchase', icon: Package, color: '#F39C12' },
    { key: 'payment_out', label: 'Payment Out', icon: CreditCard, color: '#E74C3C' },
    { key: 'purchase_return', label: 'Purchase Return', icon: RotateCcw, color: '#3498DB' },
    { key: 'purchase_order', label: 'Purchase Order', icon: ClipboardList, color: '#9B59B6' },
];

const TYPE_LABELS = {
    purchase: 'Purchase', payment_out: 'Payment Out',
    purchase_return: 'Purchase Return', purchase_order: 'Purchase Order',
};

export default function Purchases() {
    const { profile } = useStore();
    const [activeTab, setActiveTab] = useState('purchase');
    const [showForm, setShowForm] = useState(false);
    const [editData, setEditData] = useState(null);
    const [search, setSearch] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchTransactions = async () => {
        try {
            setLoading(true);
            const data = await transactionsService.getAll(activeTab);
            // Map Firestore fields to our UI fields if necessary
            const mapped = data.map(t => ({
                ...t,
                invoiceNo: t.invoice_number,
                customerName: t.party_name,
                total: t.total_amount,
                paid: t.amount_paid,
                balance: t.balance_due,
            }));
            setTransactions(mapped);
            setLoading(false);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load transactions');
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchTransactions();
    }, [activeTab]);

    const getList = () => {
        return transactions.filter(t =>
            (t.customerName || t.notes || t.invoiceNo || '').toLowerCase().includes(search.toLowerCase())
        );
    };

    const handleSave = async (data) => {
        try {
            data.type = activeTab; // Tell the service what category this is (e.g. 'purchase')
            await transactionsService.add(data);
            toast.success(`${TYPE_LABELS[activeTab]} saved successfully!`);
            setShowForm(false);
            setEditData(null);
            fetchTransactions(); // Refresh the list
        } catch (error) {
            console.error(error);
            toast.error('Failed to save transaction');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to permanently delete this transaction?')) return;
        try {
            await transactionsService.delete(id);
            toast.success('Deleted from database!');
            fetchTransactions();
        } catch (error) {
            toast.error('Failed to delete transaction');
        }
    };

    const handlePrint = (txn) => {
        downloadBillPDF(txn, profile, TYPE_LABELS[txn.type || activeTab]);
        toast.success('Bill downloaded!');
    };

    const list = getList();
    const totalAmount = list.reduce((s, t) => s + (t.total || t.paid || t.amount || 0), 0);
    const totalBalance = list.reduce((s, t) => s + (t.balance || 0), 0);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Purchase Transactions</h1>
                    <p className="page-subtitle">Manage all your purchase-related records</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditData(null); setShowForm(true); }}>
                    <Plus size={16} /> New {TYPE_LABELS[activeTab]}
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                {TAB_CONFIG.map(tab => (
                    <button key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="btn"
                        style={{
                            background: activeTab === tab.key ? tab.color + '22' : 'var(--bg-card)',
                            color: activeTab === tab.key ? tab.color : 'var(--text-secondary)',
                            border: `1px solid ${activeTab === tab.key ? tab.color + '66' : 'var(--border)'}`,
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            fontSize: 12, padding: '8px 14px',
                        }}>
                        <tab.icon size={14} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Summary */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
                <div className="card-sm" style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>NO. OF TXNS</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{list.length}</div>
                </div>
                <div className="card-sm" style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>TOTAL {activeTab === 'payment_out' ? 'PAID' : 'PURCHASE'}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: '#F39C12' }}>{formatCurrency(totalAmount)}</div>
                </div>
                {activeTab === 'purchase' && (
                    <div className="card-sm" style={{ flex: 1, minWidth: 140 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>BALANCE DUE</div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)' }}>{formatCurrency(totalBalance)}</div>
                    </div>
                )}
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <div className="search-bar">
                    <Search size={16} color="var(--text-muted)" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder={`Search ${TYPE_LABELS[activeTab].toLowerCase()}s...`} />
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Invoice No.</th>
                                <th>Party / Supplier</th>
                                <th>Date</th>
                                <th>Type</th>
                                <th style={{ textAlign: 'right' }}>Amount</th>
                                {activeTab === 'purchase' && <th style={{ textAlign: 'right' }}>Balance</th>}
                                {activeTab === 'purchase' && <th>Status</th>}
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.length === 0 && (
                                <tr>
                                    <td colSpan={8}>
                                        <div className="empty-state">
                                            <Package size={40} />
                                            <h3>No {TYPE_LABELS[activeTab]}s yet</h3>
                                            <p>Click "New {TYPE_LABELS[activeTab]}" to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {list.map(txn => (
                                <tr key={txn.id}>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#F39C12', fontWeight: 600 }}>
                                            {txn.invoiceNo}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{txn.customerName || '—'}</div>
                                        {txn.items?.length > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{txn.items.length} item(s)</div>}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(txn.date)}</td>
                                    <td>
                                        <span className="badge badge-purchase">{TYPE_LABELS[txn.type] || TYPE_LABELS[activeTab]}</span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>
                                        {formatCurrency(txn.total || txn.paid || txn.amount || 0)}
                                    </td>
                                    {activeTab === 'purchase' && (
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: (txn.balance || 0) > 0 ? 'var(--red)' : 'var(--green)' }}>
                                            {formatCurrency(txn.balance || 0)}
                                        </td>
                                    )}
                                    {activeTab === 'purchase' && (
                                        <td>
                                            <span className={`badge ${txn.balance > 0 ? 'badge-red' : 'badge-green'}`}>
                                                {txn.balance > 0 ? 'Unpaid' : 'Paid'}
                                            </span>
                                        </td>
                                    )}
                                    <td>
                                        <div className="action-btns" style={{ justifyContent: 'center' }}>
                                            <button className="btn btn-ghost btn-icon btn-sm" title="Download Bill"
                                                onClick={() => handlePrint(txn)}>
                                                <Download size={14} />
                                            </button>
                                            {activeTab === 'purchase' && (
                                                <button className="btn btn-danger btn-icon btn-sm" title="Delete"
                                                    onClick={() => handleDelete(txn.id)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showForm && (
                <TransactionForm
                    type={activeTab}
                    title={TYPE_LABELS[activeTab]}
                    editData={editData}
                    onClose={() => { setShowForm(false); setEditData(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}
