from config import resultColumn, resultStatisticColumn, resultPredictColumn, numPeople, time_log, result_log, row_log, \
    ans_log, fuzzy_log, sides, predicate_log, compare_log
from getCoords import *
from saveModule import InfoForTick, StoreAgent
from random import randint
from processInputData import read_file, create_map_view_flag, create_map_view_move, \
    calc_info_for_tick, ParamsForCalcPosition, create_data_tick_with_predict_val, ParamsForDataTickWithPredictVal, \
    parse_groundtruth_file, ActionInfo
from fuzzyAnalysisSystem import FuzzyAnalysisSystem

resFlagsTeam = {}
resMovTeam = {}
resProcessTeam = {}
resMovePTeam = {}
resMoveBTeam = {}
predictObj = {}
playerList = {}
entropyName = randint(1000, 100000)

resultDataForPrint = pd.DataFrame(columns=['distName', 'predictTick', 'maxDiff'])
resultDataForPrintVariance = pd.DataFrame(columns=['distName', 'predictTick', 'maxVariance'])

resultDataForPrintBall = pd.DataFrame(columns=['distName', 'predictTick', 'maxDiff'])
resultDataForPrintVarianceBall = pd.DataFrame(columns=['distName', 'predictTick', 'maxVariance'])

resultDF = pd.DataFrame(columns=resultColumn)
resultStatisticDF = pd.DataFrame(columns=resultStatisticColumn)
resultPredictStatisticLessTwoDF = pd.DataFrame(columns=resultStatisticColumn)
resultPredictStatisticFromTwoToFiveDF = pd.DataFrame(columns=resultStatisticColumn)
resultPredictStatisticMoreFiveDF = pd.DataFrame(columns=resultStatisticColumn)
resultPredictLessTwoDF = pd.DataFrame(columns=resultPredictColumn)
resultPredictFromTwoToFiveDF = pd.DataFrame(columns=resultPredictColumn)
resultPredictMoreFiveDF = pd.DataFrame(columns=resultPredictColumn)

resultPredictLessTwoBallDF = pd.DataFrame(columns=resultPredictColumn)
resultPredictFromTwoToFiveBallDF = pd.DataFrame(columns=resultPredictColumn)
resultPredictMoreFiveBallDF = pd.DataFrame(columns=resultPredictColumn)

averageCoordArrayGlobal = []
absoluteCoordArrayGlobal = []
averageCoordArrayGlobalGoalie = []
absoluteCoordArrayGlobalGoalie = []

readData = read_file(resFlagsTeam, resMovTeam)
resFlagsTeam = readData['resFlags']
resMovTeam = readData['resMov']

resProcessTeam = create_map_view_flag(resProcessTeam, resFlagsTeam)

dataViewMap = create_map_view_move(resMovePTeam, resMoveBTeam, resMovTeam)
resMovePTeam = dataViewMap['resMoveP']
resMoveBTeam = dataViewMap['resMoveB']

fuzzySystem = FuzzyAnalysisSystem()

server_results = parse_groundtruth_file()
predicated_actions = {}
# print(server_results)

