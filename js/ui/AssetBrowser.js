export class AssetBrowser {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;
    }

    render() {
        this.container.innerHTML = `
            <div style="padding: 10px; font-weight: bold; color: #aaa;">Furniture</div>
            <div class="asset-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button class="asset-btn" data-type="chair" style="padding: 10px; background: #333; border: 1px solid #444; color: white; cursor: pointer;">
                    Chair
                </button>
                <button class="asset-btn" data-type="table" style="padding: 10px; background: #333; border: 1px solid #444; color: white; cursor: pointer;">
                    Table
                </button>
                <button class="asset-btn" data-type="bed" style="padding: 10px; background: #333; border: 1px solid #444; color: white; cursor: pointer;">
                    Bed
                </button>
            </div>
        `;

        this.container.querySelectorAll('.asset-btn').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                this.store.setSelectedAsset(type);
            };
        });
    }
}
