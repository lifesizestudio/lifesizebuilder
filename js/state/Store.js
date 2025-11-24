export class Store {
    constructor() {
        this.state = {
            tool: 'select', // select, wall, door, window
            selectedId: null,
            gridSize: 20,
            scale: 1,
            stagePos: { x: 0, y: 0 },
            walls: [],
            furniture: []
        };
        this.listeners = [];
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
    }

    setState(newState) {
        this.state = { ...this.state, ...newState };
        this.notify();
    }

    // Actions
    setTool(tool) {
        this.setState({ tool });
    }

    addWall(wall) {
        this.setState({ walls: [...this.state.walls, wall] });
    }

    addFurniture(item) {
        this.setState({ furniture: [...this.state.furniture, item] });
    }

    setSelectedAsset(assetId) {
        this.setState({ selectedAsset: assetId, tool: 'furniture' });
    }

    loadTemplate(templateData) {
        this.setState({
            walls: templateData.walls,
            furniture: templateData.furniture
        });
    }

    updateStage(pos, scale) {
        this.setState({ stagePos: pos, scale });
    }
}
