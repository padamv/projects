import json
import os
from datetime import datetime
from sqlmodel import Session, select
from app.database import engine
from app.models import Game, Collection, CollectionGameLink

BACKUP_DIR = "backups"

def create_backup():
    if not os.path.exists(BACKUP_DIR):
        os.makedirs(BACKUP_DIR)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{BACKUP_DIR}/backup_{timestamp}.json"
    
    data = {"games": [], "collections": [], "links": []}
    
    with Session(engine) as session:
        games = session.exec(select(Game)).all()
        for game in games:
            data["games"].append(game.model_dump())
            
        collections = session.exec(select(Collection)).all()
        for col in collections:
            data["collections"].append(col.model_dump())
            
        links = session.exec(select(CollectionGameLink)).all()
        for link in links:
            data["links"].append(link.model_dump())
            
    with open(filename, "w") as f:
        json.dump(data, f, indent=4)
    
    print(f"Backup created: {filename}")

def restore_latest_backup():
    if not os.path.exists(BACKUP_DIR):
        print("No backup directory found.")
        return
        
    files = [f for f in os.listdir(BACKUP_DIR) if f.endswith(".json")]
    if not files:
        print("No backup files found.")
        return
        
    latest_file = max(files, key=lambda f: os.path.getctime(os.path.join(BACKUP_DIR, f)))
    filepath = os.path.join(BACKUP_DIR, latest_file)
    
    print(f"Restoring from: {filepath}")
    
    with open(filepath, "r") as f:
        data = json.load(f)
        
    with Session(engine) as session:
        # Clear existing data
        session.exec(select(CollectionGameLink)).all() # logic to delete needed
        # Simple truncate/delete all approach for MVP
        session.query(CollectionGameLink).delete()
        session.query(Game).delete()
        session.query(Collection).delete()
        
        # Re-insert
        for g_data in data["games"]:
            session.add(Game(**g_data))
        
        for c_data in data["collections"]:
            session.add(Collection(**c_data))
            
        session.commit() # Commit parents first
        
        for l_data in data["links"]:
            session.add(CollectionGameLink(**l_data))
            
        session.commit()
    
    print("Restore complete.")
