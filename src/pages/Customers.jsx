import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, Users, Phone, MapPin, X } from 'lucide-react';
import { partiesService } from '../services/firestoreService';
import { formatCurrency } from '../utils/billPdf';
import toast from 'react-hot-toast';

const EMPTY_FORM = { id: null, type: 'CUSTOMER', name: '', phone: '', email: '', address: '', gstin: '', balance: 0 };

export default function Customers() {
    const [parties, setParties] = useState([]);
    const [search, setSearch] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);
    const [loading, setLoading] = useState(true);

    // Fetch live parties from Firestore
    const fetchParties = async () => {
        try {
            setLoading(true);
            const data = await partiesService.getAll();
            setParties(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load parties:", error);
            toast.error("Failed to load parties from database");
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParties();
    }, []);

    const filtered = parties.filter(c =>
        (c.name + (c.phone || '') + (c.email || '') + (c.address || '')).toLowerCase().includes(search.toLowerCase())
    );

    const handleOpen = (cust) => {
        if (cust) {
            setForm({ ...cust });
        } else {
            setForm(EMPTY_FORM);
        }
        setShowForm(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Name is required'); return; }

        try {
            if (form.id) {
                await partiesService.update(form.id, form);
                toast.success('Party updated in Database!');
            } else {
                await partiesService.add(form);
                toast.success('Party saved to Database!');
            }
            setShowForm(false);
            fetchParties(); // Refresh the list from DB
        } catch (err) {
            toast.error('Failed to save party');
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this party permanently from the database?')) return;

        try {
            await partiesService.delete(id);
            toast.success('Party deleted from Database!');
            fetchParties(); // Refresh list
        } catch (err) {
            toast.error('Failed to delete party. They might have existing transactions.');
            console.error(err);
        }
    };

    const totalReceivable = parties.reduce((sum, p) => sum + (p.balanceDue || 0), 0);
    const partiesWithBalance = parties.filter(p => (p.balanceDue || 0) > 0).length;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Parties / Customers</h1>
                    <p className="page-subtitle">Manage your customers and suppliers (Live DB)</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpen(null)}>
                    <Plus size={16} /> Add Party
                </button>
            </div>

            {/* Stats */}
            <div className="grid-3" style={{ marginBottom: 20, gap: 16 }}>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>TOTAL PARTIES</div>
                    <div className="stat-value">{parties.length}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>TOTAL RECEIVABLE</div>
                    <div className="stat-value" style={{ color: 'var(--green)' }}>
                        {formatCurrency(totalReceivable)}
                    </div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>WITH BALANCE DUE</div>
                    <div className="stat-value" style={{ color: 'var(--yellow)' }}>
                        {partiesWithBalance}
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <div className="search-bar">
                    <Search size={16} color="var(--text-muted)" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parties by name, phone..." />
                </div>
            </div>

            {/* Customer Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                {loading && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 20 }}>Loading from Database...</div>}

                {!loading && filtered.length === 0 && (
                    <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                        <Users size={40} />
                        <h3>No parties found</h3>
                        <p>Add your first customer or supplier</p>
                    </div>
                )}

                {!loading && filtered.map(cust => {
                    const balance = cust.balanceDue || 0;
                    const initial = cust.name.charAt(0).toUpperCase();
                    return (
                        <div key={cust.id} className="card" style={{ position: 'relative' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                                <div className="avatar" style={{ fontSize: 18, background: cust.type === 'SUPPLIER' ? 'rgba(231,76,60,0.15)' : 'rgba(124,111,255,0.15)', color: cust.type === 'SUPPLIER' ? 'var(--red)' : '#7C6FFF' }}>
                                    {initial}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cust.name}</div>
                                    {cust.phone ? (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Phone size={11} />
                                            {cust.phone}
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No Phone Number</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleOpen(cust)}><Edit2 size={13} /></button>
                                    <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(cust.id)}><Trash2 size={13} /></button>
                                </div>
                            </div>
                            <div className="divider"></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                                <div>
                                    {cust.address && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', marginBottom: 4 }}>
                                            <MapPin size={10} />
                                            <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cust.address}</span>
                                        </div>
                                    )}
                                    <div style={{ color: 'var(--text-muted)', fontSize: 11, background: 'rgba(255,255,255,0.05)', display: 'inline-block', padding: '2px 6px', borderRadius: 4 }}>
                                        {cust.type}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Balance Due</div>
                                    <div style={{ fontWeight: 700, color: balance > 0 ? 'var(--green)' : 'var(--text-muted)', fontSize: 14 }}>
                                        {formatCurrency(balance)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">{form.id ? 'Edit Party' : 'Add New Party'}</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowForm(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body">
                                <div className="grid-2" style={{ gap: 14 }}>
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Party Type</label>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input type="radio" name="partyType" checked={form.type === 'CUSTOMER'} onChange={() => setForm({ ...form, type: 'CUSTOMER' })} />
                                                Customer
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <input type="radio" name="partyType" checked={form.type === 'SUPPLIER'} onChange={() => setForm({ ...form, type: 'SUPPLIER' })} />
                                                Supplier
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Party Name *</label>
                                        <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter party/customer name" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone Number</label>
                                        <input className="form-control" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="10-digit mobile number" type="tel" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email Address / GSTIN</label>
                                        <input className="form-control" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email or tax info" />
                                    </div>
                                    <div className="form-group" style={{ gridColumn: '1/-1' }}>
                                        <label className="form-label">Address</label>
                                        <textarea className="form-control" rows={2} value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address"></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Opening Balance (₹)</label>
                                        <input className="form-control" value={form.balance || 0} onChange={e => setForm({ ...form, balance: Number(e.target.value) })} type="number" min="0" step="0.01" />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    {form.id ? 'Update Party' : 'Save Party'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
