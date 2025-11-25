// BTO Designer 3D - Bundled Script

// ==========================================
// DATA: Templates
// ==========================================
const templates = {
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

// ==========================================
// DATA: Persistence (IndexedDB)
// ==========================================
class DBManager {
    constructor() {
        this.dbName = 'BTO_Designer_DB';
        this.storeName = 'custom_assets';
        this.db = null;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = (event) => {
                console.error("IndexedDB error:", event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log("IndexedDB initialized");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    }

    saveAsset(asset) {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(asset);

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    getAllAssets() {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("DB not initialized");
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }
}

// ==========================================
// STATE: Store
// ==========================================
class Store {
    constructor() {
        this.state = {
            tool: 'select',
            selectedAsset: null,
            gridSize: 20,
            walls: [],
            furniture: [],
            doors: [],
            floorPlan: null,
            floorPlan: null,
            autoBuildTrigger: 0,
            autoBuildThreshold: 120, // Default sensitivity
            calibrationFactor: null, // units per meter
            customAssets: [] // { id, name, url, type }
        };
        this.listeners = [];
        this.dbManager = new DBManager();
    }

    async init() {
        try {
            await this.dbManager.init();
            const assets = await this.dbManager.getAllAssets();
            // Convert stored blobs back to URLs
            const processedAssets = assets.map(asset => ({
                ...asset,
                url: URL.createObjectURL(asset.blob)
            }));
            this.setState({ customAssets: processedAssets });
            console.log(`Loaded ${processedAssets.length} custom assets from DB`);
        } catch (e) {
            console.error("Failed to load assets from DB:", e);
        }
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

    setTool(tool) {
        this.setState({ tool });
    }

    addWall(wall) {
        this.setState({ walls: [...this.state.walls, wall] });
    }

    addFurniture(item) {
        // If selected asset is custom, add extra info
        const customAsset = this.state.customAssets.find(a => a.id === this.state.selectedAsset);
        if (customAsset) {
            item.isCustom = true;
            item.url = customAsset.url;
            item.modelType = customAsset.type;
        }
        this.setState({ furniture: [...this.state.furniture, item] });
    }

    addDoor(door) {
        this.setState({ doors: [...this.state.doors, door] });
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

    setFloorPlan(imageData) {
        this.setState({ floorPlan: imageData });
    }

    triggerAutoBuild() {
        this.setState({ autoBuildTrigger: Date.now() });
    }

    setCalibrationFactor(factor) {
        this.setState({ calibrationFactor: factor });
    }

    setAutoBuildThreshold(value) {
        this.setState({ autoBuildThreshold: value });
    }

    clearAll() {
        this.setState({
            walls: [],
            furniture: [],
            doors: [],
            floorPlan: null,
            autoBuildTrigger: 0,
            calibrationFactor: null,
            tool: 'select',
            selectedAsset: null,
            customAssets: []
        });
    }

    addCustomAsset(asset) {
        // asset: { id, name, url, type, blob }
        // We save the blob to DB, but keep the URL for the session
        this.setState({ customAssets: [...this.state.customAssets, asset] });

        if (asset.blob) {
            this.dbManager.saveAsset({
                id: asset.id,
                name: asset.name,
                type: asset.type,
                blob: asset.blob
            }).catch(e => console.error("Error saving asset to DB:", e));
        }
    }
}

// ==========================================
// 3D ENGINE
// ==========================================
function generateId() {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
}

class Engine3D {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;

        // Scene Setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a); // Darker background

        // Camera
        const aspect = this.container.offsetWidth / this.container.offsetHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 1, 10000);
        this.camera.position.set(500, 800, 500);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enableZoom = true;
        this.controls.mouseButtons = {
            LEFT: null, // Disable default left click orbit so we can use it for building
            MIDDLE: THREE.MOUSE.PAN,
            RIGHT: THREE.MOUSE.ROTATE
        };

        // FPS Controls
        this.fpsControls = new THREE.PointerLockControls(this.camera, document.body);
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isFpsMode = false;

        // Calibration
        this.isCalibrating = false;
        this.calibrationPoints = [];
        this.calibrationMarkers = [];

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft white light
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(100, 200, 50);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 2000;
        dirLight.shadow.camera.left = -1000;
        dirLight.shadow.camera.right = 1000;
        dirLight.shadow.camera.top = 1000;
        dirLight.shadow.camera.bottom = -1000;
        this.scene.add(dirLight);

        // Grid & Ground
        const gridHelper = new THREE.GridHelper(2000, 100, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
        planeGeometry.rotateX(-Math.PI / 2);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        this.groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);

        // Invisible plane for Raycasting
        const hitPlaneGeo = new THREE.PlaneGeometry(2000, 2000);
        hitPlaneGeo.rotateX(-Math.PI / 2);
        this.hitPlane = new THREE.Mesh(hitPlaneGeo, new THREE.MeshBasicMaterial({ visible: true, opacity: 0, transparent: true }));
        this.scene.add(this.hitPlane);

        // Groups
        this.wallGroup = new THREE.Group();
        this.scene.add(this.wallGroup);

        this.furnitureGroup = new THREE.Group();
        this.scene.add(this.furnitureGroup);

        this.doorGroup = new THREE.Group();
        this.scene.add(this.doorGroup);

        // Interaction
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.isDrawing = false;
        this.tempWall = null;
        this.ghost = null;

        // Bind Events
        this.setupEvents();

        // Render Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Subscribe to store
        this.lastAutoBuildTrigger = 0;
        this.store.subscribe(() => this.updateScene());
    }

    setupEvents() {
        window.addEventListener('resize', () => {
            this.camera.aspect = this.container.offsetWidth / this.container.offsetHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.container.offsetWidth, this.container.offsetHeight);
        });

        this.renderer.domElement.addEventListener('pointermove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('pointerdown', (e) => this.onMouseDown(e));
        this.renderer.domElement.addEventListener('pointerup', (e) => this.onMouseUp(e));

        // FPS Key Events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    }

    toggleCameraMode() {
        this.isFpsMode = !this.isFpsMode;
        if (this.isFpsMode) {
            this.controls.enabled = false;
            this.fpsControls.lock();
            this.camera.position.set(500, 180, 500); // Eye level 180cm
            this.camera.lookAt(500, 180, 0);
        } else {
            this.fpsControls.unlock();
            this.controls.enabled = true;
            this.camera.position.set(500, 800, 500);
            this.camera.lookAt(0, 0, 0);
        }
    }

    getRayIntersection(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.hitPlane);

        if (intersects.length > 0) {
            return intersects[0].point;
        }
        return null;
    }

    snapToGrid(point) {
        const gridSize = this.store.state.gridSize;
        return {
            x: Math.round(point.x / gridSize) * gridSize,
            y: 0,
            z: Math.round(point.z / gridSize) * gridSize
        };
    }

    onMouseDown(event) {
        if (event.button !== 0) return; // Only left click

        if (this.isFpsMode) {
            this.fpsControls.lock();
            return;
        }

        // Calculate mouse position in normalized device coordinates
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        // Calibration Logic
        if (this.isCalibrating) {
            // Intersect hitPlane, floorPlanMesh, and groundPlane to ensure we catch the click
            const intersectObjects = [this.hitPlane, this.groundPlane];
            if (this.floorPlanMesh) intersectObjects.push(this.floorPlanMesh);

            const intersects = this.raycaster.intersectObjects(intersectObjects);

            if (intersects.length > 0) {
                const point = intersects[0].point;
                console.log("Calibration point clicked:", point);
                this.calibrationPoints.push(point);

                // Visual Marker
                const markerGeo = new THREE.SphereGeometry(5, 16, 16);
                const markerMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
                const marker = new THREE.Mesh(markerGeo, markerMat);
                marker.position.copy(point);
                this.scene.add(marker);
                this.calibrationMarkers.push(marker);

                // Update Overlay
                const overlay = document.getElementById('calibration-overlay');
                if (overlay) {
                    if (this.calibrationPoints.length === 1) {
                        overlay.innerHTML = '<strong>Calibration Mode</strong><br>Click the second point.';
                    } else if (this.calibrationPoints.length === 2) {
                        overlay.innerHTML = '<strong>Calibration Mode</strong><br>Enter distance...';
                    }
                }

                if (this.calibrationPoints.length === 2) {
                    const p1 = this.calibrationPoints[0];
                    const p2 = this.calibrationPoints[1];
                    const dist = p1.distanceTo(p2);
                    console.log("Calibration distance (units):", dist);

                    // Show Input Modal
                    this.showCalibrationInput(dist);
                }
            }
            return;
        }

        const point = this.getRayIntersection(event);
        if (!point) return;

        const gridPos = this.snapToGrid(point);

        if (this.store.state.tool === 'wall') {
            this.isDrawing = true;
            this.drawStart = gridPos;

            // Create temp wall visual
            const geometry = new THREE.BoxGeometry(10, 260, 10);
            const material = new THREE.MeshStandardMaterial({ color: 0x4CAF50, transparent: true, opacity: 0.6 });
            this.tempWall = new THREE.Mesh(geometry, material);
            this.tempWall.position.set(gridPos.x, 130, gridPos.z);
            this.scene.add(this.tempWall);
        }
    }

    onMouseMove(event) {
        const point = this.getRayIntersection(event);
        if (!point) return;

        // Calibration Visual Aid
        if (this.isCalibrating) {
            this.container.style.cursor = 'crosshair';
            if (this.calibrationPoints.length === 1) {
                if (!this.calibrationLine) {
                    const material = new THREE.LineBasicMaterial({ color: 0xff00ff });
                    const geometry = new THREE.BufferGeometry().setFromPoints([this.calibrationPoints[0], point]);
                    this.calibrationLine = new THREE.Line(geometry, material);
                    this.scene.add(this.calibrationLine);
                } else {
                    this.calibrationLine.geometry.setFromPoints([this.calibrationPoints[0], point]);
                }
            }
        } else {
            if (this.calibrationLine) {
                this.scene.remove(this.calibrationLine);
                this.calibrationLine = null;
            }
        }

        const gridPos = this.snapToGrid(point);

        // Wall Drawing Preview
        if (this.isDrawing && this.tempWall) {
            const dx = gridPos.x - this.drawStart.x;
            const dz = gridPos.z - this.drawStart.z;
            const len = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dz, dx);
            const displayLen = Math.max(len, 10);

            this.tempWall.geometry.dispose(); // Clean up old geometry
            this.tempWall.geometry = new THREE.BoxGeometry(displayLen, 260, 10);

            this.tempWall.position.set(
                this.drawStart.x + dx / 2,
                130,
                this.drawStart.z + dz / 2
            );
            this.tempWall.rotation.y = -angle;
        }

        // Furniture Ghost
        if (this.store.state.tool === 'furniture' && this.store.state.selectedAsset) {
            if (!this.ghost) {
                let geometry;
                if (this.store.state.selectedAsset === 'table') geometry = new THREE.CylinderGeometry(20, 20, 40, 32);
                else if (this.store.state.selectedAsset === 'bed') geometry = new THREE.BoxGeometry(60, 20, 80);
                else geometry = new THREE.BoxGeometry(30, 30, 30);

                const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.5 });
                this.ghost = new THREE.Mesh(geometry, material);
                this.scene.add(this.ghost);
            }
            this.ghost.position.set(gridPos.x, 20, gridPos.z);
        } else if (this.ghost && this.store.state.tool !== 'furniture') {
            this.scene.remove(this.ghost);
            this.ghost = null;
        }
    }
    autoBuildWalls(image) {
        // 1. Draw to offscreen canvas to read pixels
        const canvas = document.createElement('canvas');
        // Use a max dimension to avoid huge canvas processing
        const maxDim = 1024;
        let width = image.width;
        let height = image.height;

        if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width *= ratio;
            height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Debug Visualization in 3D
        if (this.debugGroup) {
            this.scene.remove(this.debugGroup);
        }
        this.debugGroup = new THREE.Group();
        this.scene.add(this.debugGroup);

        const detectedWalls = [];
        const detectedDoors = [];
        const scaleX = 1000 / width;
        const scaleY = (1000 / (width / height)) / height;

        const threshold = this.store.state.autoBuildThreshold;
        const step = 2;
        const minLength = 20;
        const minDoorWidth = 20; // ~20-30 pixels in this scale
        const maxDoorWidth = 120;

        // Helper to add debug line
        const addDebugLine = (x1, y1, x2, y2, color = 0xff0000) => {
            const points = [];
            points.push(new THREE.Vector3(x1 * scaleX, 5, y1 * scaleY)); // Slightly above floor
            points.push(new THREE.Vector3(x2 * scaleX, 5, y2 * scaleY));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({ color: color });
            const line = new THREE.Line(geometry, material);
            this.debugGroup.add(line);
        };

        // Scan Horizontal Lines
        for (let y = 0; y < canvas.height; y += step * 2) {
            let startX = -1;
            let lastEndX = -1;

            for (let x = 0; x < canvas.width; x += step) {
                const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const isDark = brightness < threshold && data[i + 3] > 128;

                if (isDark) {
                    if (startX === -1) startX = x;
                } else {
                    if (startX !== -1) {
                        if (x - startX > minLength) {
                            // Wall found
                            detectedWalls.push({
                                id: generateId(),
                                start: { x: startX * scaleX, y: y * scaleY },
                                end: { x: x * scaleX, y: y * scaleY },
                                thickness: 10
                            });
                            addDebugLine(startX, y, x, y, 0xff0000); // Red for walls

                            // Check for door gap
                            if (lastEndX !== -1) {
                                const gap = startX - lastEndX;
                                if (gap > minDoorWidth && gap < maxDoorWidth) {
                                    detectedDoors.push({
                                        id: generateId(),
                                        x: (lastEndX + gap / 2) * scaleX,
                                        y: y * scaleY,
                                        width: gap * scaleX,
                                        height: 213, // Door height 7ft (~213cm)
                                        rotation: 0
                                    });
                                    addDebugLine(lastEndX, y, startX, y, 0x0000ff); // Blue for doors
                                }
                            }
                            lastEndX = x;
                        }
                        startX = -1;
                    }
                }
            }
            // Catch line at end of row
            if (startX !== -1 && canvas.width - startX > minLength) {
                detectedWalls.push({
                    id: generateId(),
                    start: { x: startX * scaleX, y: y * scaleY },
                    end: { x: canvas.width * scaleX, y: y * scaleY },
                    thickness: 10
                });
                addDebugLine(startX, y, canvas.width, y, 0xff0000);
            }
        }

        // Scan Vertical Lines
        for (let x = 0; x < canvas.width; x += step * 2) {
            let startY = -1;
            let lastEndY = -1;

            for (let y = 0; y < canvas.height; y += step) {
                const i = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const isDark = brightness < threshold && data[i + 3] > 128;

                if (isDark) {
                    if (startY === -1) startY = y;
                } else {
                    if (startY !== -1) {
                        if (y - startY > minLength) {
                            detectedWalls.push({
                                id: generateId(),
                                start: { x: x * scaleX, y: startY * scaleY },
                                end: { x: x * scaleX, y: y * scaleY },
                                thickness: 10
                            });
                            addDebugLine(x, startY, x, y, 0xff0000);

                            // Check for door gap
                            if (lastEndY !== -1) {
                                const gap = startY - lastEndY;
                                if (gap > minDoorWidth && gap < maxDoorWidth) {
                                    detectedDoors.push({
                                        id: generateId(),
                                        x: x * scaleX,
                                        y: (lastEndY + gap / 2) * scaleY,
                                        width: gap * scaleY, // Width is along Y axis effectively
                                        height: 213,
                                        rotation: Math.PI / 2
                                    });
                                    addDebugLine(x, lastEndY, x, startY, 0x0000ff);
                                }
                            }
                            lastEndY = y;
                        }
                        startY = -1;
                    }
                }
            }
            // Catch line at end of col
            if (startY !== -1 && canvas.height - startY > minLength) {
                detectedWalls.push({
                    id: generateId(),
                    start: { x: x * scaleX, y: startY * scaleY },
                    end: { x: x * scaleX, y: canvas.height * scaleY },
                    thickness: 10
                });
                addDebugLine(x, startY, x, canvas.height, 0xff0000);
            }
        }

        alert(`Auto-detected ${detectedWalls.length} wall segments and ${detectedDoors.length} doors. Red lines = Walls, Blue lines = Doors.`);

        // Add to store
        detectedWalls.forEach(w => this.store.addWall(w));
        detectedDoors.forEach(d => this.store.addDoor(d));
    }

    onMouseUp(event) {
        if (this.isDrawing && this.tempWall) {
            this.isDrawing = false;
            this.scene.remove(this.tempWall);
            this.tempWall = null;

            const point = this.getRayIntersection(event);
            if (point) {
                const gridPos = this.snapToGrid(point);
                if (this.drawStart.x !== gridPos.x || this.drawStart.z !== gridPos.z) {
                    this.store.addWall({
                        id: generateId(),
                        start: { x: this.drawStart.x, y: this.drawStart.z },
                        end: { x: gridPos.x, y: gridPos.z },
                        thickness: 10
                    });
                }
            }
        }

        if (this.store.state.tool === 'furniture' && this.store.state.selectedAsset) {
            const point = this.getRayIntersection(event);
            if (point) {
                const gridPos = this.snapToGrid(point);
                this.store.addFurniture({
                    id: generateId(),
                    type: this.store.state.selectedAsset,
                    x: gridPos.x,
                    y: gridPos.z,
                    width: 40,
                    height: 40,
                    rotation: 0
                });
            }
        }
    }
    startCalibration() {
        console.log("Starting calibration...");
        this.isCalibrating = true;
        this.calibrationPoints = [];
        this.container.style.cursor = 'crosshair';

        // Create or show overlay
        let overlay = document.getElementById('calibration-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'calibration-overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '10px';
            overlay.style.left = '50%';
            overlay.style.transform = 'translateX(-50%)';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.color = 'white';
            overlay.style.padding = '10px 20px';
            overlay.style.borderRadius = '5px';
            overlay.style.fontFamily = 'Arial, sans-serif';
            overlay.style.zIndex = '1000';
            overlay.style.pointerEvents = 'none'; // Let clicks pass through
            this.container.appendChild(overlay);
        }
        overlay.style.display = 'block';
        overlay.innerHTML = '<strong>Calibration Mode</strong><br>Click the first point on the floor plan.';
    }

    showCalibrationInput(dist) {
        let modal = document.getElementById('calibration-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'calibration-modal';
            modal.style.position = 'absolute';
            modal.style.top = '50%';
            modal.style.left = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
            modal.style.backgroundColor = '#333';
            modal.style.color = 'white';
            modal.style.padding = '20px';
            modal.style.borderRadius = '8px';
            modal.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            modal.style.zIndex = '1001';
            modal.style.fontFamily = 'Arial, sans-serif';
            modal.style.textAlign = 'center';

            modal.innerHTML = `
                <h3 style="margin-top:0">Set Scale</h3>
                <p>Enter real-world distance between points:</p>
                <input type="text" id="cal-input" placeholder="e.g. 5 or 5000mm" style="padding: 8px; width: 200px; margin-bottom: 10px;">
                <br>
                <button id="cal-confirm" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Confirm</button>
                <button id="cal-cancel" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Cancel</button>
            `;
            this.container.appendChild(modal);

            document.getElementById('cal-confirm').onclick = () => this.handleCalibrationSubmit(dist);
            document.getElementById('cal-cancel').onclick = () => this.cancelCalibration();
        }
        modal.style.display = 'block';
        const input = document.getElementById('cal-input');
        input.value = '';
        input.focus();
    }

    handleCalibrationSubmit(dist) {
        const input = document.getElementById('cal-input');
        let userDistStr = input.value;

        if (userDistStr) {
            userDistStr = userDistStr.toLowerCase().trim();
            let isMM = false;
            if (userDistStr.endsWith('mm')) {
                isMM = true;
                userDistStr = userDistStr.replace('mm', '');
            }

            let userDist = parseFloat(userDistStr);

            if (!isNaN(userDist)) {
                if (isMM || userDist > 100) {
                    userDist = userDist / 1000;
                }

                const factor = dist / userDist;
                console.log("Calibration factor set:", factor);
                this.store.setCalibrationFactor(factor);

                // Hide UI
                document.getElementById('calibration-modal').style.display = 'none';
                document.getElementById('calibration-overlay').style.display = 'none';

                // Cleanup
                this.isCalibrating = false;
                this.container.style.cursor = 'default';
                this.calibrationPoints = [];
                this.calibrationMarkers.forEach(m => this.scene.remove(m));
                this.calibrationMarkers = [];
                if (this.calibrationLine) {
                    this.scene.remove(this.calibrationLine);
                    this.calibrationLine = null;
                }
                this.updateScene();
            } else {
                alert("Invalid number entered.");
            }
        }
    }

    cancelCalibration() {
        document.getElementById('calibration-modal').style.display = 'none';
        document.getElementById('calibration-overlay').style.display = 'none';
        this.isCalibrating = false;
        this.container.style.cursor = 'default';
        this.calibrationPoints = [];
        this.calibrationMarkers.forEach(m => this.scene.remove(m));
        this.calibrationMarkers = [];
        if (this.calibrationLine) {
            this.scene.remove(this.calibrationLine);
            this.calibrationLine = null;
        }
    }

    // Update Floor Plan Overlay
    updateScene() {
        if (this.store.state.floorPlan !== this.currentFloorPlan) {
            this.currentFloorPlan = this.store.state.floorPlan;

            if (this.store.state.floorPlan) {
                const loader = new THREE.TextureLoader();
                loader.load(this.store.state.floorPlan, (texture) => {
                    // Adjust aspect ratio
                    const imageAspect = texture.image.width / texture.image.height;
                    const width = 1000; // Fixed width for now
                    const height = width / imageAspect;

                    if (this.floorPlanMesh) this.scene.remove(this.floorPlanMesh);

                    const geometry = new THREE.PlaneGeometry(width, height);
                    geometry.rotateX(-Math.PI / 2);
                    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.5 });
                    this.floorPlanMesh = new THREE.Mesh(geometry, material);
                    this.floorPlanMesh.position.set(width / 2, 2, height / 2); // Center it roughly
                    this.floorPlanMesh.castShadow = true;
                    this.floorPlanMesh.receiveShadow = true;
                    this.scene.add(this.floorPlanMesh);
                });
            } else {
                // Remove floor plan if null
                if (this.floorPlanMesh) {
                    this.scene.remove(this.floorPlanMesh);
                    this.floorPlanMesh = null;
                }
            }
        }

        // Check for Auto-Build Trigger
        if (this.store.state.autoBuildTrigger > this.lastAutoBuildTrigger) {
            this.lastAutoBuildTrigger = this.store.state.autoBuildTrigger;
            if (this.store.state.floorPlan) {
                const img = new Image();
                img.onload = () => {
                    this.autoBuildWalls(img);
                };
                img.src = this.store.state.floorPlan;
            } else {
                alert("Please upload a floor plan first.");
            }
        }

        // Render Walls
        // Clear existing walls in group
        while (this.wallGroup.children.length > 0) {
            this.wallGroup.remove(this.wallGroup.children[0]);
        }

        this.store.state.walls.forEach(wall => {
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            const geometry = new THREE.BoxGeometry(len, 260, wall.thickness);
            const material = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            mesh.position.set(
                wall.start.x + dx / 2,
                130,
                wall.start.y + dy / 2
            );
            mesh.rotation.y = -angle;
            this.wallGroup.add(mesh);

            // Measurement Label
            if (this.store.state.calibrationFactor) {
                const meters = (len / this.store.state.calibrationFactor).toFixed(2) + 'm';

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = 256;
                canvas.height = 64;
                context.font = 'bold 40px Arial';
                context.fillStyle = 'white';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.strokeStyle = 'black';
                context.lineWidth = 4;
                context.strokeText(meters, 128, 32);
                context.fillText(meters, 128, 32);

                const texture = new THREE.CanvasTexture(canvas);
                const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
                const sprite = new THREE.Sprite(spriteMaterial);
                sprite.position.set(
                    wall.start.x + dx / 2,
                    300, // Above wall
                    wall.start.y + dy / 2
                );
                sprite.scale.set(100, 25, 1);
                this.wallGroup.add(sprite);
            }
        });

        // Render Furniture
        // Clear existing furniture
        while (this.furnitureGroup.children.length > 0) {
            this.furnitureGroup.remove(this.furnitureGroup.children[0]);
        }

        this.store.state.furniture.forEach(item => {
            if (item.isCustom) {
                // Custom 3D Model
                this.loadModel(item.url, item.modelType, (mesh) => {
                    mesh.position.set(item.x, 0, item.y); // Ground level
                    // Scale down if needed (simple heuristic)
                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = new THREE.Vector3();
                    box.getSize(size);
                    const maxDim = Math.max(size.x, size.y, size.z);
                    if (maxDim > 100) {
                        const scale = 100 / maxDim;
                        mesh.scale.set(scale, scale, scale);
                    }

                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    this.furnitureGroup.add(mesh);
                });
            } else {
                // Placeholder Geometry
                let geometry, color;

                if (item.type === 'table') {
                    geometry = new THREE.CylinderGeometry(20, 20, 40, 32);
                    color = 0x8B4513;
                } else if (item.type === 'bed') {
                    geometry = new THREE.BoxGeometry(60, 20, 80);
                    color = 0x000080;
                } else {
                    geometry = new THREE.BoxGeometry(30, 30, 30);
                    color = 0xff0000;
                }

                const material = new THREE.MeshStandardMaterial({ color: color });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(item.x, 15, item.y);
                this.furnitureGroup.add(mesh);
            }
        });

        // Render Doors
        // Clear existing doors
        while (this.doorGroup.children.length > 0) {
            this.doorGroup.remove(this.doorGroup.children[0]);
        }

        if (this.store.state.doors) {
            this.store.state.doors.forEach(door => {
                const geometry = new THREE.BoxGeometry(door.width, 213, 5);
                const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown door
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(door.x, 106.5, door.y); // Center Y = 213/2 = 106.5
                mesh.rotation.y = -door.rotation;
                this.doorGroup.add(mesh);
            });
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        if (this.isFpsMode && this.fpsControls.isLocked) {
            const delta = 0.015; // Smoother delta

            // Friction
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            // Acceleration
            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 4000.0 * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 4000.0 * delta;

            this.fpsControls.moveRight(-this.velocity.x * delta);
            this.fpsControls.moveForward(-this.velocity.z * delta);
        } else {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }

    zoomIn() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, 100);
        this.controls.update();
    }

    zoomOut() {
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.camera.position.addScaledVector(direction, -100);
        this.controls.update();
    }

    toggleViewMode() {
        this.is2DMode = !this.is2DMode;

        if (this.is2DMode) {
            // Switch to Top-Down 2D View
            this.controls.reset();
            this.camera.position.set(500, 1500, 500);
            this.camera.lookAt(500, 0, 500);
            this.controls.target.set(500, 0, 500);

            // Lock rotation for 2D feel
            this.controls.enableRotate = false;
            this.controls.maxPolarAngle = 0; // Lock to top-down
            this.controls.minPolarAngle = 0;

            // Enable Pan with Left Click (Standard for 2D)
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.PAN,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };
        } else {
            // Switch back to 3D View
            this.camera.position.set(500, 800, 500);
            this.camera.lookAt(500, 0, 500);
            this.controls.target.set(500, 0, 500);

            // Enable rotation
            this.controls.enableRotate = true;
            this.controls.maxPolarAngle = Math.PI; // Full range
            this.controls.minPolarAngle = 0;

            // Standard Orbit Controls
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT: THREE.MOUSE.PAN
            };
        }
        this.controls.update();
    }

    loadModel(url, type, onLoad) {
        const onLoaded = (object) => {
            // Optimization: Disable shadows for complex objects to reduce lag
            object.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = false; // Disable shadow casting
                    child.receiveShadow = false; // Disable shadow receiving
                    child.frustumCulled = true; // Ensure culling is on
                }
            });
            onLoad(object);
        };

        if (type === 'glb' || type === 'gltf') {
            const loader = new THREE.GLTFLoader();
            loader.load(url, (gltf) => {
                onLoaded(gltf.scene);
            }, undefined, (error) => {
                console.error('An error happened loading GLTF:', error);
            });
        } else if (type === 'obj') {
            const loader = new THREE.OBJLoader();
            loader.load(url, (object) => {
                onLoaded(object);
            }, undefined, (error) => {
                console.error('An error happened loading OBJ:', error);
            });
        }
    }

    reset() {
        console.log("Engine3D.reset() called");
        // Cancel any active modes
        this.cancelCalibration();
        this.isDrawing = false;

        // Remove temporary objects
        if (this.tempWall) {
            this.scene.remove(this.tempWall);
            this.tempWall = null;
        }
        if (this.ghost) {
            this.scene.remove(this.ghost);
            this.ghost = null;
        }
        if (this.debugGroup) {
            this.scene.remove(this.debugGroup);
            this.debugGroup = null;
        }

        // Explicitly remove floor plan mesh
        if (this.floorPlanMesh) {
            console.log("Removing floorPlanMesh", this.floorPlanMesh);
            this.scene.remove(this.floorPlanMesh);
            this.floorPlanMesh = null;
        } else {
            console.log("No floorPlanMesh to remove");
        }
        this.currentFloorPlan = null;

        // CLEAR ALL GROUPS
        console.log("Clearing groups...");
        while (this.wallGroup.children.length > 0) {
            this.wallGroup.remove(this.wallGroup.children[0]);
        }
        while (this.furnitureGroup.children.length > 0) {
            this.furnitureGroup.remove(this.furnitureGroup.children[0]);
        }
        while (this.doorGroup.children.length > 0) {
            this.doorGroup.remove(this.doorGroup.children[0]);
        }
        console.log("Groups cleared.");

        // Reset Camera to default 3D view
        if (this.is2DMode) this.toggleViewMode(); // Switch back to 3D
        this.camera.position.set(500, 800, 500);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }
}

