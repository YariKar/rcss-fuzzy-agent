from config import Flags, numPeople, server_actions_pattern
from getCoords import *
from saveModule import posPlayer, otherPlayer, infoForTick, storeAgent
import ast


def readFile(resFlags, resMov):
    for item in teams:
        resFlags[item] = []
        resMov[item] = []
        for index in range(numPeople):
            print(index, pathDefault + prefixFiles + item + '_' + str((index + 1)) + '-landmarks.csv')
            iter = pd.read_csv(pathDefault + prefixFiles + item + '_' + str((index + 1)) + '-landmarks.csv', sep=',')
            print(index, pathDefault + prefixFiles + item + '_' + str((index + 1)) + '-moving.csv')
            iterMov = pd.read_csv(pathDefault + prefixFiles + item + '_' + str((index + 1)) + '-moving.csv', sep=',')
            resFlags[item].append(Remove_Null_or_NAN_Columns(iter))
            resMov[item].append(Remove_Null_or_NAN_Columns(iterMov))
    return {'resFlags': resFlags, 'resMov': resMov}


def createMapViewFlag(resProcess, resFlagsTeam):
    for item in teams:
        resProcess[item] = {}
        for ind in range(numPeople):
            resProcess[item][(ind + 1)] = []
            for index, row in resFlagsTeam[item][ind].iterrows():
                flags = Find_All_Flags(row)
                resProcess[item][(ind + 1)].append({
                    'time': row['# time'],
                    'flags': flags
                })
    return resProcess


def createMapViewMove(resMoveP, resMoveB, resMovTeam):
    for item in teams:
        resMoveP[item] = {}
        resMoveB[item] = {}
        for ind in range(numPeople):
            resMoveP[item][(ind + 1)] = {}
            resMoveB[item][(ind + 1)] = {}
            for index, row in resMovTeam[item][ind].iterrows():
                player = Find_All_Object(row)
                resMoveP[item][(ind + 1)][row['# time']] = player['plArr']
                resMoveB[item][(ind + 1)][row['# time']] = player['ballArr']
    return {'resMoveP': resMoveP, 'resMoveB': resMoveB}


class paramsForCalcPosition:
    def __init__(self, elems, now_pl_obj: storeAgent, angle_orientation, value_lack_flag, variance_array, angle_flag,
                 absolute_x, absolute_y):
        self.elems = elems
        self.nowPlObj = now_pl_obj
        self.angleOrientation = angle_orientation
        self.valueLackFlag = value_lack_flag
        self.varianceArray = variance_array
        self.angleFlag = angle_flag
        self.absoluteX = absolute_x
        self.absoluteY = absolute_y
        self.averageX = 0
        self.averageY = 0
        self.arrPlayer = []
        self.radian = None
        self.speedX = None
        self.speedY = None
        self.team = None
        self.time = None
        self.side = None
        self.search_side = None

    def __str__(self):
        return f"""paramsForCalcPosition:
    - Основные параметры:
      elems: {self.elems}
      nowPlObj: {self.nowPlObj}
      angleOrientation: {self.angleOrientation}
      valueLackFlag: {self.valueLackFlag}
      angleFlag: {self.angleFlag}
      team: {self.team}
      time: {self.time}
      side: {self.side}

    - Координаты:
      absolute: ({self.absoluteX}, {self.absoluteY})
      average: ({self.averageX}, {self.averageY})

    - Динамика:
      speed: (X: {self.speedX}, Y: {self.speedY})
      radian: {self.radian}

    - Дополнительные данные:
      varianceArray: {self.varianceArray} 
      arrPlayer: {self.arrPlayer}
      Конец объекта такта\n\n"""


