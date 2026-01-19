import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './Spin.css';

export default function Spin() {
    const [searchParams] = useSearchParams();
    const initialColId = searchParams.get('collection');

    const canvasRef = useRef(null);
    const [allGames, setAllGames] = useState([]);
    const [collections, setCollections] = useState([]);

    const [selectedCollectionId, setSelectedCollectionId] = useState(initialColId || '');
    const [candidates, setCandidates] = useState(new Set()); // Set of Game IDs (integers)
    const [filter, setFilter] = useState('');

    const [winner, setWinner] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);

    // Animation state (refs for mutable access inside loop)
    const rotationRef = useRef(0);
    const requestRef = useRef();
    const speedRef = useRef(0);

    // Fetch initial data
    useEffect(() => {
        Promise.all([
            fetch('/api/games').then(r => r.json()),
            fetch('/api/collections').then(r => r.json())
        ]).then(([gData, cData]) => {
            setAllGames(gData);
            setCollections(cData);
        });
    }, []);

    // Load collection games when ID changes
    useEffect(() => {
        if (!selectedCollectionId) return;

        // Fetch detailed collection to get games
        fetch(`/api/collections/${selectedCollectionId}`)
            .then(r => r.json())
            .then(col => {
                if (col.games) {
                    setCandidates(new Set(col.games.map(g => g.id)));
                }
            })
            .catch(console.error);
    }, [selectedCollectionId]);

    // Draw wheel whenever candidates change
    useEffect(() => {
        drawWheel();
    }, [candidates, allGames]); // drawWheel depends on candidates and game titles lookup

    const toggleCandidate = (id) => {
        const next = new Set(candidates);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setCandidates(next);
    };

    const getWheelItems = () => {
        return allGames.filter(g => candidates.has(g.id)).map(g => g.title);
    };

    const drawWheel = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Dynamic resizing
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, container.clientHeight || 500, 500); // Max 500
        // Set actual canvas size (high DPI)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const width = size;
        const height = size;
        const cx = width / 2;
        const cy = height / 2;
        const radius = width / 2 - 20;

        const items = getWheelItems();

        ctx.clearRect(0, 0, width, height);

        // ... (rest of drawing logic)

        if (items.length === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '20px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Select games to spin!', cx, cy);
            return;
        }

        const sliceAngle = (2 * Math.PI) / items.length;
        const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
        const currentRotation = rotationRef.current;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(currentRotation);

        items.forEach((item, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = (i + 1) * sliceAngle;

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.closePath();

            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.save();
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px Inter';
            ctx.textAlign = 'right';
            ctx.fillText(item.length > 15 ? item.substring(0, 14) + '..' : item, radius - 20, 5);
            ctx.restore();
        });

        ctx.restore();

        // Pointer
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(cx + radius + 10, cy);
        ctx.lineTo(cx + radius - 10, cy - 10);
        ctx.lineTo(cx + radius - 10, cy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    const spin = () => {
        const items = getWheelItems();
        if (items.length === 0 || isSpinning) return;

        setIsSpinning(true);
        setWinner(null);
        speedRef.current = 0.5 + Math.random() * 0.5;

        animate();
    };

    const animate = () => {
        if (speedRef.current <= 0) {
            setIsSpinning(false);
            determineWinner();
            return;
        }

        rotationRef.current += speedRef.current;
        speedRef.current -= 0.005; // Deceleration
        if (rotationRef.current > 2 * Math.PI) rotationRef.current -= 2 * Math.PI;

        drawWheel();
        requestRef.current = requestAnimationFrame(animate);
    };

    const determineWinner = () => {
        const items = getWheelItems();
        const sliceAngle = (2 * Math.PI) / items.length;
        const currentRotation = rotationRef.current;

        let normalizedRot = currentRotation % (2 * Math.PI);
        let angleFromStart = (2 * Math.PI - normalizedRot) % (2 * Math.PI);
        let winningIndex = Math.floor(angleFromStart / sliceAngle);

        // Safety clamp
        if (winningIndex < 0) winningIndex = 0;
        if (winningIndex >= items.length) winningIndex = items.length - 1;

        setWinner(items[winningIndex]);
    };

    // Cleanup animation
    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const filteredGamesList = allGames.filter(g =>
        g.title.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="page spin-page">
            <h1>Spin the Wheel</h1>

            <div className="spin-layout">
                <div className="wheel-container">
                    <canvas
                        ref={canvasRef}
                        className="wheel-canvas"
                    />
                    {winner && (
                        <div className="winner-overlay">
                            <h2>Winner!</h2>
                            <div className="winner-name">{winner}</div>
                            <button onClick={() => setWinner(null)}>Dismiss</button>
                        </div>
                    )}
                </div>

                <div className="spin-controls card">
                    <div className="control-group">
                        <label>Load Collection:</label>
                        <select
                            value={selectedCollectionId}
                            onChange={e => setSelectedCollectionId(e.target.value)}
                        >
                            <option value="">-- Select Collection --</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="game-checklist">
                        <input
                            type="text"
                            placeholder="Filter candidates..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                            className="filter-input"
                        />
                        <div className="checklist-scroll">
                            {filteredGamesList.map(g => (
                                <div
                                    key={g.id}
                                    className={`checklist-item ${candidates.has(g.id) ? 'active' : ''}`}
                                    onClick={() => toggleCandidate(g.id)}
                                >
                                    <input
                                        type="checkbox"
                                        checked={candidates.has(g.id)}
                                        readOnly
                                    />
                                    <span>{g.title}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        className="primary big-btn"
                        onClick={spin}
                        disabled={isSpinning || candidates.size === 0}
                    >
                        {isSpinning ? 'Spinning...' : 'SPIN!'}
                    </button>
                </div>
            </div>
        </div>
    );
}
