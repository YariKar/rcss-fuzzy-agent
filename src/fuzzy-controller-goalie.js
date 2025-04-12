const utils = require("./utils")
const actions = require("./actions")
const calculations = require("./calculations")

class FuzzyControllerGoalie {
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
            enemyPositioning: {
                closer: 0, equal: 0, farther: 0
            },
            ballHald: {
                free: 0, risk: 0, block: 0
            }
        };
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
        const CLOSER_MAX = 1
        const EQUAL_MIN = 1
        const EQUAL_MAX = 3
        const FARTHER_MIN = 3
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

    enemyPositioningMF(taken) {
        console.log("ENEMY POS", taken.state.enemyTeam)
        const CLOSER_MAX = 1
        const EQUAL_MIN = 1
        const EQUAL_MAX = 3
        const FARTHER_MIN = 3
        const selfDist = taken.state.ball.dist || calculations.distance(taken.state.pos, taken.state.ball);
        let closerCount = 0;
        taken.state?.enemyTeam.forEach(enemy => {
            console.log("ENEMY", enemy, taken.state.ball)
            if (calculations.distance(enemy, taken.state.ball) < selfDist) {
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
        this.variables.enemyPositioning = this.enemyPositioningMF(taken)
        this.variables.ballHald = this.ballHaldMF(taken)
        console.log("BALL DISTANSE RESULT", this.variables.ballDistance)
        console.log("TEAM POSITIONING", this.variables.teamPositioning)
        console.log("ENEMY POSITIONING", this.variables.enemyPositioning)
        console.log("BALL HALD", this.variables.ballHald)
        if (this.variables.ballDistance.far >= 0.8) {
            console.log("GOALIE BALL FAR: positioning", this.variables.ballDistance)
            switch (taken.action){ 
                case "return":
                    taken.cmd = actions.actionReturn(taken);
                    return taken.cmd
                case "rotateCenter":
                    taken.cmd = actions.rotateCenter(taken);
                    return taken.cmd
                case "seekBall":
                    taken.cmd = actions.seekBall(taken);
                    return taken.cmd
            }
            return actions.positioning(taken)
        }
        // if (this.variables.ballDistance.near >= 0.3) {
        //     return actions.moveToBall(taken)
        // }
        if(this.variables.ballDistance.near>=0.6){
            if (this.variables.teamPositioning.closer>=0.7){
                return actions.moveToBall(taken)
            }
            switch (taken.action){ 
                case "return":
                    taken.cmd = actions.actionReturn(taken);
                    return taken.cmd
                case "rotateCenter":
                    taken.cmd = actions.rotateCenter(taken);
                    return taken.cmd
                case "seekBall":
                    taken.cmd = actions.seekBall(taken);
                    return taken.cmd
            }
            actions.positioning(taken)
        }
        if(this.variables.ballDistance.close>=0.7){
            return {n: "kick", v: "100 0"}
            // console.log("GOALIE CLOSE", this.variables.ballHald)
            // if(this.variables.ballHald.free>=0.5){
            //     console.log("GOALIE PASS")
            //     return actions.pass(taken)
            // }
            // return {n: "kick", v: "100 0"}
        }
        // if (this.variables.teamPositioning.closer>=0.7 && this.variables.enemyPositioning.closer>=0.7){
        //     console.log("GOALIE MOVE TO BALL")
        //     return actions.moveToBall(taken)
        // }


    }

    execute(taken) {
        console.log(taken)
        this.calculateKnowMatchFunctionValues(taken)
        return this.rulesHadler(taken)
    }

}

module.exports = FuzzyControllerGoalie;