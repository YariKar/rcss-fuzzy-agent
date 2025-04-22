from actions import Actions
from calculations import Calculations
from processInputData import paramsForCalcPosition
from config import fuzzy_log

class FuzzyAnalysisSystem:

    def __init__(self):

        self.__assumed_know_value = 3
        self.__variables = self.__reset_variables()

    def __reset_variables(self):
        return {
            'ball_knowledge': {
                'known': 0.0,
                'assumed': 0.0,
                'unknown': 0.0
            },
            'pos_knowledge': {
                'known': 0.0,
                'assumed': 0.0,
                'unknown': 0.0
            },
            'ball_distance': {
                'close': 0.0,
                'near': 0.0,
                'far': 0.0
            },
            'team_positioning': {
                'closer': 0.0,
                'equal': 0.0,
                'farther': 0.0
            },
            'gate_possibility': {
                'free': 0.0,
                'partly': 0.0,
                'block': 0.0
            },
            'ball_hold': {
                'free': 0.0,
                'risk': 0.0,
                'block': 0.0
            }
        }

    def __ball_knowledge_mf(self, tick_data: paramsForCalcPosition):
        # Проверяем текущее наличие мяча в arrPlayer
        current_ball = 'b dist' in tick_data.arrPlayer.viewPlayer

        # Если мяч виден сейчас
        if current_ball:
            return {'known': 1.0, 'assumed': 0.0, 'unknown': 0.0}
        else:
            return {'known': 0.0, 'assumed': 0.0, 'unknown': 1.0}

    def __pos_knowledge_mf(self, tick_data: paramsForCalcPosition):
        current_pos = tick_data.absoluteX is not None and tick_data.absoluteY is not None

        if current_pos:
            return {'known': 1.0, 'assumed': 0.0, 'unknown': 0.0}

        last_pos = tick_data.nowPlObj.getLastItem()
        if last_pos and last_pos.absoluteX is not None:
            tact_count = tick_data.nowPlObj.getLength()
            if tact_count <= self.__assumed_know_value:
                decay = 1.0 - (tact_count / self.__assumed_know_value)
                return {'known': 0.0, 'assumed': decay, 'unknown': 1.0 - decay}

        return {'known': 0.0, 'assumed': 0.0, 'unknown': 1.0}

    def __ball_distance_mf(self, tick_data: paramsForCalcPosition):
        CLOSE_MAX = 0.7
        CLOSE_MIN = 1.7
        NEAR_MAX = 25
        NEAR_MIN = 30

        # # Получаем дистанцию до мяча из флагов
        # ball_dist = next((float(flag['dist']) for flag in tick_data.elems['flags']
        #                   if flag['column'] == 'b dist'), None)
        player_pos = {"x": float(tick_data.absoluteX), "y": float(tick_data.absoluteY)}
        ball_pos = {"x": float(tick_data.arrPlayer.mapPlayer["b dist"].x), "y": float(tick_data.arrPlayer.mapPlayer["b dist"].y)}
        ball_dist = Calculations.distance(player_pos, ball_pos)
        log = f"BALL DIST, {player_pos}, {ball_pos}, {ball_dist}"
        # print(log)
        # fuzzy_log.write(log)
        if not ball_dist:
            return {'close': 0.0, 'near': 0.0, 'far': 1.0}

        return {
            'close': Calculations.trapezoid_mf(ball_dist, [0, 0, CLOSE_MAX, CLOSE_MIN]),
            'near': Calculations.trapezoid_mf(ball_dist, [CLOSE_MAX, CLOSE_MIN, NEAR_MAX, NEAR_MIN]),
            'far': Calculations.trapezoid_mf(ball_dist, [NEAR_MAX, NEAR_MIN, 100, 100])
        }

    def __team_positioning_mf(self, tick_data):

        # Находим мяч среди объектов
        ball = None
        for key in tick_data.arrPlayer.mapPlayer:
            if key == 'b dist':
                ball = tick_data.arrPlayer.mapPlayer[key]
                break
        if not ball:
            return {"closer": 0.0, "equal": 0.0, "farther": 0.0}

        # Позиции текущего игрока и мяча
        current_player_pos = {"x": float(tick_data.absoluteX), "y": float(tick_data.absoluteY)}
        ball_pos = {"x": float(ball.x), "y": float(ball.y)}
        self_dist = Calculations.distance(current_player_pos, ball_pos)

        # Собираем игроков своей команды (исключая текущего игрока)
        teammates = []
        team_prefix = f'p "{tick_data.team}"'
        for key, player in tick_data.arrPlayer.mapPlayer.items():
            if key.startswith(team_prefix):
                teammates.append({"x": float(player.x), "y": float(player.y)})

        # Считаем количество игроков ближе к мячу
        closer_count = 0
        for teammate_pos in teammates:
            if Calculations.distance(teammate_pos, ball_pos) < self_dist:
                closer_count += 1

        # Определяем параметры зон
        CLOSER_MAX = 1
        EQUAL_MIN = 1
        EQUAL_MAX = 3
        FARTHER_MIN = 3

        # Определяем сторону и положение мяча
        side = 'l' if tick_data.absoluteX < 0 else 'r'
        ball_x = ball_pos["x"]

        if (side == 'l' and ball_x < -30) or (side == 'r' and ball_x > 30):
            CLOSER_MAX = 3
            EQUAL_MIN = 3
            EQUAL_MAX = 6
            FARTHER_MIN = 6
        return {
            "closer": Calculations.trapezoid_mf(closer_count, [-1, -1, 0, CLOSER_MAX]),
            "equal": Calculations.trapezoid_mf(closer_count, [EQUAL_MIN - 1, EQUAL_MIN, EQUAL_MAX, EQUAL_MAX + 1]),
            "farther": Calculations.trapezoid_mf(closer_count, [FARTHER_MIN - 1, FARTHER_MIN, 11, 11])
        }

    def __gate_possibility_mf(self, tick_data: paramsForCalcPosition):
        # Определение стороны из данных
        side = tick_data.side

        # Целевые флаги для атаки
        target_flags = {
            'l': ['f g r t dist', 'f g r b dist', 'f g r c dist'],
            'r': ['f g l t dist', 'f g l b dist', 'f g l c dist']
        }[side]

        # Сбор видимых флагов ворот
        visible_flags = []
        for flag in tick_data.elems.get('flags', []):
            flag_type = flag['column']
            if flag_type in target_flags:
                # Конвертация полярных координат в декартовы
                angle_rad = Calculations.radian(float(flag['angle']))
                dist = float(flag['dist'])

                # Позиция флага относительно игрока
                rel_x = dist * Calculations.cos(angle_rad)
                rel_y = dist * Calculations.sin(angle_rad)

                # Абсолютные координаты флага
                abs_flag_x = tick_data.absoluteX + rel_x
                abs_flag_y = tick_data.absoluteY + rel_y
                visible_flags.append((abs_flag_x, abs_flag_y))

        # Если флаги не видны
        if not visible_flags:
            return {"free": 0.0, "partly": 0.0, "block": 1.0}

        # Координаты центра ворот противника
        goal_center = {"x": 52.5, "y": 0} if side == 'l' else {"x": -52.5, "y": 0}

        # Позиция игрока в формате словаря
        player_pos = {"x": tick_data.absoluteX, "y": tick_data.absoluteY}

        # Расстояние до ворот с использованием метода класса
        goal_dist = Calculations.distance(player_pos, goal_center)

        # Расчет функций принадлежности
        return {
            "free": Calculations.trapezoid_mf(goal_dist, [0, 0, 19.1, 26]),
            "partly": Calculations.trapezoid_mf(goal_dist, [15, 20, 105, 105]),
            "block": 0.0
        }

    def __ball_hold_mf(self, tick_data: paramsForCalcPosition):
        # Находим мяч среди объектов
        ball = None
        for key in tick_data.arrPlayer.mapPlayer:
            if key == 'b dist':
                ball = tick_data.arrPlayer.mapPlayer[key]
                break
        if not ball:
            return {"free": 0.0, "risk": 0.0, "block": 0.0}

        # Позиция мяча
        ball_pos = {"x": float(ball.x), "y": float(ball.y)}

        # Собираем вражеских игроков (исключая свою команду)
        enemies = []
        enemy_team_prefix = 'p "'  # Общий префикс для игроков
        for key, player in tick_data.arrPlayer.mapPlayer.items():
            # Игроки других команд и не мяч
            if key.startswith(enemy_team_prefix) and tick_data.team not in key:
                enemies.append({"x": float(player.x), "y": float(player.y)})

        # Считаем количество соперников в радиусе 1м от мяча
        near_enemies_count = 0
        for enemy_pos in enemies:
            if Calculations.distance(enemy_pos, ball_pos) <= 4.0:
                near_enemies_count += 1

        # Трапециевидные функции принадлежности
        return {
            "free": Calculations.trapezoid_mf(near_enemies_count, [-1, -0.5, 0.5, 1.0]),
            "risk": Calculations.trapezoid_mf(near_enemies_count, [0.5, 1.0, 2.0, 2.5]),
            "block": Calculations.trapezoid_mf(near_enemies_count, [2.0, 2.5, 11, 11])
        }

    def __calculate_mf(self, tick_data: paramsForCalcPosition):
        self.__variables["ball_knowledge"] = self.__ball_knowledge_mf(tick_data)
        self.__variables["pos_knowledge"] = self.__pos_knowledge_mf(tick_data)
        if self.__variables["ball_knowledge"]["known"] >= 0.7 and self.__variables["pos_knowledge"]["known"] >=0.7:
            self.__variables["ball_distance"] = self.__ball_distance_mf(tick_data)
            self.__variables["team_positioning"] = self.__team_positioning_mf(tick_data)
            self.__variables["gate_possibility"] = self.__gate_possibility_mf(tick_data)
            self.__variables["ball_hold"] = self.__ball_hold_mf(tick_data)

    def __rules_handler(self) -> Actions:
        if self.__variables.get('pos_knowledge', {}).get('unknown', 0) >= 0.8:
            return Actions.SEARCHING.name.lower()

        if self.__variables.get('ball_knowledge', {}).get('unknown', 0) >= 0.8:
            return Actions.DRIBBLING.name.lower()

        if self.__variables.get('ball_knowledge', {}).get('assumed', 0) >= 0.3 or \
                self.__variables.get('pos_knowledge', {}).get('assumed', 0) >= 0.3:
            return self.last_action if hasattr(self, 'last_action') else Actions.DRIBBLING.name.lower()

        # Анализ дистанции до мяча
        ball_distance = self.__variables.get('ball_distance', {})
        team_positioning = self.__variables.get('team_positioning', {})

        if ball_distance.get('far', 0) > 0.8:
            return Actions.DRIBBLING.name.lower()

        if ball_distance.get('near', 0) >= 0.3:
            if team_positioning.get('closer', 0) >= 0.6:
                return Actions.FIGHT.name.lower()
            return Actions.DRIBBLING.name.lower()

        # Анализ возможности удара и контроля мяча
        gate_possibility = self.__variables.get('gate_possibility', {})
        ball_hold = self.__variables.get('ball_hold', {})

        if ball_distance.get('close', 0) >= 0.7:
            if gate_possibility.get('free', 0) >= 0.5:
                return Actions.KICKINGG.name.lower()

            if ball_hold.get('block', 0) >= 0.7:
                return Actions.FIGHT.name.lower()

            if ball_hold.get('risk', 0) >= 0.5:
                return Actions.PASSING.name.lower()

            if ball_hold.get('free', 0) >= 0.5:
                if gate_possibility.get('partly', 0) >= 0.6:
                    return Actions.DRIBBLING.name.lower()
                if gate_possibility.get('block', 0) >= 0.7:
                    return Actions.PASSING.name.lower()

        # Стандартное действие по умолчанию
        return Actions.SEARCHING.name.lower()

    def execute(self, tick_data: paramsForCalcPosition):
        self.__reset_variables()
        self.__calculate_mf(tick_data)
        log = f"MATCH FUNCTIONS, {str(self.__variables)}, {tick_data.time}, {tick_data.team}, {tick_data.side}, " \
              f"{tick_data.number}\n "
        # print(log)
        fuzzy_log.write(log)
        return self.__rules_handler()
        pass
