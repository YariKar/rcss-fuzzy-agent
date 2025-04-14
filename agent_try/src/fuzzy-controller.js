const utils = require("./utils")
const calculations = require("./calculations");
const actions = require("./actions");

class FuzzyController {
    constructor() {

        this.assumedKnowValue = 3;

        this.variables = {
            ballKnowledge: {
                known: 0, assumed: 0, unknown: 0
            },
            posKnowledge: {
                known: 0, assumed: 0, unknown: 0
            },
            ballDistance: {
                close: 0, near: 0, far: 0
            },
            teamPositioning: {
                closer: 0, equal: 0, farther: 0
            },
            gatePossibility: {
                free: 0, partly: 0, block: 0
            },
            ballHald: {
                free: 0, risk: 0, block: 0
            }
        };

    }

    // Расчет функции принадлежности для переменной
    calcMF(varName, value) {
        const result = {};
        const variable = this.variables[varName];
        for (const term of variable.terms) {
            result[term] = variable.mf[term](value);
        }
        return result;
    }

    // Функции принадлежности для знания о мяче
    ballKnowledgeMF(taken) {
        if (taken.state && taken.state.ball) {
            return { known: 1, assumed: 0, unknown: 0 };
        }

        if (taken?.last_ball_pos?.ball && taken.last_ball_pos.tact_count <= this.assumedKnowValue) {
            const decay = 1 - (taken.last_ball_pos.tact_count / this.assumedKnowValue);
            return { known: 0, assumed: decay, unknown: 1 - decay };
        }

        return { known: 0, assumed: 0, unknown: 1 };
    }

    // Функции принадлежности для знания о позиции
    posKnowledgeMF(taken) {
        if (taken.state.pos) {
            return { known: 1, assumed: 0, unknown: 0 };
        }

        if (taken.last_pos && taken.last_pos.pos && taken.last_pos.tact_count <= this.assumedKnowValue) {
            const decay = 1 - (taken.last_pos.tact_count / this.assumedKnowValue);
            return { known: 0, assumed: decay, unknown: 1 - decay };
        }

        return { known: 0, assumed: 0, unknown: 1 };
    }

