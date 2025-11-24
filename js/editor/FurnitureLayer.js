export class FurnitureLayer {
    constructor(stage, store) {
        this.stage = stage;
        this.store = store;
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        this.ghost = null; // Preview item

        this.store.subscribe((state) => {
            this.render();
        });
    }

    getGridPos(pointer) {
        const gridSize = this.store.state.gridSize;
        const x = Math.round(pointer.x / gridSize) * gridSize;
        const y = Math.round(pointer.y / gridSize) * gridSize;
        return { x, y };
    }

    onMouseMove(pos) {
        if (this.store.state.tool === 'furniture' && this.store.state.selectedAsset) {
            const gridPos = this.getGridPos(pos);

            if (!this.ghost) {
                // Create ghost if not exists
                this.ghost = new Konva.Rect({
                    width: 40,
                    height: 40,
                    fill: 'rgba(0, 255, 0, 0.5)',
                    stroke: 'green',
                    strokeWidth: 1
                });
                this.layer.add(this.ghost);
            }

            this.ghost.position({
                x: gridPos.x - 20, // Center it
                y: gridPos.y - 20
            });
            this.layer.batchDraw();
        } else if (this.ghost) {
            this.ghost.destroy();
            this.ghost = null;
            this.layer.batchDraw();
        }
    }

    onMouseUp(pos) {
        if (this.store.state.tool === 'furniture' && this.store.state.selectedAsset) {
            const gridPos = this.getGridPos(pos);

            const item = {
                id: crypto.randomUUID(),
                type: this.store.state.selectedAsset,
                x: gridPos.x - 20,
                y: gridPos.y - 20,
                width: 40,
                height: 40,
                rotation: 0
            };

            this.store.addFurniture(item);

            // Optional: Reset tool after placement or keep it for multiple placements
            // this.store.setTool('select'); 
        }
    }

    render() {
        // We don't destroy children here blindly because we might have the ghost
        // So let's destroy only non-ghost items or manage them better.
        // For simplicity, let's clear and redraw everything, re-adding ghost if needed.

        this.layer.destroyChildren();

        const furniture = this.store.state.furniture;
        furniture.forEach(item => {
            const rect = new Konva.Rect({
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                fill: '#888',
                stroke: '#333',
                strokeWidth: 1,
                draggable: true,
                id: item.id,
                name: 'furniture'
            });

            // Handle drag end to update store
            rect.on('dragend', (e) => {
                // In a real app, we'd update the store with new position
                console.log('Moved furniture', item.id, e.target.position());
            });

            this.layer.add(rect);
        });

        if (this.ghost) {
            this.layer.add(this.ghost);
        }

        this.layer.batchDraw();
    }
}
