from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from app.database import init_db, get_session
from app.models import Game, Collection, CollectionGameLink, GameRead, CollectionRead, CollectionReadList, CollectionCreate, CollectionUpdate
from app.backup import create_backup, restore_latest_backup

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_db()
        # Optional: Auto-restore on startup? User didn't specify, but implies "import the data".
        # Let's add a manual endpoint or just log it.
        # restore_latest_backup() 
    except Exception as e:
        print(f"Startup error: {e}")
    yield
    # Shutdown
    print("Shutting down... creating backup.")
    create_backup()

app = FastAPI(lifespan=lifespan)

# CORS for React Frontend (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files (Frontend)
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

# API Routes

# --- Games ---
@app.get("/api/games", response_model=List[GameRead])
def read_games(session: Session = Depends(get_session)):
    games = session.exec(select(Game)).all()
    return games

@app.post("/api/games", response_model=GameRead)
def create_game(game: Game, session: Session = Depends(get_session)):
    session.add(game)
    session.commit()
    session.refresh(game)
    return game

@app.put("/api/games/{game_id}", response_model=GameRead)
def update_game(game_id: int, game_data: Game, session: Session = Depends(get_session)):
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    game.title = game_data.title
    game.type = game_data.type
    game.tags = game_data.tags
    session.add(game)
    session.commit()
    session.refresh(game)
    return game

@app.delete("/api/games/{game_id}")
def delete_game(game_id: int, session: Session = Depends(get_session)):
    game = session.get(Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    session.delete(game)
    session.commit()
    return {"ok": True}

# --- Collections ---
@app.get("/api/collections", response_model=List[CollectionReadList])
def read_collections(session: Session = Depends(get_session)):
    # Eager load games for collections
    # Using sqlalchemy options for eager loading might be needed if response_model expects nested games
    # But for now, simple list. Note: SQLModel defaults relationships to Lazy.
    # To return games in collection, we need to update model or use a Read model.
    # For MVP, let's keep it simple. If frontend needs games in collection, we can fetch them.
    collections = session.exec(select(Collection)).all()
    return collections

@app.get("/api/collections/{collection_id}", response_model=CollectionRead)
def read_collection(collection_id: int, session: Session = Depends(get_session)):
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection

@app.post("/api/collections", response_model=CollectionReadList)
def create_collection(collection_data: CollectionCreate, session: Session = Depends(get_session)):
    # Create collection
    db_collection = Collection(name=collection_data.name)
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)
    
    # Add games
    if collection_data.game_ids:
        for gid in collection_data.game_ids:
            link = CollectionGameLink(collection_id=db_collection.id, game_id=gid)
            session.add(link)
        session.commit()
        
    return db_collection

@app.put("/api/collections/{collection_id}", response_model=CollectionRead)
def update_collection(collection_id: int, collection_data: CollectionUpdate, session: Session = Depends(get_session)):
    db_collection = session.get(Collection, collection_id)
    if not db_collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Update properties
    db_collection.name = collection_data.name
    session.add(db_collection)
    
    # Sync Games
    # Get current game IDs
    current_links = session.exec(
        select(CollectionGameLink).where(CollectionGameLink.collection_id == collection_id)
    ).all()
    current_game_ids = {link.game_id for link in current_links}
    new_game_ids = set(collection_data.game_ids)
    
    # 1. Remove games not in new list
    for link in current_links:
        if link.game_id not in new_game_ids:
            session.delete(link)
            
    # 2. Add games in new list but not in current
    for gid in new_game_ids:
        if gid not in current_game_ids:
            link = CollectionGameLink(collection_id=collection_id, game_id=gid)
            session.add(link)
    
    session.commit()
    session.refresh(db_collection)
    return db_collection

@app.delete("/api/collections/{collection_id}")
def delete_collection(collection_id: int, session: Session = Depends(get_session)):
    collection = session.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    session.delete(collection)
    session.commit()
    return {"ok": True}

@app.post("/api/collections/{collection_id}/games/{game_id}")
def add_game_to_collection(collection_id: int, game_id: int, session: Session = Depends(get_session)):
    # Check existence
    collection = session.get(Collection, collection_id)
    game = session.get(Game, game_id)
    if not collection or not game:
        raise HTTPException(status_code=404, detail="Not found")
    
    link = CollectionGameLink(collection_id=collection_id, game_id=game_id)
    session.add(link)
    try:
        session.commit()
    except Exception:
        session.rollback() # Likely duplicate
    return {"ok": True}

@app.delete("/api/collections/{collection_id}/games/{game_id}")
def remove_game_from_collection(collection_id: int, game_id: int, session: Session = Depends(get_session)):
    link = session.exec(
        select(CollectionGameLink)
        .where(CollectionGameLink.collection_id == collection_id)
        .where(CollectionGameLink.game_id == game_id)
    ).first()
    
    if link:
        session.delete(link)
        session.commit()
    return {"ok": True}

# --- System ---
@app.post("/api/system/restore")
def trigger_restore():
    restore_latest_backup()
    return {"status": "Restored latest backup"}

@app.get("/")
def read_root():
    return {"message": "Go to /static/index.html"}
