from collections import deque
import numpy as np


class PosPlayer:
    def __init__(self, x, y, angle):
        self.x = x
        self.y = y
        self.angle = angle

    def __str__(self):
        return (
            f"x = {self.x}, y = {self.y}, angle = {self.angle}"
        )


class OtherPlayer:
    def __init__(self):
        self.viewPlayer = []
        self.mapPlayer = {}

    def add_new_view_player(self, playerName, posPlayer):
        self.viewPlayer.append(playerName)
        self.mapPlayer[playerName] = posPlayer

    def __str__(self):
        map_player_content = "\n".join(
            [f"    {k}: {v}" for k, v in self.mapPlayer.items()]
        )
        return (
            f"otherPlayer:\n"
            f"  viewPlayer: {self.viewPlayer}\n"
            f"  mapPlayer:\n{map_player_content}"
        )


class InfoForTick:
    def __init__(self, x, y, absX, absY, angle, speedX, speedY, otherPlayers):
        self.x = x
        self.y = y
        self.absX = absX
        self.absY = absY
        self.angle = angle
        self.speedX = speedX
        self.speedY = speedY
        self.Players = otherPlayers

    def __str__(self):
        return (
            f"x = {self.x}, y = {self.y} absX = {self.absX}, absY = {self.absY}, angle = {self.angle},"
            f" speedX = {self.speedX}, speedY = {self.speedY}\n"
            f"players: {self.Players}"
        )


class StoreAgent:
    def __init__(self):
        self.storeCoord = deque([], maxlen=5)
        self.removePlayer = {}

    def add_new_tick_info(self, newInfo):
        if (len(self.storeCoord) < self.storeCoord.maxlen):
            self.storeCoord.append(newInfo)
        else:
            self.storeCoord.popleft()
            self.storeCoord.append(newInfo)
        for elems in newInfo.Players.viewPlayer:
            if elems in self.removePlayer:
                del self.removePlayer[elems]
        lenName = []
        for elems in self.removePlayer:
            lenName.append(elems)
        for elems in lenName:
            if len(self.removePlayer[elems]) > 10:
                del self.removePlayer[elems]

    def get_last_item(self):
        return self.storeCoord[len(self.storeCoord) - 1] if len(self.storeCoord) > 0 else None

    def get_item_at(self, index):
        if len(self.storeCoord) <= 0:
            return None
        if index >= len(self.storeCoord) and index < 0:
            return None
        return self.storeCoord[index]

    def get_length(self):
        return len(self.storeCoord)

    def remove_list(self):
        remove = []
        if (len(self.storeCoord) > 3):
            current = self.storeCoord[len(self.storeCoord) - 2].Players.viewPlayer
            target = self.storeCoord[len(self.storeCoord) - 1].Players.viewPlayer
            intersection = set(current) & set(target)
            for i in current:
                if i not in intersection:
                    self.removePlayer[i] = []
            for key in self.removePlayer:
                remove.append(key)
        return remove

    def predict_for_disappeared_player(self, disappearedArray):
        predict_coordinate = []
        for elem in disappearedArray:
            met_pos = []
            size_more_predict = 1
            for pos in self.storeCoord:
                if elem in pos.Players.viewPlayer:
                    met_pos.append(pos.Players.mapPlayer[elem])
            if elem in self.removePlayer:
                met_pos = np.concatenate((met_pos, self.removePlayer[elem]))
                if len(self.removePlayer[elem]) > 0:
                    size_more_predict = len(self.removePlayer[elem]) + 1
            # print('met_pos len', len(met_pos))
            if len(met_pos) > 1:
                length = len(met_pos)
                angle_flag = int(met_pos[length - 1].angle)
                radian = (angle_flag if angle_flag > 0 else 360 + angle_flag) / (2 * np.pi)
                # print('predict radian', radian)

                speed_x = np.abs(met_pos[length - 1].x) - np.abs(met_pos[length - 2].x)
                speed_y = np.abs(met_pos[length - 1].y) - np.abs(met_pos[length - 2].y)
                # # Третье состояние
                # speed_x = np.abs(met_pos[length-1].x) - np.abs(met_pos[length-2].x)
                # speed_y = np.abs(met_pos[length-1].y) - np.abs(met_pos[length-2].y)
                # speedSecondX = np.abs(met_pos[length - 2].x) - np.abs(met_pos[length - 3].x)
                # speedSecondY = np.abs(met_pos[length - 2].y) - np.abs(met_pos[length - 3].y)
                # accelerationForX = speed_x - speedSecondX
                # accelerationForY = speed_y - speedSecondY
                # # Вычисление нового состояния с использованием ускорения
                # predict_x = met_pos[length-1].x + speedSecondX * np.cos(radian) + accelerationForX/2 * np.cos(radian)
                # predict_y = met_pos[length-1].y + speedSecondY * np.sin(radian) + accelerationForY/2 * np.sin(radian)
                # # Вычисление усреднённой скорости
                # predict_x = met_pos[length-1].x + (speed_x+speedSecondX)/2 * np.cos(radian)
                # predict_y = met_pos[length-1].y + (speed_y+speedSecondY)/2 * np.sin(radian)
                predict_x = met_pos[length - 1].x + speed_x * np.cos(radian)
                predict_y = met_pos[length - 1].y + speed_y * np.sin(radian)
                predict_coordinate.append({
                    'name': elem,
                    'x': predict_x,
                    'y': predict_y,
                    'beforeX': met_pos[length - 1].x,
                    'beforeY': met_pos[length - 1].y,
                    'angle': met_pos[length - 1].angle,
                    'predictTick': size_more_predict
                })
        # print('predict_coordinate', predict_coordinate)
        return predict_coordinate

    def save_predict_coords(self, predict_coordinate):
        for pred in predict_coordinate:
            self.removePlayer[pred['name']].append(PosPlayer(pred['x'], pred['y'], pred['angle']))

    def __str__(self):
        # Форматирование storeCoord
        store_coord_content = "\n".join(
            [f"    [{i}] {item}" for i, item in enumerate(self.storeCoord)]
        )

        # Форматирование removePlayer с вложенными PosPlayer
        remove_player_content = []
        for k, v in self.removePlayer.items():
            players_list = "\n".join(
                [f"      • {str(player)}" for player in v]
            )
            remove_player_content.append(f"    {k} [count: {len(v)}]:\n{players_list}")

        return (
                f"storeAgent:\n"
                f"  storeCoord ({len(self.storeCoord)}):\n{store_coord_content}\n"
                f"  removePlayer ({len(self.removePlayer)}):\n" +
                "\n".join(remove_player_content)
        )
