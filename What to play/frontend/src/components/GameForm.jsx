import { useState, useEffect } from 'react';

export default function GameForm({ initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'PC',
        tags: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                type: initialData.type || 'PC',
                tags: initialData.tags || ''
            });
        }
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="game-form">
            <div className="form-group">
                <label>Title</label>
                <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    required
                    autoFocus
                />
            </div>
            <div className="form-group">
                <label>Platform/Type</label>
                <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="PC">PC</option>
                    <option value="Console">Console</option>
                    <option value="Tabletop">Tabletop</option>
                    <option value="Mobile">Mobile</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                    type="text"
                    value={formData.tags}
                    onChange={e => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="RPG, Action, Multiplayer"
                />
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    Cancel
                </button>
                <button type="submit" className="primary">
                    {initialData ? 'Save Changes' : 'Add Game'}
                </button>
            </div>
        </form>
    );
}
