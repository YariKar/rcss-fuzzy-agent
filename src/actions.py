from enum import Enum


class Actions(Enum):
    SEARCHING = "searching",
    PASSING = "passing",
    DRIBBLING = "dribbling",
    FIGHT = "fight",
    KICKING = "kicking"


print(Actions.SEARCHING.name.lower())