// ==========================================
// UI: Toolbar
// ==========================================
class Toolbar {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.tools = [
            { id: 'select', label: 'Orbit/Select', icon: 'Cursor' },
            { id: 'wall', label: 'Wall Tool', icon: 'Square' },
        ];
    }

    render() {
        console.log("Toolbar.render() called");
        if (!this.container) {
            console.error("Toolbar container not found!");
            return;
        }
        this.container.innerHTML = '';

        this.tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = `btn ${this.store.state.tool === tool.id ? 'active' : ''}`;
            btn.textContent = tool.label;
            btn.onclick = () => {
                this.store.setTool(tool.id);
                // Update controls based on tool
                if (window.engine) {
                    if (tool.id === 'wall') {
                        // Disable Orbit on Left Click for Drawing
                        window.engine.controls.mouseButtons.LEFT = null;
                    } else {
                        // Restore Orbit/Pan based on View Mode
                        if (window.engine.is2DMode) {
                            window.engine.controls.mouseButtons.LEFT = THREE.MOUSE.PAN;
                        } else {
                            window.engine.controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
                        }
                    }
                    window.engine.controls.update();
                }
            };
            this.container.appendChild(btn);
        });

        const sep = document.createElement('div');
        sep.style.width = '1px'; sep.style.height = '30px'; sep.style.background = '#444'; sep.style.margin = '0 10px';
        this.container.appendChild(sep);

        // 2D/3D Toggle
        const viewBtn = document.createElement('button');
        viewBtn.className = 'btn';
        viewBtn.textContent = '2D / 3D';
        viewBtn.style.backgroundColor = '#9C27B0'; // Purple
        viewBtn.onclick = () => {
            if (window.engine) window.engine.toggleViewMode();
        };
        this.container.appendChild(viewBtn);

        // Zoom Controls
        const zoomInBtn = document.createElement('button');
        zoomInBtn.className = 'btn';
        zoomInBtn.textContent = '+';
        zoomInBtn.title = 'Zoom In';
        zoomInBtn.onclick = () => {
            if (window.engine) window.engine.zoomIn();
        };
        this.container.appendChild(zoomInBtn);

        const zoomOutBtn = document.createElement('button');
        zoomOutBtn.className = 'btn';
        zoomOutBtn.textContent = '-';
        zoomOutBtn.title = 'Zoom Out';
        zoomOutBtn.onclick = () => {
            if (window.engine) window.engine.zoomOut();
        };
        this.container.appendChild(zoomOutBtn);

        const sep2 = document.createElement('div');
        sep2.style.width = '1px'; sep2.style.height = '30px'; sep2.style.background = '#444'; sep2.style.margin = '0 10px';
        this.container.appendChild(sep2);

        // Floor Plan Upload
        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'btn';
        uploadBtn.textContent = 'Upload Plan';
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        uploadBtn.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.store.setFloorPlan(event.target.result);
                };
                reader.readAsDataURL(file);
            }
        };

        this.container.appendChild(uploadBtn);
        this.container.appendChild(fileInput);

        // 3D Model Upload
        const upload3DBtn = document.createElement('button');
        upload3DBtn.className = 'btn';
        upload3DBtn.textContent = 'Upload 3D Model';
        upload3DBtn.style.backgroundColor = '#673AB7'; // Deep Purple
        const modelInput = document.createElement('input');
        modelInput.type = 'file';
        modelInput.accept = '.glb,.gltf,.obj';
        modelInput.style.display = 'none';

        upload3DBtn.onclick = () => modelInput.click();

        modelInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                const type = file.name.split('.').pop().toLowerCase();
                const assetId = 'custom-' + Date.now();

                // Add to store custom assets
                this.store.addCustomAsset({
                    id: assetId,
                    name: file.name,
                    url: url,
                    type: type,
                    blob: file // Pass the file object (which is a Blob) for storage
                });

                // Automatically select this new asset
                this.store.setSelectedAsset(assetId);
            }
        };
        this.container.appendChild(upload3DBtn);
        this.container.appendChild(modelInput);


        // Auto-Build Button & Threshold
        const autoBuildContainer = document.createElement('div');
        autoBuildContainer.style.display = 'inline-flex';
        autoBuildContainer.style.alignItems = 'center';
        autoBuildContainer.style.gap = '5px';

        const autoBuildBtn = document.createElement('button');
        autoBuildBtn.className = 'btn';
        autoBuildBtn.textContent = 'Auto-Build Walls';
        autoBuildBtn.style.backgroundColor = '#4CAF50'; // Green
        autoBuildBtn.onclick = () => this.store.triggerAutoBuild();

        const thresholdLabel = document.createElement('span');
        thresholdLabel.textContent = 'Sens:';
        thresholdLabel.style.fontSize = '12px';
        thresholdLabel.style.color = '#ccc';

        const thresholdInput = document.createElement('input');
        thresholdInput.type = 'range';
        thresholdInput.min = '0';
        thresholdInput.max = '255';
        thresholdInput.value = this.store.state.autoBuildThreshold;
        thresholdInput.style.width = '60px';
        thresholdInput.title = 'Detection Sensitivity (Threshold)';
        thresholdInput.onchange = (e) => {
            this.store.setAutoBuildThreshold(parseInt(e.target.value));
        };

        autoBuildContainer.appendChild(autoBuildBtn);
        autoBuildContainer.appendChild(thresholdLabel);
        autoBuildContainer.appendChild(thresholdInput);
        this.container.appendChild(autoBuildContainer);

        // Calibrate Button
        const calibrateBtn = document.createElement('button');
        calibrateBtn.className = 'btn';
        calibrateBtn.textContent = 'Calibrate Scale';
        calibrateBtn.style.backgroundColor = '#FF9800'; // Orange
        calibrateBtn.onclick = () => {
            if (window.engine) window.engine.startCalibration();
        };
        this.container.appendChild(calibrateBtn);

        // FPS Toggle
        const fpsBtn = document.createElement('button');
        fpsBtn.className = 'btn';
        fpsBtn.textContent = 'First Person View';
        fpsBtn.style.backgroundColor = '#2196F3'; // Blue
        fpsBtn.onclick = () => {
            if (window.engine) window.engine.toggleCameraMode();
        };
        this.container.appendChild(fpsBtn);

        // Clear Button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn';
        clearBtn.style.backgroundColor = '#d32f2f';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => {
            if (confirm("Are you sure you want to clear EVERYTHING? This will remove the floor plan, walls, and reset calibration.")) {
                if (window.engine) window.engine.reset();
                this.store.clearAll();
            }
        };
        this.container.appendChild(clearBtn);

        this.store.subscribe((state) => {
            const buttons = this.container.querySelectorAll('.btn');
            buttons.forEach(btn => btn.classList.remove('active'));

            // Re-highlight active tool
            Array.from(this.container.children).forEach(child => {
                if (child.textContent === 'Orbit/Select' && state.tool === 'select') child.classList.add('active');
                if (child.textContent === 'Wall Tool' && state.tool === 'wall') child.classList.add('active');
            });
        });
    }
}