def calcPosOtherPl(param, resMovePTeam, team, ind):
    # calc other obj
    arrPlayer = otherPlayer()
    for player in resMovePTeam[team][(ind + 1)][param.elems['time']]:
        coordsNewPlayer = []
        for indexFirstFlag in range(len(param.elems['flags'])):
            for indexSecondFlag in range(indexFirstFlag + 1, len(param.elems['flags'])):
                firstFlag = param.elems['flags'][indexFirstFlag]['column']
                firstFlag = firstFlag[:len(firstFlag) - 4].replace(' ', '')
                secondFlag = param.elems['flags'][indexSecondFlag]['column']
                secondFlag = secondFlag[:len(secondFlag) - 4].replace(' ', '')
                calcAngle = 0
                angleFl = int(param.elems['flags'][indexFirstFlag]['angle'])
                anglePl = int(player['angle'])
                calcAngle = angleFl - anglePl
                distanceBetweenFlagAndPlayerFirst = np.sqrt(np.abs(
                    float(param.elems['flags'][indexFirstFlag]['dist']) ** 2 + float(player['dist']) ** 2 -
                    2 * float(player['dist']) * float(param.elems['flags'][indexFirstFlag]['dist']) * np.cos(
                        (np.abs(calcAngle) * np.pi / 180))
                ))
                calcAngle = 0
                angleFl = int(param.elems['flags'][indexSecondFlag]['angle'])
                anglePl = int(player['angle'])
                calcAngle = angleFl - anglePl
                distanceBetweenFlagAndPlayerSecond = np.sqrt(np.abs(
                    float(param.elems['flags'][indexSecondFlag]['dist']) ** 2 + float(player['dist']) ** 2 -
                    2 * float(player['dist']) * float(param.elems['flags'][indexSecondFlag]['dist']) * np.cos(
                        (np.abs(calcAngle) * np.pi / 180))
                ))
                calcCoords = getAnswerForThreeFlags({'x': param.averageX, 'y': param.averageY}, Flags[firstFlag],
                                                    Flags[secondFlag], player['dist'],
                                                    distanceBetweenFlagAndPlayerFirst,
                                                    distanceBetweenFlagAndPlayerSecond)
                if (calcCoords):
                    calcX = calcCoords['x']
                    calcY = calcCoords['y']
                    coordsNewPlayer.append({'x': calcX, 'y': calcY})

        newPlayerX = 0.0
        newPlayerY = 0.0
        if (len(coordsNewPlayer) > 0):
            sumX = [0, 0, 0, 0]
            sumY = [0, 0, 0, 0]
            for indexEl in range(0, len(coordsNewPlayer)):
                el_X = coordsNewPlayer[indexEl]['x']
                el_Y = coordsNewPlayer[indexEl]['y']
                indexX = 0 if el_X < 0 else 1
                indexY = 0 if el_Y < 0 else 1
                sumX[indexX] += el_X
                sumY[indexY] += el_Y
                sumX[indexX + 2] += 1
                sumY[indexY + 2] += 1
            if (np.abs(sumX[0]) < sumX[1] and sumX[3] != 0):
                newPlayerX = sumX[1] / sumX[3]
            if (np.abs(sumX[0]) > sumX[1] and sumX[2] != 0):
                newPlayerX = sumX[0] / sumX[2]
            if (np.abs(sumY[0]) < sumY[1] and sumY[3] != 0):
                newPlayerY = -(sumY[1]) / sumY[3]
            if (np.abs(sumY[0]) > sumY[1] and sumY[2] != 0):
                newPlayerY = np.abs(sumY[0]) / sumY[2]
        positionP = posPlayer(newPlayerX, newPlayerY, player['angle'])
        arrPlayer.addNewViewPlayer(player['column'], positionP)
    return arrPlayer


