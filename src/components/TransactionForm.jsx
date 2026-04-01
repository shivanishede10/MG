import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import useStore from '../store/useStore';
import { formatCurrency } from '../utils/billPdf';
import { partiesService, itemsService } from '../services/firestoreService';
import toast from 'react-hot-toast';

const PAYMENT_MODES = ['Cash', 'Bank Transfer', 'UPI', 'Cheque', 'Credit'];

export default function TransactionForm({ type, onClose, onSave, title, editData }) {
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);

    useEffect(() => {
        partiesService.getAll().then(data => setCustomers(data)).catch(err => console.error(err));
        itemsService.getAll().then(data => setProducts(data)).catch(err => console.error(err));
    }, []);

    const isExpense = type === 'expense';
    const isPayment = type === 'payment_in' || type === 'payment_out';
    const isP2P = type === 'p2p';

    const [form, setForm] = useState({
        customerId: editData?.customerId || '',
        customerName: editData?.customerName || '',
        date: editData?.date || new Date().toISOString().split('T')[0],
        items: editData?.items || [],
        subtotal: editData?.subtotal || 0,
        discount: editData?.discount || 0,
        tax: editData?.tax || 0,
        total: editData?.total || 0,
        paid: editData?.paid || 0,
        balance: editData?.balance || 0,
        notes: editData?.notes || '',
        paymentMode: editData?.paymentMode || 'Cash',
        status: editData?.status || 'completed',
        // Expense specific
        category: editData?.category || 'Rent',
        amount: editData?.amount || 0,
        // P2P
        fromParty: editData?.fromParty || '',
        toParty: editData?.toParty || '',
        transferAmount: editData?.transferAmount || 0,
    });

    const [itemSearch, setItemSearch] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [custSearch, setCustSearch] = useState(editData?.customerName || '');
    const [showCustDropdown, setShowCustDropdown] = useState(false);

    const filteredProds = products.filter(p =>
        (p.item_name || '').toLowerCase().includes(itemSearch.toLowerCase()) ||
        (p.id?.toString() || '').includes(itemSearch.toLowerCase())
    );
    const filteredCusts = customers.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase())
    );

    const addItem = (product) => {
        const existing = form.items.find(i => i.productId === product.id);
        if (existing) {
            updateItemQty(product.id, existing.qty + 1);
        } else {
            const newItem = {
                productId: product.id,
                name: product.item_name, // Changed from product.name to item_name (Matches DB)
                qty: 1,
                unit: product.unit || 'Pcs',
                price: type === 'purchase' || type === 'purchase_return' ? product.purchase_price : product.selling_price, // Changed from salePrice/purchasePrice (Matches DB)
                discount: 0,
                gst: product.gst || 0,
                amount: type === 'purchase' || type === 'purchase_return' ? product.purchase_price : product.selling_price,
            };
            setForm(f => ({ ...f, items: [...f.items, newItem] }));
        }
        setItemSearch('');
        setShowItemDropdown(false);
    };

    const updateItem = (productId, field, value) => {
        setForm(f => {
            const items = f.items.map(item => {
                if (item.productId !== productId) return item;
                const updated = { ...item, [field]: value };
                const base = updated.qty * updated.price;
                const disc = base * (updated.discount / 100);
                const gstAmt = (base - disc) * (updated.gst / 100);
                updated.amount = Math.round((base - disc + gstAmt) * 100) / 100;
                return updated;
            });
            return { ...f, items };
        });
    };

    const updateItemQty = (productId, qty) => {
        updateItem(productId, 'qty', Math.max(1, qty));
    };

    const removeItem = (productId) => {
        setForm(f => ({ ...f, items: f.items.filter(i => i.productId !== productId) }));
    };

    // Recalculate totals
    useEffect(() => {
        if (isExpense || isPayment || isP2P) return;
        const subtotal = form.items.reduce((s, i) => {
            const base = i.qty * i.price;
            const after_disc = base - base * (i.discount / 100);
            return s + after_disc;
        }, 0);
        const tax = form.items.reduce((s, i) => {
            const base = i.qty * i.price;
            const after_disc = base - base * (i.discount / 100);
            return s + after_disc * (i.gst / 100);
        }, 0);
        const discountAmt = subtotal * (form.discount / 100);
        const total = Math.round((subtotal - discountAmt + tax) * 100) / 100;
        const balance = Math.max(0, total - (Number(form.paid) || 0));
        setForm(f => ({ ...f, subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total, balance }));
    }, [form.items, form.discount, form.paid]);

    const handlePaidChange = (val) => {
        const paid = Math.min(Number(val) || 0, form.total);
        setForm(f => ({ ...f, paid, balance: Math.max(0, f.total - paid) }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isExpense && !isPayment && !isP2P && form.items.length === 0) {
            toast.error('Please add at least one item');
            return;
        }
        if (!isExpense && !isPayment && !isP2P && !form.customerName) {
            toast.error('Please select a party');
            return;
        }
        onSave(form);
    };

    const EXPENSE_CATS = ['Rent', 'Salary', 'Electricity', 'Transport', 'Maintenance', 'Marketing', 'Miscellaneous', 'Stationery', 'Telephone', 'Insurance'];

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-xl">
                <div className="modal-header">
                    <h2 className="modal-title">{editData ? 'Edit' : 'New'} {title}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Expense Form */}
                        {isExpense && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Expense Category</label>
                                    <select className="form-control" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                                        {EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value), paid: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Notes</label>
                                    <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Description / remarks..."></textarea>
                                </div>
                            </div>
                        )}

                        {/* P2P Transfer Form */}
                        {isP2P && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">From Party</label>
                                    <select className="form-control" value={form.fromParty} onChange={e => setForm(f => ({ ...f, fromParty: e.target.value }))} required>
                                        <option value="">Select Party</option>
                                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">To Party</label>
                                    <select className="form-control" value={form.toParty} onChange={e => setForm(f => ({ ...f, toParty: e.target.value }))} required>
                                        <option value="">Select Party</option>
                                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Transfer Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.transferAmount} onChange={e => setForm(f => ({ ...f, transferAmount: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <input type="text" className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Remarks..." />
                                </div>
                            </div>
                        )}

                        {/* Payment Form */}
                        {isPayment && (
                            <div className="grid-2" style={{ gap: 16 }}>
                                <div className="form-group" style={{ position: 'relative' }}>
                                    <label className="form-label">Party Name</label>
                                    <input className="form-control" value={custSearch} onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); }} placeholder="Search party..." autoComplete="off" required />
                                    {showCustDropdown && custSearch && filteredCusts.length > 0 && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                                            {filteredCusts.map(c => (
                                                <div key={c.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                                                    onMouseDown={() => { setForm(f => ({ ...f, customerId: c.id, customerName: c.name })); setCustSearch(c.name); setShowCustDropdown(false); }}
                                                    className="nav-item">{c.name}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Date</label>
                                    <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (₹)</label>
                                    <input type="number" className="form-control" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: Number(e.target.value) }))} min="0" step="0.01" required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Payment Mode</label>
                                    <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                        {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                    <label className="form-label">Notes / Reference</label>
                                    <input type="text" className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reference number, remarks..." />
                                </div>
                            </div>
                        )}

                        {/* Main Transaction Form (Sale / Purchase / Returns / DC / Estimate etc.) */}
                        {!isExpense && !isPayment && !isP2P && (
                            <>
                                <div className="grid-3" style={{ gap: 12, marginBottom: 16 }}>
                                    {/* Party selector */}
                                    <div className="form-group" style={{ position: 'relative', gridColumn: '1/3' }}>
                                        <label className="form-label">Party / Customer</label>
                                        <div className="search-bar" style={{ padding: '8px 12px' }}>
                                            <Search size={14} color="var(--text-muted)" />
                                            <input value={custSearch} onChange={e => { setCustSearch(e.target.value); setShowCustDropdown(true); }} placeholder="Search party name..." autoComplete="off" />
                                        </div>
                                        {showCustDropdown && custSearch && filteredCusts.length > 0 && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                                                {filteredCusts.map(c => (
                                                    <div key={c.id} style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13 }}
                                                        onMouseDown={() => { setForm(f => ({ ...f, customerId: c.id, customerName: c.name })); setCustSearch(c.name); setShowCustDropdown(false); }}>
                                                        {c.name}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {form.customerName && (
                                            <div style={{ marginTop: 4, fontSize: 11, color: 'var(--green)' }}>✓ {form.customerName}</div>
                                        )}
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Date</label>
                                        <input type="date" className="form-control" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                                    </div>
                                </div>

                                {/* Items section */}
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Items / Products</label>
                                        <div style={{ position: 'relative' }}>
                                            <div className="search-bar" style={{ padding: '6px 12px', minWidth: 280 }}>
                                                <Search size={14} color="var(--text-muted)" />
                                                <input value={itemSearch} onChange={e => { setItemSearch(e.target.value); setShowItemDropdown(true); }} onFocus={() => setShowItemDropdown(true)} placeholder="Search & add item..." />
                                            </div>
                                            {showItemDropdown && (itemSearch || true) && (
                                                <div style={{ position: 'absolute', top: '100%', right: 0, background: 'var(--bg-card3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', zIndex: 10, maxHeight: 220, overflowY: 'auto', minWidth: 320, marginTop: 4 }}>
                                                    {filteredProds.slice(0, 10).map(p => (
                                                        <div key={p.id} onMouseDown={() => addItem(p)}
                                                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                            className="nav-item">
                                                            <div>
                                                                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.item_name}</div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Stock: {p.stock} {p.unit || 'Pcs'}</div>
                                                            </div>
                                                            <div style={{ textAlign: 'right', fontSize: 12 }}>
                                                                <div style={{ color: 'var(--accent2)' }}>₹{p.selling_price}</div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>GST: {p.gst || 0}%</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {filteredProds.length === 0 && <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>No items found</div>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Items table */}
                                    <div className="items-table-wrap" onClick={() => setShowItemDropdown(false)}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Item</th>
                                                    <th>Qty</th>
                                                    <th>Unit</th>
                                                    <th>Rate (₹)</th>
                                                    <th>Disc%</th>
                                                    <th>GST%</th>
                                                    <th>Amount</th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {form.items.length === 0 && (
                                                    <tr>
                                                        <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                                            No items added yet. Search and add products above.
                                                        </td>
                                                    </tr>
                                                )}
                                                {form.items.map((item, i) => (
                                                    <tr key={item.productId}>
                                                        <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                                                        <td>
                                                            <div style={{ fontWeight: 500 }}>{item.name}</div>
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control" value={item.qty} onChange={e => updateItem(item.productId, 'qty', Math.max(1, Number(e.target.value)))} min="1" style={{ width: 70 }} />
                                                        </td>
                                                        <td style={{ color: 'var(--text-muted)' }}>{item.unit}</td>
                                                        <td>
                                                            <input type="number" className="form-control" value={item.price} onChange={e => updateItem(item.productId, 'price', Number(e.target.value))} min="0" step="0.01" style={{ width: 90 }} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control" value={item.discount} onChange={e => updateItem(item.productId, 'discount', Math.min(100, Number(e.target.value)))} min="0" max="100" style={{ width: 70 }} />
                                                        </td>
                                                        <td>
                                                            <input type="number" className="form-control" value={item.gst} onChange={e => updateItem(item.productId, 'gst', Number(e.target.value))} min="0" max="28" style={{ width: 70 }} />
                                                        </td>
                                                        <td><strong>₹{item.amount?.toFixed(2)}</strong></td>
                                                        <td>
                                                            <button type="button" className="btn btn-danger btn-icon btn-sm" onClick={() => removeItem(item.productId)}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Totals */}
                                <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div className="form-group">
                                            <label className="form-label">Notes / Remarks</label>
                                            <textarea className="form-control" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional remarks..."></textarea>
                                        </div>
                                        <div className="form-group" style={{ marginTop: 12 }}>
                                            <label className="form-label">Payment Mode</label>
                                            <select className="form-control" value={form.paymentMode} onChange={e => setForm(f => ({ ...f, paymentMode: e.target.value }))}>
                                                {PAYMENT_MODES.map(m => <option key={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ minWidth: 280 }}>
                                        <div className="card-sm">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                                <span>Subtotal</span><span>{formatCurrency(form.subtotal)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', fontSize: 13 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Discount%</span>
                                                <input type="number" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: Math.min(100, Number(e.target.value)) }))} min="0" max="100" className="form-control" style={{ width: 80, textAlign: 'right' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                                                <span>Tax/GST</span><span>{formatCurrency(form.tax)}</span>
                                            </div>
                                            <div style={{ height: 1, background: 'var(--border)', margin: '10px 0' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontWeight: 700, fontSize: 16, color: 'var(--accent2)' }}>
                                                <span>Total</span><span>{formatCurrency(form.total)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center', fontSize: 13 }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Paid (₹)</span>
                                                <input type="number" value={form.paid} onChange={e => handlePaidChange(e.target.value)} min="0" max={form.total} className="form-control" style={{ width: 100, textAlign: 'right' }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13, color: form.balance > 0 ? 'var(--red)' : 'var(--green)' }}>
                                                <span>Balance Due</span><span>{formatCurrency(form.balance)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            <Plus size={16} />
                            {editData ? 'Update' : 'Save'} {title}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
