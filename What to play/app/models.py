from typing import List, Optional, ForwardRef
from sqlmodel import Field, Relationship, SQLModel

# Forward references
CollectionRead = ForwardRef("CollectionRead")
GameRead = ForwardRef("GameRead")

class CollectionGameLink(SQLModel, table=True):
    collection_id: Optional[int] = Field(default=None, foreign_key="collection.id", primary_key=True)
    game_id: Optional[int] = Field(default=None, foreign_key="game.id", primary_key=True)

class GameBase(SQLModel):
    title: str
    type: str
    tags: str

class Game(GameBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    collections: List["Collection"] = Relationship(back_populates="games", link_model=CollectionGameLink)

class GameRead(GameBase):
    id: int

class CollectionBase(SQLModel):
    name: str

class Collection(CollectionBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    games: List[Game] = Relationship(back_populates="collections", link_model=CollectionGameLink)

class CollectionCreate(CollectionBase):
    game_ids: List[int] = []

class CollectionUpdate(CollectionBase):
    game_ids: List[int] = []

class CollectionRead(CollectionBase):
    id: int
    games: List[GameRead] = []

class CollectionReadList(CollectionBase):
    id: int