def calcInfoForTick(param: paramsForCalcPosition, resMovePTeam, team, ind, absoluteCoordArray):
    if (len(param.elems['flags']) < 2):
        if (param.valueLackFlag > 3):
            print('rotate for find flag!')
            return None
        if (param.nowPlObj.getLength() < 2):
            print('rotate for find flag!')
            return None
        # addNewTickInfo
        lenArCoord = param.nowPlObj.getLength()
        firstCoordVal = param.nowPlObj.getItemAt(lenArCoord - 1)
        secondCoordVal = param.nowPlObj.getItemAt(lenArCoord - 2)
        if (firstCoordVal == None or secondCoordVal == None):
            print('rotate for find flag!')
            return None
        param.speedX = np.abs(firstCoordVal.x) - np.abs(secondCoordVal.x)
        param.speedY = np.abs(firstCoordVal.y) - np.abs(secondCoordVal.y)
        param.radian = (
                           param.angleOrientation if param.angleOrientation > 0 else 360 + param.angleOrientation) * np.pi / 180
        param.averageX = firstCoordVal.x + param.speedX * np.cos(param.radian)  # cos
        param.averageY = firstCoordVal.y + param.speedY * np.sin(param.radian)  #
        if (param.valueLackFlag > 3 or (np.abs(param.averageX) > 54 or np.abs(param.averageY) > 32)):
            print('rotate for find flag!')
            return None
        param.valueLackFlag += 1
    else:
        param.angleOrientation = None
        param.valueLackFlag = 0
        coordsIndAllFl = []
        for indexFirstFlag in range(len(param.elems['flags'])):
            for indexSecondFlag in range(indexFirstFlag + 1, len(param.elems['flags'])):
                firstFlag = param.elems['flags'][indexFirstFlag]['column']
                firstFlag = firstFlag[:len(firstFlag) - 4].replace(' ', '')
                secondFlag = param.elems['flags'][indexSecondFlag]['column']
                secondFlag = secondFlag[:len(secondFlag) - 4].replace(' ', '')
                calcCoords = getAnswerForTwoFlags(Flags[firstFlag], Flags[secondFlag],
                                                  param.elems['flags'][indexFirstFlag]['dist'],
                                                  param.elems['flags'][indexSecondFlag]['dist'])
                if (calcCoords):
                    calcX = calcCoords['x']
                    calcY = calcCoords['y']
                    coordsIndAllFl.append({'x': calcX, 'y': calcY})
        if (len(coordsIndAllFl) > 0):
            sumX = [0, 0, 0, 0]
            sumY = [0, 0, 0, 0]
            for indexEl in range(0, len(coordsIndAllFl)):
                el_X = coordsIndAllFl[indexEl]['x']
                el_Y = coordsIndAllFl[indexEl]['y']
                indexX = 0 if el_X < 0 else 1
                indexY = 0 if el_X < 0 else 1
                sumX[indexX] += el_X
                sumY[indexY] += el_Y
                sumX[indexX + 2] += 1
                sumY[indexY + 2] += 1
            if (np.abs(sumX[0]) < sumX[1] and sumX[3] != 0):
                param.averageX = sumX[1] / sumX[3]
            if (np.abs(sumX[0]) > sumX[1] and sumX[2] != 0):
                param.averageX = sumX[0] / sumX[2]
            if (np.abs(sumY[0]) < sumY[1] and sumY[3] != 0):
                param.averageY = sumY[1] / sumY[3]
            if (np.abs(sumY[0]) > sumY[1] and sumY[2] != 0):
                param.averageY = sumY[0] / sumY[2]

        distanceMax = float(param.elems['flags'][0]['dist'])
        distanceMix = float(param.elems['flags'][0]['dist'])
        for indexD in range(1, len(param.elems['flags'])):
            elDist = float(param.elems['flags'][indexD]['dist'])
            if (distanceMax < elDist):
                distanceMax = elDist
            if (distanceMix > elDist):
                distanceMix = elDist
        variance = ((distanceMax - distanceMix) ** 2) / 12

        if (len(param.varianceArray) > 0):
            varianceLast = param.varianceArray[len(param.varianceArray) - 1]
            kalman = 0.5
            if ((varianceLast + variance) != 0):
                kalman = (varianceLast) / (varianceLast + variance)
            param.varianceArray.append(variance)
            coordLastAbsolute = absoluteCoordArray[len(absoluteCoordArray) - 2]
            coordLast = param.nowPlObj.getLastItem()
            if (coordLast == None):
                print('coordLast is None')
                return None
            param.radian = (param.angleFlag if param.angleFlag > 0 else 360 + param.angleFlag) * np.pi / 180
            param.speedX = np.abs(param.absoluteX) - np.abs(
                coordLastAbsolute['x'])  # calculate speed from (dash <num speed> - by Vx)
            param.speedY = np.abs(param.absoluteY) - np.abs(
                coordLastAbsolute['y'])  # calculate speed from (dash <num speed> - by Vy)
            averageXTmp = param.averageX * kalman + (1 - kalman) * (coordLast.x + param.speedX * np.cos(param.radian))
            averageYTmp = param.averageY * kalman + (1 - kalman) * (coordLast.y + param.speedY * np.sin(param.radian))
            if np.abs(averageXTmp) < 54:
                param.averageX = averageXTmp
            if np.abs(averageYTmp) < 32:
                param.averageY = averageYTmp
        else:
            param.varianceArray.append(variance)
        if np.abs(param.averageX) > 54:
            return None
        if np.abs(param.averageY) > 32:
            return None
        # calc other obj
        param.arrPlayer = calcPosOtherPl(param, resMovePTeam, team, ind)
        param.team = team
        return param


class paramsForDataTickWithPredictVal:
    def __init__(self, listPredict, elems, predictObj, angleOrientation):
        self.listPredict = listPredict
        self.elems = elems
        self.predictObj = predictObj
        self.angleOrientation = angleOrientation


