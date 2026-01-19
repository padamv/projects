const API_URL = '/api';

// State
let allGames = [];
let allCollections = [];
let spinCandidates = new Set();
let createCollectionCandidates = new Set(); // New set for collection creation
let wheelContext = null;
let wheelCanvas = null;
let currentRotation = 0;
let isSpinning = false;

// Router
function router(viewName) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(el => el.classList.remove('active'));

    document.getElementById(`view-${viewName}`).classList.add('active');
    document.getElementById(`nav-${viewName}`).classList.add('active');

    // Refresh data
    if (viewName === 'games') fetchGames();
    if (viewName === 'collections') {
        fetchCollections();
        renderCollectionCreationList(); // Init list
    }
    if (viewName === 'spin') initSpinView();
}

document.addEventListener('DOMContentLoaded', () => {
    fetchGames();
    fetchCollections();
    wheelCanvas = document.getElementById('wheel');
    wheelContext = wheelCanvas.getContext('2d');
});

// --- API ---

async function fetchGames() {
    const res = await fetch(`${API_URL}/games`);
    allGames = await res.json();
    renderGames();
    // Also re-render other lists that depend on games if they are visible
    if (document.getElementById('view-collections').classList.contains('active')) renderCollectionCreationList();
    if (document.getElementById('view-spin').classList.contains('active')) renderSpinCandidates();
}

async function fetchCollections() {
    const res = await fetch(`${API_URL}/collections`);
    allCollections = await res.json();
    renderCollections();
}

async function addGame() {
    const title = document.getElementById('game-title').value;
    const type = document.getElementById('game-type').value;
    const tags = document.getElementById('game-tags').value;

    if (!title) return alert('Title is required');

    await fetch(`${API_URL}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type, tags })
    });

    document.getElementById('game-title').value = '';
    document.getElementById('game-type').value = '';
    document.getElementById('game-tags').value = '';
    fetchGames();
}

async function deleteGame(id) {
    if (!confirm('Delete this game?')) return;
    await fetch(`${API_URL}/games/${id}`, { method: 'DELETE' });
    fetchGames();
}

async function createCollection() {
    const name = document.getElementById('collection-name').value;
    if (!name) return alert('Name required');

    const game_ids = Array.from(createCollectionCandidates);

    await fetch(`${API_URL}/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, game_ids })
    });

    document.getElementById('collection-name').value = '';
    createCollectionCandidates.clear();
    renderCollectionCreationList();
    fetchCollections();
}

async function deleteCollection(id) {
    if (!confirm('Delete this collection?')) return;
    await fetch(`${API_URL}/collections/${id}`, { method: 'DELETE' });
    fetchCollections();
}

// --- Rendering ---

function renderGames() {
    const list = document.getElementById('games-list');
    const filter = document.getElementById('filter-games').value.toLowerCase();

    list.innerHTML = allGames
        .filter(g => g.title.toLowerCase().includes(filter) || g.tags.toLowerCase().includes(filter))
        .map(g => `
            <div class="game-item">
                <button class="danger" style="position:absolute; top:1rem; right:1rem;" onclick="deleteGame(${g.id})">Delete</button>
                <h3>${g.title}</h3>
                <p><strong>${g.type}</strong></p>
                <div class="tags">
                    ${g.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('')}
                </div>
            </div>
        `).join('');
}


function renderCollections() {
    const list = document.getElementById('collections-list');
    list.innerHTML = allCollections.map(c => `
        <div class="collection-item">
            <button class="danger" style="position:absolute; top:1rem; right:1rem;" onclick="deleteCollection(${c.id})">Delete</button>
            <h3>${c.name}</h3>
            <div style="margin-top:0.5rem">
                 <button class="primary" style="font-size:0.8rem; padding:0.4rem 0.8rem;" onclick="setupSpinWithCollection(${c.id})">Spin Collection</button>
            </div>
             <div style="margin-top:1rem; border-top:1px solid #e2e8f0; padding-top:0.5rem;">
                <small style="color:var(--text-secondary)">Includes ${c.games ? c.games.length : 'N/A'} games</small> 
             </div>
        </div>
    `).join('');
}

function renderCollectionCreationList() {
    const container = document.getElementById('create-collection-games');
    const filter = document.getElementById('create-collection-filter').value.toLowerCase();

    container.innerHTML = allGames
        .filter(g => g.title.toLowerCase().includes(filter) || g.tags.toLowerCase().includes(filter))
        .map(g => `
            <div class="game-select-item" onclick="toggleCollectionCandidate(${g.id})">
                <input type="checkbox" id="col-check-${g.id}" 
                    ${createCollectionCandidates.has(g.id) ? 'checked' : ''}
                    style="pointer-events:none;" 
                >
                <div style="flex:1">
                    <label style="pointer-events:none;">${g.title}</label>
                    <div style="font-size:0.75rem; color:var(--text-secondary)">${g.tags}</div>
                </div>
                
            </div>
        `).join('');
}

function toggleCollectionCandidate(id) {
    if (createCollectionCandidates.has(id)) createCollectionCandidates.delete(id);
    else createCollectionCandidates.add(id);
    // Re-render specific checkbox state instead of full list to avoid input focus loss? 
    // Actually full re-render is fine with current filter setup as long as we keep focus.
    // Simpler: just update the checkbox visual.
    const checkbox = document.getElementById(`col-check-${id}`);
    if (checkbox) checkbox.checked = createCollectionCandidates.has(id);
}


// --- Spin Logic ---

