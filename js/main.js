import { Stage } from './editor/Stage.js';
import { Toolbar } from './ui/Toolbar.js';
import { AssetBrowser } from './ui/AssetBrowser.js';
import { Store } from './state/Store.js';

console.log('Initializing BTO Designer...');

// Initialize State Store
const store = new Store();

// Initialize Editor Stage
const stage = new Stage('canvas-container', store);

// Initialize UI Components
const toolbar = new Toolbar('toolbar', store);
const assetBrowser = new AssetBrowser('asset-browser', store);

// Initial render
stage.init();
toolbar.render();
assetBrowser.render();

console.log('BTO Designer Initialized');