def createDataTickWithPredictVal(param, nowPlayer):
    for predictVal in param.listPredict:
        name = predictVal['name'].replace(' dist', '')
        isBall = name == 'b'
        absCoord = None
        absCoordNow = None
        if isBall:
            if (param.elems['time'] < 6000):
                absCoord = getAbsolutedCoordinate('', 0, param.elems['time'] + 1, param.angleOrientation, True)
            else:
                absCoord = getAbsolutedCoordinate('', 0, param.elems['time'], param.angleOrientation, True)
            absCoordNow = getAbsolutedCoordinate('', 0, param.elems['time'], param.angleOrientation, True)
        else:
            team = name[(name.find('"') + 1):name.rfind('"')]
            teamNum = name[(name.rfind('"') + 2):len(name)]
            if (param.elems['time'] < 6000):
                absCoord = getAbsolutedCoordinate(team, int(teamNum), param.elems['time'] + 1, param.angleOrientation,
                                                  False)
            else:
                absCoord = getAbsolutedCoordinate(team, int(teamNum), param.elems['time'], param.angleOrientation,
                                                  False)
            absCoordNow = getAbsolutedCoordinate(team, int(teamNum), param.elems['time'], param.angleOrientation, False)
        if (absCoord != None and absCoordNow != None):
            addObj = {
                'viewFrom': nowPlayer,
                'timeNow': param.elems['time'],
                'nowX': round(predictVal['beforeX'], 4),
                'nowY': round(predictVal['beforeY'], 4),
                'nowAbsoluneX': absCoordNow.absoluteX,
                'nowAbsoluneY': absCoordNow.absoluteY,
                'predictX': round(predictVal['x'], 4),
                'predictY': round(predictVal['y'], 4),
                'predictAbsoluneX': absCoord.absoluteX,
                'predictAbsoluneY': absCoord.absoluteY,
                'nowDiffX': round(np.abs(np.abs(predictVal['beforeX']) - np.abs(absCoordNow.absoluteX)), 4),
                'nowDiffY': round(np.abs(np.abs(predictVal['beforeY']) - np.abs(absCoordNow.absoluteY)), 4),
                'predictDiffX': round(np.abs(np.abs(predictVal['x']) - np.abs(absCoord.absoluteX)), 4),
                'predictDiffY': round(np.abs(np.abs(predictVal['y']) - np.abs(absCoord.absoluteY)), 4),
                'predictVarianceX': np.sqrt(
                    (round(np.abs(np.abs(predictVal['x']) - np.abs(absCoord.absoluteX)), 4) ** 2) / predictVal[
                        'predictTick']),
                'predictVarianceY': np.sqrt(
                    (round(np.abs(np.abs(predictVal['y']) - np.abs(absCoord.absoluteY)), 4) ** 2) / predictVal[
                        'predictTick']),
                'predictTick': predictVal['predictTick'],
            }
            if name in param.predictObj:
                param.predictObj[name].append(addObj)
            else:
                param.predictObj[name] = [addObj]

    return param.predictObj


def parse_groundtruth_file():
    # Функция для преобразования строк в списки
    def parse_list(value):
        if pd.isna(value) or value == '':
            return []
        try:
            return ast.literal_eval(str(value))
        except (ValueError, SyntaxError):
            return []

    # Загрузка CSV-файла с обработкой списков
    df = pd.read_csv(
        r'E:\My_Programs\study\degree_bak\rcss-fuzzy-agent\example_csv\Gliders2016-HELIOS2017-action-groundtruth-v3.csv',
        converters={
            'nearestPlayer': parse_list,
            'middleDistPlayer': parse_list,
            'passPair': parse_list
        },
        index_col=0  # Использовать первую колонку как индекс
    )

    # Преобразование DataFrame в список объектов
    data_objects = [
        GameEvent(
            index=row.Index,
            time=row.time,
            action=row.action,
            sideWithBall=row.sideWithBall,
            lenOfNearest=row.lenOfNearest,
            nearestPlayer=row.nearestPlayer,
            lenOfMiddleDist=row.lenOfMiddleDist,
            middleDistPlayer=row.middleDistPlayer,
            passPair=row.passPair,
            goalIsNearest=row.goalIsNearest
        )
        for row in df.reset_index().itertuples()
    ]
    return data_objects


class GameEvent:
    def __init__(self, index, time, action, sideWithBall, lenOfNearest, nearestPlayer,
                 lenOfMiddleDist, middleDistPlayer, passPair, goalIsNearest):
        self.index = index
        self.time = time
        self.action = action
        self.sideWithBall = sideWithBall
        self.lenOfNearest = lenOfNearest
        self.nearestPlayer = nearestPlayer
        self.lenOfMiddleDist = lenOfMiddleDist
        self.middleDistPlayer = middleDistPlayer
        self.passPair = passPair
        self.goalIsNearest = goalIsNearest

    def __repr__(self):
        return f"GameEvent(index={self.index}, time={self.time}, action={self.action})"


class ActionInfo:
    def __init__(self, time: int, team: str, ind: int, side: str, action: str):
        self.time = time
        self.team = team
        self.player = ind
        self.side = side
        self.action = action

    def __repr__(self):
        return f"ActionInfo(time={self.time}, team={self.team}, ind={self.player}, side={self.side}, action={self.action})"
