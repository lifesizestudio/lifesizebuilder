import { BuildingLayer } from './BuildingLayer.js';
import { FurnitureLayer } from './FurnitureLayer.js';

export class Stage {
    constructor(containerId, store) {
        this.containerId = containerId;
        this.store = store;
        this.stage = null;
        this.gridLayer = null;
        this.buildingLayer = null;
    }

    init() {
        const container = document.getElementById(this.containerId);
        const width = container.offsetWidth;
        const height = container.offsetHeight;

        this.stage = new Konva.Stage({
            container: this.containerId,
            width: width,
            height: height,
            draggable: true
        });

        this.gridLayer = new Konva.Layer();
        this.stage.add(this.gridLayer);

        // Initialize Building Layer
        this.buildingLayer = new BuildingLayer(this.stage, this.store);

        // Initialize Furniture Layer
        this.furnitureLayer = new FurnitureLayer(this.stage, this.store);

        this.renderGrid();
        this.setupEvents();

        // Handle window resize
        window.addEventListener('resize', () => {
            const container = document.getElementById(this.containerId);
            this.stage.width(container.offsetWidth);
            this.stage.height(container.offsetHeight);
            this.renderGrid();
        });
    }

    getRelativePointerPosition() {
        const transform = this.stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = this.stage.getPointerPosition();
        return transform.point(pos);
    }

    renderGrid() {
        this.gridLayer.destroyChildren();

        const width = this.stage.width();
        const height = this.stage.height();
        const gridSize = this.store.state.gridSize;

        // Simple grid implementation
        const limit = 2000;

        for (let i = -limit; i <= limit; i += gridSize) {
            this.gridLayer.add(new Konva.Line({
                points: [i, -limit, i, limit],
                stroke: '#333',
                strokeWidth: 1,
            }));
            this.gridLayer.add(new Konva.Line({
                points: [-limit, i, limit, i],
                stroke: '#333',
                strokeWidth: 1,
            }));
        }

        this.gridLayer.batchDraw();
    }

    setupEvents() {
        // Zoom handling
        this.stage.on('wheel', (e) => {
            e.evt.preventDefault();
            const scaleBy = 1.1;
            const oldScale = this.stage.scaleX();
            const pointer = this.stage.getPointerPosition();

            const mousePointTo = {
                x: (pointer.x - this.stage.x()) / oldScale,
                y: (pointer.y - this.stage.y()) / oldScale,
            };

            let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

            // Limit scale
            newScale = Math.max(0.1, Math.min(newScale, 5));

            this.stage.scale({ x: newScale, y: newScale });

            const newPos = {
                x: pointer.x - mousePointTo.x * newScale,
                y: pointer.y - mousePointTo.y * newScale,
            };
            this.stage.position(newPos);

            this.store.updateStage(newPos, newScale);
        });

        // Tool Interaction
        this.stage.on('mousedown touchstart', (e) => {
            // If dragging stage (middle mouse or spacebar equivalent), ignore tool
            if (e.evt.button === 1) return;

            const pos = this.getRelativePointerPosition();

            if (this.store.state.tool === 'wall') {
                this.stage.draggable(false); // Disable stage drag while drawing
                this.buildingLayer.onMouseDown(pos);
            }
        });

        this.stage.on('mousemove touchmove', (e) => {
            const pos = this.getRelativePointerPosition();
            this.buildingLayer.onMouseMove(pos);
            this.furnitureLayer.onMouseMove(pos);
        });

        this.stage.on('mouseup touchend', (e) => {
            const pos = this.getRelativePointerPosition();
            this.buildingLayer.onMouseUp(pos);
            this.furnitureLayer.onMouseUp(pos);
            this.stage.draggable(true); // Re-enable stage drag
        });
    }
}