for item in teams:
    print('team - ', item)
    playerList[item] = {}
    for ind in range(numPeople):
        # if ind > 6:  # TODO for debug
        #     break
        print('player', ind)
        playerList[item][(ind + 1)] = StoreAgent()
        varianceArray = []
        absoluteCoordArray = []
        playerName = None
        difference = []
        angleOrientation = None
        angleFlag = None
        valueLackFlag = 0
        for elems in resProcessTeam[item][(ind + 1)]:
            # if elems['time'] > 100:  # TODO for debug
            #     break
            # print('time - ', elems['time'], item, ind)
            time_log.write('time - ' + str(elems['time']) + " " + str(item) + " " + str(ind) + "\n")

            nowPlObj = playerList[item][(ind + 1)]
            # timeRow = absolute_Coordinate[absolute_Coordinate['# time'] == elems['time']]
            absoluteCoord = get_absoluted_coordinate(item, (ind + 1), elems['time'], angleOrientation, False)
            if (absoluteCoord == None):
                continue

            angleOrientation = absoluteCoord.angleFlag
            angleFlag = absoluteCoord.angleOrientation
            nowPlayer = absoluteCoord.nowPlayer
            playerName = absoluteCoord.nowPlayer
            absoluteX = absoluteCoord.absoluteX
            absoluteY = absoluteCoord.absoluteY

            absoluteCoordArray.append({'x': absoluteX, 'y': absoluteY})
            paramsTick = ParamsForCalcPosition(elems, nowPlObj, angleOrientation,
                                               valueLackFlag, varianceArray, angleFlag, absoluteX, absoluteY)
            ansInfoForTick = calc_info_for_tick(paramsTick, resMovePTeam, item, ind, absoluteCoordArray)
            if ansInfoForTick is None:
                continue
            ansInfoForTick.time = elems["time"]
            if elems["time"] < 3000:
                ansInfoForTick.side = sides[ansInfoForTick.team][0]
            else:
                ansInfoForTick.side = sides[ansInfoForTick.team][1]
            ansInfoForTick.search_side = sides[ansInfoForTick.team][0]
            ansInfoForTick.number = ind + 1
            # print("ans info for tick - ", str(ansInfoForTick))
            ans_log.write(str(ansInfoForTick))

            action, seen_enemies_count, seen_teammates_count = fuzzySystem.execute(ansInfoForTick)
            # print('action: ', elems['time'], item, ind, ansInfoForTick.side, action.value)
            key = f"{elems['time']}{ansInfoForTick.search_side.upper()}{ind + 1}"
            predicated_actions[key] = ActionInfo(elems['time'], item, ind + 1, ansInfoForTick.search_side, action,
                                                 seen_enemies_count, seen_teammates_count)
            result_log.write(
                'time - ' + str(elems['time']) + " " + str(item) + " " + str(ind + 1) + " " + str(action) + "\n")
            angleOrientation = ansInfoForTick.angleOrientation
            valueLackFlag = ansInfoForTick.valueLackFlag
            averageX = ansInfoForTick.averageX
            averageY = ansInfoForTick.averageY
            varianceArray = ansInfoForTick.varianceArray

            newObj = InfoForTick(averageX, averageY, absoluteX, absoluteY, ansInfoForTick.radian,
                                 ansInfoForTick.speedX, ansInfoForTick.speedY, ansInfoForTick.arrPlayer)
            playerList[item][(ind + 1)].add_new_tick_info(newObj)
            if (item == teams[0] and (ind + 1) == numberTeamGoalie[0]) or \
                    (item == teams[1] and (ind + 1) == numberTeamGoalie[1]):
                averageCoordArrayGlobalGoalie.append({'x': averageX, 'y': averageY})
                absoluteCoordArrayGlobalGoalie.append({'x': absoluteX, 'y': absoluteY})
            else:
                averageCoordArrayGlobal.append({'x': averageX, 'y': averageY})
                absoluteCoordArrayGlobal.append({'x': absoluteX, 'y': absoluteY})
            removeList = playerList[item][(ind + 1)].remove_list()
            listPredict = playerList[item][(ind + 1)].predict_for_disappeared_player(removeList)
            playerList[item][(ind + 1)].save_predict_coords(listPredict)
            for nn in playerList[item][(ind + 1)].removePlayer:
                removePlayer = playerList[item][(ind + 1)].removePlayer[nn]

            valueTickWithPredictVal = ParamsForDataTickWithPredictVal(listPredict, elems, predictObj, angleOrientation)
            predictObj = create_data_tick_with_predict_val(valueTickWithPredictVal, nowPlayer)

            differenceX = np.abs(np.abs(averageX) - np.abs(absoluteX))
            differenceY = np.abs(np.abs(averageY) - np.abs(absoluteY))
            difference.append({'x': differenceX, 'y': differenceY})

            new_row = {'time': elems['time'], 'player': nowPlayer, 'calc x': round(averageX, 4),
                       'calc y': round(averageY, 4), 'absolute x': absoluteX, 'absolute y': absoluteY,
                       'differenceX': round(differenceX, 4), 'differenceY': round(differenceY, 4)}
            # print("new row - ", new_row)
            row_log.write(str(new_row) + "\n")
            resultDF = resultDF._append(new_row, ignore_index=True)
