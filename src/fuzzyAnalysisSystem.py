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
        print(log)
        fuzzy_log.write(log)
        if not ball_dist:
            return {'close': 0.0, 'near': 0.0, 'far': 1.0}

        return {
            'close': Calculations.trapezoid_mf(ball_dist, [0, 0, CLOSE_MAX, CLOSE_MIN]),
            'near': Calculations.trapezoid_mf(ball_dist, [CLOSE_MAX, CLOSE_MIN, NEAR_MAX, NEAR_MIN]),
            'far': Calculations.trapezoid_mf(ball_dist, [NEAR_MAX, NEAR_MIN, 100, 100])
        }

    def __team_positioning_mf(self, tick_data: paramsForCalcPosition):
        pass

    def __gate_possibility_mf(self, tick_data: paramsForCalcPosition):
        pass

    def __ball_hold_mf(self, tick_data: paramsForCalcPosition):
        pass

    def __calculate_mf(self, tick_data: paramsForCalcPosition):
        self.__variables["ball_knowledge"] = self.__ball_knowledge_mf(tick_data)
        self.__variables["pos_knowledge"] = self.__pos_knowledge_mf(tick_data)
        if self.__variables["ball_knowledge"]["known"] >= 0.7 and self.__variables["pos_knowledge"]["known"] >=0.7:
            self.__variables["ball_distance"] = self.__ball_distance_mf(tick_data)
            self.__team_positioning_mf(tick_data)
            self.__gate_possibility_mf(tick_data)
            self.__ball_hold_mf(tick_data)

    def __rules_handler(self, tick_data: paramsForCalcPosition):
        pass

    def execute(self, tick_data: paramsForCalcPosition):
        self.__reset_variables()
        self.__calculate_mf(tick_data)
        log = f"MATCH FUNCTIONS, {str(self.__variables)}"
        print(log)
        fuzzy_log.write(log)
        action = self.__rules_handler(tick_data)
        pass
