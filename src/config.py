Flags = {
  'ftl50': {'x': -50, 'y': 39}, 'ftl40': {'x': -40, 'y': 39},
  'ftl30': {'x': -30, 'y': 39}, 'ftl20': {'x': -20, 'y': 39},
  'ftl10': {'x': -10, 'y': 39}, 'ft0': {'x': 0, 'y': 39},
  'ftr10': {'x': 10, 'y': 39}, 'ftr20': {'x': 20, 'y': 39},
  'ftr30': {'x': 30, 'y': 39}, 'ftr40': {'x': 40, 'y': 39},
  'ftr50': {'x': 50, 'y': 39}, 'fbl50': {'x': -50, 'y': -39},
  'fbl40': {'x': -40, 'y': -39}, 'fbl30': {'x': -30, 'y': -39},
  'fbl20': {'x': -20, 'y': -39}, 'fbl10': {'x': -10, 'y': -39},
  'fb0': {'x': 0, 'y': -39}, 'fbr10': {'x': 10, 'y': -39},
  'fbr20': {'x': 20, 'y': -39}, 'fbr30': {'x': 30, 'y': -39},
  'fbr40': {'x': 40, 'y': -39}, 'fbr50': {'x': 50, 'y': -39},
  'flt30': {'x':-57.5, 'y': 30}, 'flt20': {'x':-57.5, 'y': 20},
  'flt10': {'x':-57.5, 'y': 10}, 'fl0': {'x':-57.5, 'y': 0},
  'flb10': {'x':-57.5, 'y': -10}, 'flb20': {'x':-57.5, 'y': -20},
  'flb30': {'x':-57.5, 'y': -30}, 'frt30': {'x': 57.5, 'y': 30},
  'frt20': {'x': 57.5, 'y': 20}, 'frt10': {'x': 57.5, 'y': 10},
  'fr0': {'x': 57.5, 'y': 0}, 'frb10': {'x': 57.5, 'y': -10},
  'frb20': {'x': 57.5, 'y': -20}, 'frb30': {'x': 57.5, 'y': -30},
  'fglt': {'x':-52.5, 'y': 7.01}, 'fglb': {'x':-52.5, 'y':-7.01},
  'gl': {'x':-52.5, 'y': 0}, 'gr': {'x': 52.5, 'y': 0}, 'fc': {'x': 0, 'y': 0},
  'fplt': {'x': -36, 'y': 20.15}, 'fplc': {'x': -36, 'y': 0},
  'fplb': {'x': -36, 'y':-20.15}, 'fgrt': {'x': 52.5, 'y': 7.01},
  'fgrb': {'x': 52.5, 'y':-7.01}, 'fprt': {'x': 36, 'y': 20.15},
  'fprc': {'x': 36, 'y': 0}, 'fprb': {'x': 36, 'y':-20.15},
  'flt': {'x':-52.5, 'y': 34}, 'fct': {'x': 0, 'y': 34},
  'frt': {'x': 52.5, 'y': 34}, 'flb': {'x':-52.5, 'y': -34},
  'fcb': {'x': 0, 'y': -34}, 'frb': {'x': 52.5, 'y': -34},
}
# , 'expectation', 'variance'
resultColumn = ['time', 'player', 'calc x', 'calc y', 'absolute x', 'absolute y','differenceX', 'differenceY']
resultStatisticColumn = ['player', 'expectationX','expectationY', 'varianceX', 'varianceY']
resultPredictColumn = ['timeNow', 'player','viewFrom', 'nowX', 'nowY', 'nowAbsoluneX', 'nowAbsoluneY', 'predictX', 'predictY', 'predictAbsoluneX', 'predictAbsoluneY', 'nowDiffX', 'nowDiffY', 'predictDiffX', 'predictDiffY','predictVarianceX','predictVarianceY','startPredictX','startPredictY']
movementsTenTick = ['typeCoord', 'maxValue', 'maxValueX', 'maxValueY', 'midValue', 'midValueX', 'midValueY']
teams = ['Gliders2016', 'HELIOS2016']
sides = {"Gliders2016": ["l", "r"], "HELIOS2016": ["r", "l"]}
pathDefault = r'E:\My_Programs\study\degree_bak\rcss-fuzzy-agent\example_csv\\'
# pathDefault = 'C:\qualifyingWork\helios2017-vs-oxsy2017\\'
prefixFiles = '20170904132709-Gliders2016_0-vs-HELIOS2016_0-'
numberTeamGoalie = [1, 1]
numPeople = 11
log_path = r'E:\My_Programs\study\degree_bak\rcss-fuzzy-agent\logs\\'
time_log = open(log_path+"time.txt", "w")
row_log = open(log_path+"row.txt", "w")
result_log = open(log_path+"result.txt", "w")
ans_log = open(log_path+"ans.txt", "w")
fuzzy_log = open(log_path + "fuzzy.txt", "w")
predicate_log = open(log_path + "predicate.txt", "w")
compare_log = open(log_path + "compare.txt", "w")
server_actions_pattern = '-action-groundtruth-v3.csv'