// ==========================================
// UI: Asset Browser
// ==========================================
class AssetBrowser {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.assets = [
            { id: 'door', name: 'Standard Door', type: 'door' },
            { id: 'window', name: 'Standard Window', type: 'window' },
            { id: 'table', name: 'Dining Table', type: 'furniture' },
            { id: 'chair', name: 'Chair', type: 'furniture' }
        ];

        this.store.subscribe((state) => {
            this.render();
        });
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = '<h3 style="margin-bottom:10px">Assets</h3>';

        const grid = document.createElement('div');
        grid.className = 'asset-grid';

        // Default Assets
        this.assets.forEach(asset => {
            const btn = document.createElement('div');
            btn.className = `asset-btn ${this.store.state.selectedAsset === asset.id ? 'active' : ''}`;
            btn.textContent = asset.name;
            btn.onclick = () => {
                this.store.setSelectedAsset(asset.id);
            };
            grid.appendChild(btn);
        });
        this.container.appendChild(grid);

        // Custom Assets
        if (this.store.state.customAssets && this.store.state.customAssets.length > 0) {
            const customHeader = document.createElement('h4');
            customHeader.textContent = 'My Uploads';
            customHeader.style.marginTop = '20px';
            customHeader.style.marginBottom = '10px';
            this.container.appendChild(customHeader);

            const customGrid = document.createElement('div');
            customGrid.className = 'asset-grid';

            this.store.state.customAssets.forEach(asset => {
                const btn = document.createElement('div');
                btn.className = `asset-btn ${this.store.state.selectedAsset === asset.id ? 'active' : ''}`;
                btn.innerHTML = `
                    <div style="font-weight:bold">${asset.name}</div>
                    <div style="font-size:10px; opacity:0.7">${asset.type}</div>
                `;
                btn.onclick = () => {
                    this.store.setSelectedAsset(asset.id);
                };
                customGrid.appendChild(btn);
            });
            this.container.appendChild(customGrid);
        }
    }
}

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = () => {
    console.log("window.onload fired");
    try {
        const store = new Store();
        const engine = new Engine3D('canvas-container', store);
        window.engine = engine; // Expose for UI access
        const toolbar = new Toolbar('toolbar', store);
        const assetBrowser = new AssetBrowser('asset-browser', store);

        // Initialize Store (loads DB)
        store.init();

        console.log("Calling toolbar.render()");
        toolbar.render();
        assetBrowser.render();

    } catch (e) {
        console.error("Initialization Error:", e);
        alert("Error initializing app: " + e.message);
    }
};
