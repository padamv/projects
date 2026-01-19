import { useState, useEffect } from 'react';
import './CollectionForm.css';

export default function CollectionForm({ initialData, allGames, onSubmit, onCancel }) {
    const [name, setName] = useState('');
    const [selectedGameIds, setSelectedGameIds] = useState(new Set());
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            // If editing existing collection, initialData should have games list or ids
            if (initialData.games) {
                setSelectedGameIds(new Set(initialData.games.map(g => g.id)));
            }
        }
    }, [initialData]);

    const toggleGame = (id) => {
        const next = new Set(selectedGameIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedGameIds(next);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit({
            name,
            game_ids: Array.from(selectedGameIds)
        });
    };

    const filteredGames = allGames.filter(g =>
        g.title.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <form onSubmit={handleSubmit} className="collection-form">
            <div className="form-group">
                <label>Collection Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                />
            </div>

            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }}>
                <label>Select Games ({selectedGameIds.size})</label>
                <input
                    type="text"
                    placeholder="Filter games..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="filter-input"
                />
                <div className="scrollable-list">
                    {filteredGames.map(g => (
                        <div
                            key={g.id}
                            className={`game-select-item ${selectedGameIds.has(g.id) ? 'selected' : ''}`}
                            onClick={() => toggleGame(g.id)}
                        >
                            <input
                                type="checkbox"
                                checked={selectedGameIds.has(g.id)}
                                readOnly
                            />
                            <span>{g.title}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    Cancel
                </button>
                <button type="submit" className="primary">
                    {initialData ? 'Save Changes' : 'Create Collection'}
                </button>
            </div>
        </form>
    );
}
