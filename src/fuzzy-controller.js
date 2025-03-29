const utils = require("./utils");

class FuzzyGoalie {
    constructor(side = 'l') {
        this.side = side;
        this.BASE_X = side === 'l' ? -50 : 50;
        this.PENALTY_AREA_X = side === 'l' ? -36 : 36;
        this.BALL_DANGER_DIST = 15;
        this.OPPONENT_DANGER_DIST = 20;

        this.returnToBase = this.returnToBase.bind(this)
        this.immediateCatch = this.immediateCatch.bind(this);
        this.emergencyKick = this.emergencyKick.bind(this);
        this.activeDefense = this.activeDefense.bind(this)
        
        this.rules = [
            {
                conditions: {
                    distance: x => Math.max(0, 1 - x/3),
                    threat: x => x >= 0.7 ? 1 : 0
                },
                action: this.immediateCatch,
                weight: 15.0
            },
            {
                conditions: {
                    distance: x => Math.max(0, 1 - x/8),
                    opponents: x => x ? 1 : 0
                },
                action: this.emergencyKick,
                weight: 12.0
            },
            // {
            //     conditions: {
            //         distance: x => Math.max(0, 1 - x/15),
            //         teammate: x => x ? 1 : 0
            //     },
            //     action: this.passToTeammate,
            //     weight: 8.0
            // },
            {
                conditions: {
                    distance: x => Math.min(1, x/25)
                },
                action: this.activeDefense,
                weight: 5.0
            },
            {
                conditions: {
                    distance: x => Math.min(1, x/60)
                },
                action: this.returnToBase,
                weight: 3.0
            }
        ];
    }

    evaluate(state) {
        const inputs = this.prepareInputs(state);
        let maxActivation = 0;
        let bestAction = null;

        for (const rule of this.rules) {
            const activation = Math.min(
                ...Object.entries(rule.conditions)
                    .map(([param, fn]) => inputs[param] !== undefined ? fn(inputs[param]) : 0)
            ) * rule.weight;
            
            if (activation > maxActivation) {
                maxActivation = activation;
                bestAction = rule.action;
            }
        }

        return bestAction?.(state) || this.defaultBehavior(state);
    }

    prepareInputs(state) {
        return {
            distance: this._calculateBallDistance(state),
            threat: this.calculateThreat(state),
            opponents: this.nearOpponents(state),
            teammate: this.hasTeammate(state)
        };
    }

    nearOpponents(state) {
        if (!state.ball || !state.enemyTeam) return false;
        const ballPos = this._getBallPosition(state);
        return state.enemyTeam.some(opponent => 
            opponent.x && opponent.y &&
            this._euclideanDistance(opponent, ballPos) < this.OPPONENT_DANGER_DIST
        );
    }

    hasTeammate(state) {
        const goaliePos = this._getGoaliePosition(state);
        return state.myTeam?.some(player => 
            player.x && player.y &&
            this._euclideanDistance(player, goaliePos) < 10
        ) || false;
    }

    calculateThreat(state) {
        const ballDist = this._calculateBallDistance(state);
        return Math.min(1, 
            (1 - ballDist/this.BALL_DANGER_DIST) + 
            (this.nearOpponents(state) ? 0.5 : 0)
        );
    }

    immediateCatch(state) {
        return {action: 'catch', power: 1.0};
    }

    emergencyKick(state) {
        return {action: 'kick', direction: this.side === 'l' ? 45 : 135, power: 0.8};
    }

    activeDefense(state) {
        const ballPos = this._getBallPosition(state);
        return ballPos ? {action: 'move', target: ballPos} : this.returnToBase(state);
    }

    returnToBase(state) {
        return {action: 'move', target: {x: this.BASE_X, y: 0}};
    }

    defaultBehavior(state) {
        return {action: 'STAY'};
    }

    _calculateBallDistance(state) {
        const goaliePos = this._getGoaliePosition(state);
        const ballPos = this._getBallPosition(state);
        return ballPos ? this._euclideanDistance(goaliePos, ballPos) : Infinity;
    }

    _getGoaliePosition(state) {
        return state.pos || {x: this.BASE_X, y: 0};
    }

    _getBallPosition(state) {
        return state.ball?.x !== undefined ? state.ball : null;
    }

    _euclideanDistance(pos1, pos2) {
        return Math.sqrt(
            (pos1.x - pos2.x) ** 2 + 
            (pos1.y - pos2.y) ** 2
        );
    }
}

module.exports = FuzzyGoalie;