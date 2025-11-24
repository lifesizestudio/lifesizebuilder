export class BuildingLayer {
    constructor(stage, store) {
        this.stage = stage;
        this.store = store;
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        this.currentWall = null; // The wall currently being drawn
        this.isDrawing = false;

        this.store.subscribe((state) => {
            this.render();
        });
    }

    // Convert screen coordinates to grid coordinates
    getGridPos(pointer) {
        const gridSize = this.store.state.gridSize;
        const x = Math.round(pointer.x / gridSize) * gridSize;
        const y = Math.round(pointer.y / gridSize) * gridSize;
        return { x, y };
    }

    onMouseDown(pos) {
        if (this.store.state.tool === 'wall') {
            this.isDrawing = true;
            const gridPos = this.getGridPos(pos);

            this.currentWall = new Konva.Line({
                points: [gridPos.x, gridPos.y, gridPos.x, gridPos.y],
                stroke: '#555',
                strokeWidth: 10,
                lineCap: 'round',
                lineJoin: 'round'
            });
            this.layer.add(this.currentWall);
        }
    }

    onMouseMove(pos) {
        if (this.isDrawing && this.currentWall) {
            const gridPos = this.getGridPos(pos);
            const points = this.currentWall.points();
            // Update end point
            points[2] = gridPos.x;
            points[3] = gridPos.y;
            this.currentWall.points(points);
            this.layer.batchDraw();
        }
    }

    onMouseUp(pos) {
        if (this.isDrawing && this.currentWall) {
            this.isDrawing = false;
            const points = this.currentWall.points();

            // Don't add zero-length walls
            if (points[0] !== points[2] || points[1] !== points[3]) {
                const wallData = {
                    id: crypto.randomUUID(),
                    start: { x: points[0], y: points[1] },
                    end: { x: points[2], y: points[3] },
                    thickness: 10
                };
                this.store.addWall(wallData);
            }

            // Remove the temporary Konva shape, we'll re-render from store
            this.currentWall.destroy();
            this.currentWall = null;
            this.render();
        }
    }

    render() {
        this.layer.destroyChildren();
        const walls = this.store.state.walls;

        walls.forEach(wall => {
            const line = new Konva.Line({
                points: [wall.start.x, wall.start.y, wall.end.x, wall.end.y],
                stroke: '#555',
                strokeWidth: wall.thickness,
                lineCap: 'square',
                id: wall.id
            });
            this.layer.add(line);
        });

        this.layer.batchDraw();
    }
}
