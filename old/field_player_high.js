const CTRL_HIGH_PLAYER = {
    execute(taken, controllers, fuzzy) {
        const state = taken.state;
        
        // Используем актуальные данные о мяче из fuzzy
        const ballPos = fuzzy.lastKnownBallPos;
        
        // Расчет целевой позиции через fuzzy-логику
        const targetPos = this._calculateStrategicPosition(taken, ballPos);
        
        // Навигация с учетом текущего направления
        const dx = targetPos.x - state.pos.x;
        const dy = targetPos.y - state.pos.y;
        const targetAngle = Math.atan2(dy, dx) * 180/Math.PI;
        const angleDiff = targetAngle - (state.direction || 0);

        // Адаптивный поворот
        if (Math.abs(angleDiff) > 30) {
            return {n: 'turn', v: angleDiff * 0.7};
        }
        
        // Расчет скорости на основе расстояния
        const distance = Math.hypot(dx, dy);
        return {n: 'dash', v: Math.min(100, 40 + distance * 3)};
    },

    _calculateStrategicPosition(taken, ballPos) {
        // Динамическая позиция в зависимости от роли
        const baseX = taken.start_x + (ballPos.x - taken.start_x) * 0.4;
        const baseY = taken.start_y + (ballPos.y - taken.start_y) * 0.3;
        
        return {
            x: this._clamp(baseX, -50, 50),
            y: this._clamp(baseY, -30, 30)
        };
    },

    _clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
};