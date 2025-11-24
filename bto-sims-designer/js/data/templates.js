export const templates = {
    '4-Room': {
        walls: [
            // Living Room / Dining
            { id: 'w1', start: { x: 0, y: 0 }, end: { x: 400, y: 0 }, thickness: 10 },
            { id: 'w2', start: { x: 400, y: 0 }, end: { x: 400, y: 300 }, thickness: 10 },
            { id: 'w3', start: { x: 400, y: 300 }, end: { x: 0, y: 300 }, thickness: 10 },
            { id: 'w4', start: { x: 0, y: 300 }, end: { x: 0, y: 0 }, thickness: 10 },

            // Household Shelter (Bomb Shelter) - Thicker walls
            { id: 'bs1', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, thickness: 20 },
            { id: 'bs2', start: { x: 100, y: 0 }, end: { x: 100, y: 150 }, thickness: 20 },
            { id: 'bs3', start: { x: 100, y: 150 }, end: { x: 0, y: 150 }, thickness: 20 },
            { id: 'bs4', start: { x: 0, y: 150 }, end: { x: 0, y: 0 }, thickness: 20 },
        ],
        furniture: [
            { id: 'f1', type: 'table', x: 200, y: 150, width: 60, height: 40, rotation: 0 }
        ]
    },
    '3-Room': {
        walls: [
            { id: 'w1', start: { x: 0, y: 0 }, end: { x: 300, y: 0 }, thickness: 10 },
            { id: 'w2', start: { x: 300, y: 0 }, end: { x: 300, y: 200 }, thickness: 10 },
            { id: 'w3', start: { x: 300, y: 200 }, end: { x: 0, y: 200 }, thickness: 10 },
            { id: 'w4', start: { x: 0, y: 200 }, end: { x: 0, y: 0 }, thickness: 10 },
        ],
        furniture: []
    }
};