function initSpinView() {
    const select = document.getElementById('collection-select');
    select.innerHTML = '<option value="">Load from Collection...</option>' +
        allCollections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

    renderSpinCandidates();
    drawWheel();
}

function renderSpinCandidates() {
    const container = document.getElementById('spin-candidates');
    const filter = document.getElementById('spin-filter').value.toLowerCase();

    container.innerHTML = allGames
        .filter(g => g.title.toLowerCase().includes(filter))
        .map(g => `
             <div class="game-select-item" onclick="toggleSpinCandidate(${g.id})">
                <input type="checkbox" id="spin-check-${g.id}" 
                    ${spinCandidates.has(g.id) ? 'checked' : ''}
                    style="pointer-events:none;"
                >
                <label style="pointer-events:none;">${g.title}</label>
            </div>
        `).join('');
}

function toggleSpinCandidate(id) {
    if (spinCandidates.has(id)) spinCandidates.delete(id);
    else spinCandidates.add(id);
    const checkbox = document.getElementById(`spin-check-${id}`);
    if (checkbox) checkbox.checked = spinCandidates.has(id);
    drawWheel();
}

function selectAllGames() { // Not used in new UI, safe to remove or keep as utility
    allGames.forEach(g => spinCandidates.add(g.id));
    renderSpinCandidates();
    drawWheel();
}

function clearSpinSelection() {
    spinCandidates.clear();
    renderSpinCandidates();
    drawWheel();
}

async function loadCollectionToSpin(colId) {
    if (!colId) return;

    // With SqlModel default settings, relationships might not be fully loaded on the list view 
    // depending on how we fetched it (List[CollectionReadList] vs List[CollectionRead]).
    // The main.py endpoint `read_collections` returns `CollectionReadList` which I defined NOT to have `games`.
    // So we must fetch the single collection details.

    const res = await fetch(`${API_URL}/collections/${colId}`);
    if (res.ok) {
        const col = await res.json();
        spinCandidates.clear();
        // col.games should be present now due to CollectionRead model
        if (col.games) {
            col.games.forEach(g => spinCandidates.add(g.id));
        }
        renderSpinCandidates();
        drawWheel();
    }
}

function setupSpinWithCollection(id) {
    document.getElementById('collection-select').value = id; // This might fail if view not init, but router handles order
    router('spin');
    // Wait for view init? router calls initSpinView.
    // We need to manually trigger the load because Select onchange won't fire.
    // And initSpinView resets the select box options.
    // Solution:
    setTimeout(() => {
        const select = document.getElementById('collection-select');
        if (select) {
            select.value = id;
            loadCollectionToSpin(id);
        }
    }, 100);
}

// Wheel Calculation
function getWheelItems() {
    return allGames.filter(g => spinCandidates.has(g.id)).map(g => g.title);
}

function drawWheel() {
    if (!wheelContext) return;
    const items = getWheelItems();
    const ctx = wheelContext;
    const width = wheelCanvas.width;
    const height = wheelCanvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width / 2 - 20;

    ctx.clearRect(0, 0, width, height);

    if (items.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Select games to spin!', cx, cy);
        return;
    }

    const sliceAngle = (2 * Math.PI) / items.length;
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

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
}

function spinWheel() {
    if (isSpinning) return;
    const items = getWheelItems();
    if (items.length === 0) return alert("Add games first!");

    isSpinning = true;
    document.getElementById('winner-display').innerText = "Spinning...";

    let speed = 0.5 + Math.random() * 0.5;
    let deceleration = 0.005;

    function animate() {
        if (speed <= 0) {
            isSpinning = false;
            determineWinner(items);
            return;
        }

        currentRotation += speed;
        speed -= deceleration;

        if (currentRotation > 2 * Math.PI) currentRotation -= 2 * Math.PI;

        drawWheel();
        requestAnimationFrame(animate);
    }

    animate();
}

function determineWinner(items) {
    const sliceAngle = (2 * Math.PI) / items.length;
    let effectiveAngle = (2 * Math.PI - (currentRotation % (2 * Math.PI))) % (2 * Math.PI);
    let index = Math.floor(effectiveAngle / sliceAngle);

    // Safety check for index
    index = (items.length - 1) - index; // Canvas rotation direction adjustment if needed? 
    // Actually, let's keep previous logic:
    // Angle 0 is at right. Rotation is clockwise.
    // If rotation is small, index 0 (0 to sliceAngle) is at bottom/right.
    // Let's stick to the simple math:
    // We calculated effective angle 0..2PI.
    // We divided by sliceAngle to get index.
    // This assumes items are drawn clockwise. Valid.

    // But wait, my arrow is at 0 degrees (Right).
    // The items rotated `currentRotation` clockwise.
    // So item 0 started at 0..sliceAngle. Now it is at `currentRotation`..`currentRotation+slice`.
    // We want item at 0.
    // So we need `Start + currentRotation <= 2PI < End + currentRotation` (wrapping).
    // Or simpler: We want to know which slot is at angle 0.
    // Slot i occupies [i*slice + rot, (i+1)*slice + rot].
    // We want to find i such that 0 is in that interval (modulo 2PI).
    // 0 = i*slice + rot => i*slice = -rot => i = -rot / slice.
    // normalize negative rot to positive.

    let normalizedRot = currentRotation % (2 * Math.PI);
    let angleFromStart = (2 * Math.PI - normalizedRot) % (2 * Math.PI);
    let winningIndex = Math.floor(angleFromStart / sliceAngle);

    const winner = items[winningIndex];
    document.getElementById('winner-display').innerText = `Winner: ${winner} !`;
}
