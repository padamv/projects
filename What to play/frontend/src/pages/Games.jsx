import { useState, useEffect } from 'react';
import './Games.css';

export default function Games() {
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({ title: '', type: 'PC', tags: '' });
    const [filter, setFilter] = useState('');

    const fetchGames = async () => {
        try {
            const res = await fetch('/api/games');
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setGames(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGames();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title) return;

        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setFormData({ title: '', type: 'PC', tags: '' });
                fetchGames();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this game?')) return;
        try {
            await fetch(`/api/games/${id}`, { method: 'DELETE' });
            fetchGames();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredGames = games.filter(g =>
        g.title.toLowerCase().includes(filter.toLowerCase()) ||
        (g.tags && g.tags.toLowerCase().includes(filter.toLowerCase()))
    );

    return (
        <div className="page games-page">
            <div className="header-actions">
                <h1>Games Library</h1>
                <input
                    type="text"
                    placeholder="Filter games..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="add-game-form card">
                <h3>Add New Game</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Game Title"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <select
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="PC">PC</option>
                            <option value="Console">Console</option>
                            <option value="Tabletop">Tabletop</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <input
                            type="text"
                            placeholder="Tags (comma, separated)"
                            value={formData.tags}
                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>
                    <button type="submit" className="primary">Add Game</button>
                </form>
            </div>

            {loading ? (
                <p>Loading games...</p>
            ) : (
                <div className="games-grid">
                    {filteredGames.length === 0 ? (
                        <p className="empty-state">No games found.</p>
                    ) : filteredGames.map(game => (
                        <div key={game.id} className="game-card card">
                            <div className="game-header">
                                <h3>{game.title}</h3>
                                <span className="game-type">{game.type}</span>
                            </div>

                            <div className="game-tags">
                                {game.tags ? game.tags.split(',').map((t, i) => (
                                    <span key={i} className="tag">{t.trim()}</span>
                                )) : null}
                            </div>

                            <button
                                className="danger small delete-btn"
                                onClick={() => handleDelete(game.id)}
                            >
                                Delete
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