    ballDistanceMF(taken) {
        console.log("BALL DISTANSE", taken.state.pos, taken.state.ball)
        const CLOSE_MAX = 0.7
        const CLOSE_MIN = 1.7
        const NEAR_MAX = 25
        const NEAR_MIN = 30
        const ballDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball)
        return {
            close: calculations.trapezoidMF(ballDist, [0, 0, CLOSE_MAX, CLOSE_MIN]),
            near: calculations.trapezoidMF(ballDist, [CLOSE_MAX, CLOSE_MIN, NEAR_MAX, NEAR_MIN]),
            far: calculations.trapezoidMF(ballDist, [NEAR_MAX, NEAR_MIN, 100, 100])
        };

    }

    teamPositioningMF(taken) {
        console.log("TEAM POS", taken.state.myTeam)
        let CLOSER_MAX = 1
        let EQUAL_MIN = 1
        let EQUAL_MAX = 3
        let FARTHER_MIN = 3
        if ((taken.side === "l" && taken.state.ball?.x < -30) || (taken.side === "r" && taken.state.ball?.x > 30)) {
            CLOSER_MAX = 3
            EQUAL_MIN = 3
            EQUAL_MAX = 6
            FARTHER_MIN = 6
        }

        const selfDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball);
        let closerCount = 0;
        taken.state?.myTeam.forEach(teammate => {
            console.log("TEAMMATE", teammate, taken.state.ball)
            if (calculations.distance(teammate, taken.state.ball) < selfDist) {
                closerCount++
            }
        });
        return {
            closer: calculations.trapezoidMF(closerCount, [-1, -1, 0, CLOSER_MAX]),
            equal: calculations.trapezoidMF(closerCount, [
                EQUAL_MIN - 1,
                EQUAL_MIN,
                EQUAL_MAX,
                EQUAL_MAX + 1
            ]),
            farther: calculations.trapezoidMF(closerCount, [
                FARTHER_MIN - 1,
                FARTHER_MIN,
                11, 11 // Макс 10 игроков
            ])
        };
    }

    gatePossibilityMF(taken) {
        const side = taken.side || "l"; // Определяем сторону команды
        const flags = side === "l" ? ["gr", "fgrt", "fgrb"] : ["gl", "fglt", "fglb"];
        // Получаем флаги с их именами
        const visibleFlags = Object.entries(taken.state.all_flags || {})
            .filter(([name]) => flags.includes(name))
            .map(([name, data]) => ({ name, ...data }));
        console.log("GATE FLAGS", taken.state.all_flags, visibleFlags, flags)
        // Если ни один флаг ворот не виден
        if (visibleFlags.length === 0) {
            return { free: 0, partly: 0, block: 1 };
        }

        // Находим ближайший флаг ворот
        const nearestFlag = visibleFlags.reduce((closest, flag) => {
            const dist = calculations.distance(taken.state.pos, flag);
            return dist < closest.dist ? { dist, flag } : closest;
        }, { dist: Infinity, flag: null });

        // Координаты центра ворот (пример для левых ворот)
        const goalCenter = {
            x: side === "l" ? 52.5 : -52.5,
            y: 0
        };

        // Расстояние до центра ворот с учетом позиции игрока
        const goalDist = calculations.distance(taken.state.pos, goalCenter);

        // Функции принадлежности
        const partlyMF = calculations.trapezoidMF(goalDist, [15, 20, 105, 105]);
        const freeMF = calculations.trapezoidMF(goalDist, [0, 0, 19.1, 26]);

        // // Учет угла обзора ворот
        // const angleToGoal = Math.abs(calculations.calculateAngle(taken.state.pos, goalCenter));
        // const angleFactor = 1 - Math.min(angleToGoal / 45, 1); // 0-45 градусов
        console.log("ALL GATE POS", nearestFlag, goalCenter, goalDist, partlyMF, freeMF)
        return {
            free: freeMF,
            partly: partlyMF,
            block: 0
        };

    }

    ballHaldMF(taken) {
        if (taken.kick) {
            return { free: 0, risk: 0, block: 1 }
        }

        const enemies = taken.state.enemyTeam || [];

        // 1. Считаем количество соперников в радиусе 1м от мяча
        const nearEnemiesCount = enemies.filter(e => calculations.distance(e, taken.state.ball) || e.dist <= 1.0).length;
        console.log("BALL HALD mf:", enemies, enemies.filter(e => e.dist <= 1.0), nearEnemiesCount)
        // 2. Функции принадлежности для каждого терма
        return {
            free: calculations.trapezoidMF(nearEnemiesCount, [-1, -0.5, 0.5, 1.0]),
            risk: calculations.trapezoidMF(nearEnemiesCount, [0.5, 1.0, 2.0, 2.5]),
            block: calculations.trapezoidMF(nearEnemiesCount, [2.0, 2.5, 11, 11])
        };

    }

    calculateKnowMatchFunctionValues(taken) {
        this.variables.ballKnowledge = this.ballKnowledgeMF(taken)
        this.variables.posKnowledge = this.posKnowledgeMF(taken)
    }

    rulesHadler(taken) {

        console.log("BALL KNOWLEDGE", this.variables.ballKnowledge)
        console.log("POS KNOWLEDGE", this.variables.posKnowledge)
        if (this.variables.ballKnowledge.unknown >= 0.8 || this.variables.posKnowledge.unknown >= 0.8) {
            //this.lastAction = this.positioningAction(taken);
            console.log("UNKNOWN", this.variables.ballKnowledge, this.variables.posKnowledge);
            return actions.positioning(taken)
        }
        if (this.variables.ballKnowledge.assumed >= 0.3 || this.variables.ballKnowledge.assumed >= 0.3) {
            if (taken.last_act) {
                console.log("ASSUMED", this.variables.ballKnowledge, this.variables.posKnowledge);
                return taken.last_act;
            }
            return actions.positioning(taken)
        }

        this.variables.ballDistance = this.ballDistanceMF(taken)
        this.variables.teamPositioning = this.teamPositioningMF(taken)
        console.log("BALL DISTANSE RESULT", this.variables.ballDistance)
        console.log("TEAM POS RESULT", this.variables.teamPositioning)


        if (this.variables.ballDistance.far > 0.8) {
            console.log("BALL FAR: positioning", this.variables.ballDistance)
            return actions.positioning(taken)
        }
        if (this.variables.ballDistance.near >= 0.3) {
            // if (this.variables.teamPositioning.farther >= 0.5) {
            //     console.log("BALL NEAR, FARTHER: positioning")
            //     
            // }
            if (this.variables.teamPositioning.closer >= 0.6) {
                console.log("BALL NEAR: move", this.variables.ballDistance)
                return actions.moveToBall(taken)
            }
            return actions.positioning(taken)
        }
        this.variables.gatePossibility = this.gatePossibilityMF(taken)
        this.variables.ballHald = this.ballHaldMF(taken)
        console.log("GATE POS:", this.variables.gatePossibility)
        if (this.variables.ballDistance.close >= 0.7) {
            if (this.variables.gatePossibility.free >= 0.5) {
                console.log("GATE FREE: shoot", this.variables.gatePossibility, taken.state.pos)
                return actions.shoot(taken)
            }
            console.log("BALL HALD value:", this.variables.ballHald)
            if (this.variables.ballHald.block >= 0.7) {
                console.log("BALL HALD BLOCK: pass", this.variables.ballHald, taken.last_seen_teammate, taken.state.enemyTeam)
                return actions.pass(taken)
            }

            if (this.variables.ballHald.risk >= 0.5) {
                console.log("BALL HALD risk: knock", this.variables.ballHald, taken.state.enemyTeam)
                return actions.knock(taken)
            }
            if (this.variables.ballHald.free >= 0.5) {
                console.log("BALL HALD free: leading", this.variables.ballHald)
                if (this.variables.gatePossibility.partly >= 0.6) {
                    console.log("GATE PARTLY: dribble", this.variables.gatePossibility, taken.state.pos)
                    return actions.dribbling(taken)
                }
                if (this.variables.gatePossibility.block >= 0.7) {
                    console.log("GATE BLOCK: turn ball", this.variables.gatePossibility, taken.state.pos)
                    return actions.ballTurn(taken)
                }
            }

            //console.log("BALL CLOSE: kick", this.variables.ballDistance)
            //return { n: "kick", v: "100 " + (-taken.state.ball?.angle) }
        }

        // Заглушка для "знает" - можно добавить другую логику
        console.log("ANOTHER", this.variables.ballKnowledge, this.variables.posKnowledge);
        return { n: "turn", v: 0 };
    }


    execute(taken) {
        console.log(taken)
        this.calculateKnowMatchFunctionValues(taken)
        return this.rulesHadler(taken)
    }

}

module.exports = FuzzyController;