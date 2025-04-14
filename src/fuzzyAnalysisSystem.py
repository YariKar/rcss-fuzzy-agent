from actions import Actions
from calculations import Calculations
from processInputData import paramsForCalcPosition

class FuzzyAnalysisSystem:

    def __init__(self):
        self.variables = self.reset_variables()

    def reset_variables(self):
        return {
            'ballKnowledge': {
                'known': 0,
                'assumed': 0,
                'unknown': 0
            },
            'posKnowledge': {
                'known': 0,
                'assumed': 0,
                'unknown': 0
            },
            'ballDistance': {
                'close': 0,
                'near': 0,
                'far': 0
            },
            'teamPositioning': {
                'closer': 0,
                'equal': 0,
                'farther': 0
            },
            'gatePossibility': {
                'free': 0,
                'partly': 0,
                'block': 0
            },
            'ballHold': {
                'free': 0,
                'risk': 0,
                'block': 0
            }
        }

    def ball_knowledge_mf(self, tick_data: paramsForCalcPosition):
        pass

    def execute(self, tick_data: paramsForCalcPosition):
        self.reset_variables()
        pass
