import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import GameForm from '../components/GameForm';
import CollectionForm from '../components/CollectionForm';
import { useNavigate } from 'react-router-dom';
import './Library.css';
import './Games.css';
import './Collections.css';

export default function Library() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('games');
    const [games, setGames] = useState([]);
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    // Sorting State
    const [sortConfig, setSortConfig] = useState({ key: 'title', direction: 'asc' });

    // Modal State
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);
    const [isColModalOpen, setIsColModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null); // Game or Collection object

    // Filters
    const [filter, setFilter] = useState('');

    const fetchData = async () => {
        try {
            const [gRes, cRes] = await Promise.all([
                fetch('/api/games'),
                fetch('/api/collections')
            ]);
            setGames(await gRes.json());
            setCollections(await cRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- Sorting Logic ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedData = (data, config) => {
        if (!config.key) return data;
        return [...data].sort((a, b) => {
            let aVal = a[config.key] || '';
            let bVal = b[config.key] || '';

            // Special handling for derived values like game count
            if (config.key === 'game_count') {
                aVal = a.games ? a.games.length : 0;
                bVal = b.games ? b.games.length : 0;
            } else {
                if (typeof aVal === 'string') aVal = aVal.toLowerCase();
                if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            }

            if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // --- Handlers: Games ---

    const handleCreateGame = async (data) => {
        try {
            const res = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsGameModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateGame = async (data) => {
        if (!editingItem) return;
        try {
            const res = await fetch(`/api/games/${editingItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsGameModalOpen(false);
                setEditingItem(null);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteGame = async (id) => {
        if (!window.confirm('Delete game?')) return;
        await fetch(`/api/games/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openAddGame = () => {
        setEditingItem(null);
        setIsGameModalOpen(true);
    };

    const openEditGame = (game) => {
        setEditingItem(game);
        setIsGameModalOpen(true);
    };

    // --- Handlers: Collections ---

    const handleCreateCollection = async (data) => {
        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsColModalOpen(false);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteCollection = async (id) => {
        if (!window.confirm('Delete collection?')) return;
        await fetch(`/api/collections/${id}`, { method: 'DELETE' });
        fetchData();
    };

    const openAddCol = () => {
        setEditingItem(null);
        setIsColModalOpen(true);
    };

    const openEditCol = (col) => {
        fetch(`/api/collections/${col.id}`)
            .then(r => r.json())
            .then(fullCol => {
                setEditingItem(fullCol);
                setIsColModalOpen(true);
            });
    };

    const handleUpdateCollection = async (data) => {
        if (!editingItem) return;
        try {
            const res = await fetch(`/api/collections/${editingItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                setIsColModalOpen(false);
                setEditingItem(null);
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSpin = (id) => navigate(`/spin?collection=${id}`);


    // --- Render Helpers ---

    const filteredGames = games.filter(g =>
        g.title.toLowerCase().includes(filter.toLowerCase()) ||
        (g.tags && g.tags.toLowerCase().includes(filter.toLowerCase()))
    );

    const sortedGames = getSortedData(filteredGames, sortConfig);
    const sortedCollections = getSortedData(collections, {
        key: sortConfig.key === 'title' ? 'name' : sortConfig.key, // Map title sort to name for cols
        direction: sortConfig.direction
    });

    const TableHeader = ({ label, sortKey }) => (
        <th onClick={() => requestSort(sortKey)}>
            {label} {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
        </th>
    );

    const DisplayGames = () => (
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        <TableHeader label="Title" sortKey="title" />
                        <TableHeader label="Platform" sortKey="type" />
                        <TableHeader label="Tags" sortKey="tags" />
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedGames.map(game => (
                        <tr key={game.id} onClick={() => openEditGame(game)}>
                            <td>{game.title}</td>
                            <td><span className="game-type">{game.type}</span></td>
                            <td>
                                <div className="game-tags">
                                    {game.tags ? game.tags.split(',').map((t, i) => (
                                        <span key={i} className="tag">{t.trim()}</span>
                                    )) : null}
                                </div>
                            </td>
                            <td onClick={e => e.stopPropagation()}>
                                <button
                                    className="danger small delete-btn"
                                    onClick={() => handleDeleteGame(game.id)}
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                    {sortedGames.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>No games found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    const DisplayCollections = () => (
        <div className="table-wrapper">
            <table className="data-table">
                <thead>
                    <tr>
                        <TableHeader label="Name" sortKey="name" />
                        <TableHeader label="Games" sortKey="game_count" />
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedCollections.map(col => (
                        <tr key={col.id} onClick={() => openEditCol(col)}>
                            <td>{col.name}</td>
                            <td>{col.games ? col.games.length : 0} games</td>
                            <td onClick={e => e.stopPropagation()} className="actions-cell">
                                <button className="primary small" onClick={() => handleSpin(col.id)}>Spin</button>
                                <button className="small" onClick={() => openEditCol(col)}>Edit</button>
                                <button className="danger small" onClick={() => handleDeleteCollection(col.id)}>Delete</button>
                            </td>
                        </tr>
                    ))}
                    {sortedCollections.length === 0 && (
                        <tr><td colSpan="3" style={{ textAlign: 'center' }}>No collections found.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="page library-page">
            <div className="library-header">
                <div className="tabs">
                    <button
                        className={`tab-btn ${activeTab === 'games' ? 'active' : ''}`}
                        onClick={() => setActiveTab('games')}
                    >
                        Games
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'collections' ? 'active' : ''}`}
                        onClick={() => setActiveTab('collections')}
                    >
                        Collections
                    </button>
                </div>

                <div className="actions">
                    <input
                        type="text"
                        placeholder="Filter..."
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="search-input"
                        style={{ maxWidth: '200px' }}
                    />
                    {activeTab === 'games' ? (
                        <button className="primary" onClick={openAddGame}>+ Add Game</button>
                    ) : (
                        <button className="primary" onClick={openAddCol}>+ New Collection</button>
                    )}
                </div>
            </div>

            <div className="library-content">
                {loading ? <p>Loading...</p> : (
                    activeTab === 'games' ? <DisplayGames /> : <DisplayCollections />
                )}
            </div>

            {/* MODALS */}
            <Modal
                isOpen={isGameModalOpen}
                onClose={() => setIsGameModalOpen(false)}
                title={editingItem ? 'Edit Game' : 'Add New Game'}
            >
                <GameForm
                    initialData={editingItem}
                    onSubmit={editingItem ? handleUpdateGame : handleCreateGame}
                    onCancel={() => setIsGameModalOpen(false)}
                />
            </Modal>

            <Modal
                isOpen={isColModalOpen}
                onClose={() => setIsColModalOpen(false)}
                title={editingItem ? 'Edit Collection' : 'New Collection'}
            >
                <CollectionForm
                    initialData={editingItem}
                    allGames={games}
                    onSubmit={editingItem ? handleUpdateCollection : handleCreateCollection}
                    onCancel={() => setIsColModalOpen(false)}
                />
            </Modal>

        </div>
    );
}
