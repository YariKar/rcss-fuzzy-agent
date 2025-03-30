const utils = require("./utils")

const CTRL_HIGH_PLAYER = {
    execute(taken, controllers, fuzzy) {
        const state = taken.state;
        
        // 1. Определение текущей позиции
        const currentPos = this._determinePosition(taken, fuzzy);
        
        // 2. Расчет целевой позиции
        const targetPos = this._calculateTargetPosition(taken, currentPos, fuzzy);
        
        // 3. Плавное движение к цели
        const act =  this._smoothNavigation(currentPos, targetPos, state);
        console.log("GOALIE HIGH result", act, currentPos, targetPos, taken)
        return act
    },

    _determinePosition(taken, fuzzy) {
        // Используем 3 метода определения позиции
        const methods = [
            this._triangulatePosition(taken),
            this._useLastKnownPosition(taken, fuzzy),
            this._useStartPosition(taken)
        ];
        
        // Фильтруем некорректные позиции
        const validPositions = methods.filter(p => 
            p && Math.abs(p.x) <= 57.5 && Math.abs(p.y) <= 39
        );
        
        return validPositions.length > 0 ? validPositions[0] : null;
    },

    _triangulatePosition(taken) {
        const flags = Object.values(taken.state.all_flags || {});
        if (flags.length >= 2) {
            // Используем первые два флага для триангуляции
            const [f1, f2] = flags.slice(0,2);
            return utils.solveby2(
                f1.dist, f2.dist,
                f1.x, f1.y,
                f2.x, f2.y,
                null, null,
                57.5, 39
            );
        }
        return null;
    },

    _calculateTargetPosition(taken, currentPos, fuzzy) {
        const basePos = {
            x: taken.start_x,
            y: taken.start_y
        };
        
        // Нечеткая логика для смещения позиции
        const positionShift = this._calculatePositionShift(taken, basePos, fuzzy);
        
        return {
            x: this._fuzzyClamp(basePos.x + positionShift.x, -57.5, 57.5),
            y: this._fuzzyClamp(basePos.y + positionShift.y, -39, 39)
        };
    },

    _calculatePositionShift(taken, basePos, fuzzy) {
        const ball = fuzzy.lastKnownBallPos;
        const gameState = fuzzy.gameState;
        
        // Нечеткие правила для смещения
        const dx = ball.x - basePos.x;
        const dy = ball.y - basePos.y;
        
        const attackFactor = gameState === 'attack' ? 0.7 : 0.3;
        const defenseFactor = gameState === 'defense' ? 0.5 : 0.2;
        
        return {
            x: this._fuzzyValue(dx * attackFactor - defenseFactor * 10),
            y: this._fuzzyValue(dy * 0.4)
        };
    },

    _smoothNavigation(currentPos, targetPos, state) {
        if (!currentPos || !targetPos) {
            return this._searchPattern(taken);
        }

        const dx = targetPos.x - currentPos.x;
        const dy = targetPos.y - currentPos.y;
        const targetAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Нормализация углов
        const currentDir = ((state.direction || 0) % 360 + 360) % 360;
        const normalizedTarget = ((targetAngle % 360) + 360) % 360;
        
        // Вычисляем минимальный угол поворота
        let angleDiff = normalizedTarget - currentDir;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;

        // Нечеткое управление поворотом с ограничениями
        const turnPower = this._calculateTurnPower(angleDiff);
        
        // Адаптивное управление скоростью
        const distance = Math.hypot(dx, dy);
        const dashPower = this._calculateDashPower(distance, angleDiff);

        // Приоритет плавной коррекции направления
        if (Math.abs(angleDiff) > 30) {
            return { 
                n: 'turn', 
                v: turnPower,
               
            }; // _comment: `Коррекция направления (Δ=${angleDiff.toFixed(1)}°)`
        }
        
        return {
            n: 'dash',
            v: dashPower,
            
        }; //_comment: `Движение к цели (${dashPower}%)`
    },

    _calculateTurnPower(angleDiff) {
        // Нечеткие правила с ограничением максимального поворота
        const absDiff = Math.abs(angleDiff);
        let power = 0;
        
        if (absDiff < 5) {
            power = 0; // Не поворачиваемся
        } else if (absDiff < 20) {
            power = angleDiff * 0.6; // Плавная коррекция
        } else if (absDiff < 90) {
            power = angleDiff * 0.8; // Умеренный поворот
        } else {
            power = angleDiff * 0.5; // Ограничение для больших углов
        }

        // Ограничение максимальной силы поворота
        return Math.sign(power) * Math.min(Math.abs(power), 60);
    },

    _calculateDashPower(distance, angleDiff) {
        // Учет угла и расстояния для скорости
        const angleFactor = 1 - Math.min(1, Math.abs(angleDiff)/30);
        const baseSpeed = Math.min(100, 40 + distance * 2);
        
        return Math.round(baseSpeed * angleFactor);
    },

    _searchPattern(taken) {
        // Адаптивный поисковый паттерн
        const searchAngles = this._getSearchAngles(taken);
        const step = taken.searchStep || 0;
        
        if (step >= searchAngles.length) taken.searchStep = 0;
        
        const action = {
            n: 'turn',
            v: searchAngles[step]
        };
        
        taken.searchStep = step + 1;
        return action;
    },

    _getSearchAngles(taken) {
        // Генерация углов поиска на основе видимых флагов
        const visibleFlags = Object.keys(taken.state.all_flags || {});
        if (visibleFlags.length > 0) {
            return [45, -45, 90, -90];
        }
        return [30, -30, 60, -60, 90];
    },

    _fuzzyClamp(value, min, max) {
        // Нечеткое ограничение значений
        if (value < min) return min + (value - min) * 0.3;
        if (value > max) return max + (value - max) * 0.3;
        return value;
    },

    _fuzzyValue(value) {
        // Нечеткая коррекция значений
        return Math.sign(value) * Math.sqrt(Math.abs(value));
    },

    _useLastKnownPosition(taken, fuzzy) {
        // Получаем последнюю сохраненную позицию из fuzzy-контроллера
        const lastPos = fuzzy.playerPositions.get(taken.playerNumber);
        
        // Проверяем актуальность позиции (не старше 10 циклов)
        if (lastPos && Date.now() - lastPos.timestamp < 10000) {
            return {
                x: lastPos.x,
                y: lastPos.y
            };
        }
        return null;
    },

    _useStartPosition(taken) {
        // Используем стартовую позицию из параметров спавна
        if (taken.start_x && taken.start_y) {
            return {
                x: taken.start_x,
                y: taken.start_y,
                timestamp: Date.now()
            };
        }
        
        // Резервный вариант для старых версий
        const baseX = taken.side === 'l' ? -40 : 40;
        return {
            x: baseX + (Math.random() * 10 - 5),
            y: (Math.random() * 20 - 10)
        };
    },
};

module.exports = CTRL_HIGH_PLAYER;