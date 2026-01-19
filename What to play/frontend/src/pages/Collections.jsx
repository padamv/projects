import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Collections.css';

export default function Collections() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState([]);
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);

    // Creation state
    const [newColName, setNewColName] = useState('');
    const [selectedGameIds, setSelectedGameIds] = useState(new Set());
    const [gameFilter, setGameFilter] = useState('');

    const fetchData = async () => {
        try {
            const [colRes, gameRes] = await Promise.all([
                fetch('/api/collections'),
                fetch('/api/games')
            ]);
            if (colRes.ok && gameRes.ok) {
                setCollections(await colRes.json());
                setGames(await gameRes.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleGameSelection = (id) => {
        const next = new Set(selectedGameIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedGameIds(next);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newColName) return;

        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newColName,
                    game_ids: Array.from(selectedGameIds)
                })
            });
            if (res.ok) {
                setNewColName('');
                setSelectedGameIds(new Set());
                fetchData(); // Refresh list
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete collection?')) return;
        try {
            await fetch(`/api/collections/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSpin = (id) => {
        navigate(`/spin?collection=${id}`);
    };

    const filteredGames = games.filter(g =>
        g.title.toLowerCase().includes(gameFilter.toLowerCase())
    );

    return (
        <div className="page collections-page">
            <h1>Collections</h1>

            <div className="create-collection-section card">
                <h3>Create New Collection</h3>
                <div className="creation-layout">
                    <div className="creation-form">
                        <input
                            type="text"
                            placeholder="Collection Name"
                            value={newColName}
                            onChange={e => setNewColName(e.target.value)}
                            className="name-input"
                        />
                        <button className="primary" onClick={handleCreate} disabled={!newColName}>Create Collection</button>
                        <p className="selection-count">{selectedGameIds.size} games selected</p>
                    </div>

                    <div className="game-selection-list">
                        <input
                            type="text"
                            placeholder="Filter games..."
                            value={gameFilter}
                            onChange={e => setGameFilter(e.target.value)}
                            className="filter-input"
                        />
                        <div className="scrollable-list">
                            {filteredGames.map(game => (
                                <div
                                    key={game.id}
                                    className={`game-select-item ${selectedGameIds.has(game.id) ? 'selected' : ''}`}
                                    onClick={() => toggleGameSelection(game.id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedGameIds.has(game.id)}
                                        readOnly
                                    />
                                    <span>{game.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="collections-grid">
                {loading ? <p>Loading...</p> : collections.map(col => (
                    <div key={col.id} className="collection-card card">
                        <div className="col-header">
                            <h3>{col.name}</h3>
                            <button
                                className="danger small"
                                onClick={() => handleDelete(col.id)}
                            >
                                Delete
                            </button>
                        </div>

                        <p className="col-meta">
                            {col.games ? col.games.length : 'N/A'} games
                        </p>

                        <button
                            className="spin-btn primary"
                            onClick={() => handleSpin(col.id)}
                        >
                            Spin Collection
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