# print("result df - ", resultDF)
# result_log.write(resultDF)
# print("ACTIONS FROM SERVER: ", server_results)
# print("PREDICATED ACTIONS", predicated_actions)
actions_count = {"all": 0, "searching": 0, "passing": 0, "dribbling": 0, "fight": 0, "kickingg": 0}
correct_predicate = {"all": 0, "searching": 0, "passing": 0, "dribbling": 0, "fight": 0, "kickingg": 0}
not_predicate = {"all": 0, "searching": 0, "passing": 0, "dribbling": 0, "fight": 0, "kickingg": 0}
incorrect_result_predicate = {"all": 0, "searching": 0, "passing": 0, "dribbling": 0, "fight": 0, "kickingg": 0}
actions_count_by_nearest_players = {i: 0 for i in range(12)}
correct_predicate_by_nearest_players = {i: 0 for i in range(12)}
actions_count_by_seen_enemies = {i: 0 for i in range(12)}
correct_predicate_by_seen_enemies = {i: 0 for i in range(12)}
actions_count_by_seen_teammates = {i: 0 for i in range(12)}
correct_predicate_by_seen_teammates = {i: 0 for i in range(12)}
for server_data in server_results:
    players = server_data.nearestPlayer if len(server_data.nearestPlayer) != 0 else [f"{pre}{i}" for pre in ["L", "R"]
                                                                                     for i in range(1, 12)]
    nearest_players_count = len(server_data.nearestPlayer)
    for player in players:
        if not predicated_actions.keys().__contains__(f"{server_data.time}{player}"):
            continue
        keys = [f"{server_data.time + i}{player}" for i in range(-1, 3)]  # -1 +2 норм
        actions_count["all"] += 1
        actions_count[str(server_data.action).lower()] += 1
        actions_count_by_nearest_players[nearest_players_count] += 1
        flag = False
        once_predicate = False
        for key in keys:
            if predicated_actions.keys().__contains__(key):
                once_predicate = True
                print("RESULT", key, server_data.action, predicated_actions.get(key).action,
                      server_data.action == predicated_actions.get(key).action)
                predicate_log.write(f"RESULT: key={key}, server_action={server_data.action},"
                                    f" predicate_action={predicated_actions.get(key).action},"
                                    f" compare={str(server_data.action).lower() == predicated_actions.get(key).action}"
                                    f"\n")
                if str(server_data.action).lower() == predicated_actions.get(key).action:
                    correct_predicate["all"] += 1
                    correct_predicate[server_data.action.lower()] += 1
                    correct_predicate_by_nearest_players[nearest_players_count] += 1
                    actions_count_by_seen_enemies[predicated_actions.get(key).seen_enemies_count] += 1
                    correct_predicate_by_seen_enemies[predicated_actions.get(key).seen_enemies_count] += 1
                    actions_count_by_seen_teammates[predicated_actions.get(key).seen_teammates_count] += 1
                    correct_predicate_by_seen_teammates[predicated_actions.get(key).seen_teammates_count] += 1
                    flag = True
                    break
        if not flag and once_predicate:
            not_predicate["all"] += 1
            not_predicate[server_data.action.lower()] += 1
            incorrect_result_predicate["all"] += 1
            actions_count_by_seen_enemies[predicated_actions.get(f"{server_data.time}{player}").seen_enemies_count] += 1
            actions_count_by_seen_teammates[predicated_actions.get(f"{server_data.time}{player}").seen_teammates_count]\
                += 1
            if predicated_actions.keys().__contains__(keys[int(len(keys) / 2)]):
                incorrect_result_predicate[predicated_actions.get(keys[int(len(keys) / 2)]).action] += 1
            else:
                print(f"not contain but compare: {keys[int(len(keys) / 2) - 1]}")


print(actions_count)
print(correct_predicate)
print(not_predicate)
print(incorrect_result_predicate)
print(actions_count_by_nearest_players)
print(correct_predicate_by_nearest_players)
print(actions_count_by_seen_enemies)
print(correct_predicate_by_seen_enemies)
print(actions_count_by_seen_teammates)
print(correct_predicate_by_seen_teammates)
compare_log.write(f"all actions: {str(actions_count)}\n"
                  f"correct predicate: {str(correct_predicate)}\n"
                  f"incorrect try predicate this: {str(not_predicate)}\n"
                  f"incorrect result predicate this: {str(incorrect_result_predicate)}\n"
                  f"actions by nearest players count: {str(actions_count_by_nearest_players)}\n"
                  f"correct predicate by nearest players count: {str(correct_predicate_by_nearest_players)}\n"
                  f"actions by seen enemies: {str(actions_count_by_seen_enemies)}\n"
                  f"correct predicate by seen enemies: {str(correct_predicate_by_seen_enemies)}\n"
                  f"actions by seen teammates: {str(actions_count_by_seen_teammates)}\n"
                  f"correct predicate by seen teammates:{str(correct_predicate_by_seen_teammates)}")
time_log.close()
result_log.close()
ans_log.close()
row_log.close()
fuzzy_log.close()
predicate_log.close()
compare_log.flush()
compare_log.close()
