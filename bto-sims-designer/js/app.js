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
            autoBuildTrigger: 0
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

    setTool(tool) {
        this.setState({ tool });
    }

    addWall(wall) {
        this.setState({ walls: [...this.state.walls, wall] });
    }

    addFurniture(item) {
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
        this.hitPlane = new THREE.Mesh(hitPlaneGeo, new THREE.MeshBasicMaterial({ visible: false }));
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
            this.camera.position.set(500, 170, 500); // Eye level roughly
            this.camera.lookAt(500, 170, 0);
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

        const detectedWalls = [];
        const detectedDoors = [];
        const scaleX = 1000 / width;
        const scaleY = (1000 / (width / height)) / height;

        const threshold = 120;
        const step = 2;
        const minLength = 20;
        const minDoorWidth = 20; // ~20-30 pixels in this scale
        const maxDoorWidth = 120;

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

                            // Check for door gap
                            if (lastEndX !== -1) {
                                const gap = startX - lastEndX;
                                if (gap > minDoorWidth && gap < maxDoorWidth) {
                                    detectedDoors.push({
                                        id: generateId(),
                                        x: (lastEndX + gap / 2) * scaleX,
                                        y: y * scaleY,
                                        width: gap * scaleX,
                                        height: 200, // Door height
                                        rotation: 0
                                    });
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

                            // Check for door gap
                            if (lastEndY !== -1) {
                                const gap = startY - lastEndY;
                                if (gap > minDoorWidth && gap < maxDoorWidth) {
                                    detectedDoors.push({
                                        id: generateId(),
                                        x: x * scaleX,
                                        y: (lastEndY + gap / 2) * scaleY,
                                        width: gap * scaleY, // Width is along Y axis effectively
                                        height: 200,
                                        rotation: Math.PI / 2
                                    });
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
            }
        }

        alert(`Auto-detected ${detectedWalls.length} wall segments and ${detectedDoors.length} doors.`);

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
    // Update Floor Plan Overlay
    updateScene() {
        if (this.store.state.floorPlan && this.currentFloorPlan !== this.store.state.floorPlan) {
            this.currentFloorPlan = this.store.state.floorPlan;
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
                this.scene.add(this.floorPlanMesh);

            });
        }

        // Check for Auto-Build Trigger
        if (this.store.state.autoBuildTrigger > this.lastAutoBuildTrigger) {
            this.lastAutoBuildTrigger = this.store.state.autoBuildTrigger;
            if (this.floorPlanMesh && this.floorPlanMesh.material.map) {
                this.autoBuildWalls(this.floorPlanMesh.material.map.image);
            } else {
                alert('Please upload a floor plan first.');
            }
        }

        // Clear existing
        while (this.wallGroup.children.length > 0) {
            this.wallGroup.remove(this.wallGroup.children[0]);
        }
        while (this.furnitureGroup.children.length > 0) {
            this.furnitureGroup.remove(this.furnitureGroup.children[0]);
        }
        while (this.doorGroup.children.length > 0) {
            this.doorGroup.remove(this.doorGroup.children[0]);
        }

        // Render Walls
        this.store.state.walls.forEach(wall => {
            const dx = wall.end.x - wall.start.x;
            const dy = wall.end.y - wall.start.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            const geometry = new THREE.BoxGeometry(len, 260, wall.thickness);
            const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
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
        });

        // Render Furniture
        this.store.state.furniture.forEach(item => {
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
        });

        // Render Doors
        if (this.store.state.doors) {
            this.store.state.doors.forEach(door => {
                const geometry = new THREE.BoxGeometry(door.width, 200, 5);
                const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Brown door
                const mesh = new THREE.Mesh(geometry, material);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                mesh.position.set(door.x, 100, door.y);
                mesh.rotation.y = -door.rotation;
                this.doorGroup.add(mesh);
            });
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        if (this.isFpsMode && this.fpsControls.isLocked) {
            const delta = 0.1; // Simple time delta
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 4000.0 * delta;
            if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 4000.0 * delta;

            this.fpsControls.moveRight(-this.velocity.x * delta);
            this.fpsControls.moveForward(-this.velocity.z * delta);
        } else {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// ==========================================
// UI: Toolbar (Kept mostly same)
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
        this.container.innerHTML = '';

        this.tools.forEach(tool => {
            const btn = document.createElement('button');
            btn.className = `btn ${this.store.state.tool === tool.id ? 'active' : ''}`;
            btn.textContent = tool.label;
            btn.onclick = () => this.store.setTool(tool.id);
            this.container.appendChild(btn);
        });

        const sep = document.createElement('div');
        sep.style.width = '1px'; sep.style.height = '30px'; sep.style.background = '#444'; sep.style.margin = '0 10px';
        this.container.appendChild(sep);

        Object.keys(templates).forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.textContent = `Load ${name}`;
            btn.onclick = () => {
                if (confirm(`Load ${name}?`)) this.store.loadTemplate(templates[name]);
            };
            this.container.appendChild(btn);
        });

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



        // Auto-Build Button
        const autoBuildBtn = document.createElement('button');
        autoBuildBtn.className = 'btn';
        autoBuildBtn.textContent = 'Auto-Build Walls';
        autoBuildBtn.style.backgroundColor = '#4CAF50'; // Green
        autoBuildBtn.onclick = () => this.store.triggerAutoBuild();
        this.container.appendChild(autoBuildBtn);

        // FPS Toggle
        const fpsBtn = document.createElement('button');
        fpsBtn.className = 'btn';
        fpsBtn.textContent = 'First Person View';
        fpsBtn.style.backgroundColor = '#2196F3'; // Blue
        fpsBtn.onclick = () => {
            // Access engine from global scope or pass it down. 
            // For simplicity, we'll assume engine is available or we need to pass it.
            // Actually, Toolbar doesn't have access to Engine directly in this structure.
            // We should add a method to Store or dispatch an event, but for now let's expose engine globally or pass it.
            // Better: Add a callback or event.
            // Quick fix: window.engine.toggleCameraMode();
            if (window.engine) window.engine.toggleCameraMode();
        };
        this.container.appendChild(fpsBtn);

        // Save/Load/Clear (Simplified for brevity)
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn';
        clearBtn.style.backgroundColor = '#d32f2f';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => this.store.loadTemplate({ walls: [], furniture: [] });
        this.container.appendChild(clearBtn);

        this.store.subscribe((state) => {
            const buttons = this.container.querySelectorAll('.btn');
            buttons.forEach((btn, index) => {
                if (index < this.tools.length) {
                    if (this.tools[index].id === state.tool) btn.classList.add('active');
                    else btn.classList.remove('active');
                }
            });
        });
    }
}

// ==========================================
// UI: AssetBrowser
// ==========================================
class AssetBrowser {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;
    }

    render() {
        this.container.innerHTML = `
            <div style="padding: 10px; font-weight: bold; color: #aaa;">3D Assets</div>
            <div class="asset-grid" style="display: grid; grid-template-columns: 1fr; gap: 10px;">
                <button class="asset-btn" data-type="table">Dining Table (Cylinder)</button>
                <button class="asset-btn" data-type="bed">Queen Bed (Box)</button>
                <button class="asset-btn" data-type="chair">Chair (Cube)</button>
            </div>
        `;

        this.container.querySelectorAll('.asset-btn').forEach(btn => {
            btn.style.padding = '10px';
            btn.style.background = '#333';
            btn.style.border = '1px solid #444';
            btn.style.color = 'white';
            btn.style.cursor = 'pointer';

            btn.onclick = () => {
                const type = btn.dataset.type;
                this.store.setSelectedAsset(type);
            };
        });
    }
}

// ==========================================
// MAIN
// ==========================================
window.onload = function () {
    console.log('Initializing 3D BTO Designer...');

    if (typeof THREE === 'undefined') {
        alert('Error: Three.js failed to load. Please check your internet connection.');
        return;
    }

    try {
        const store = new Store();
        const engine = new Engine3D('canvas-container', store);
        window.engine = engine; // Expose for UI access
        const toolbar = new Toolbar('toolbar', store);
        const assetBrowser = new AssetBrowser('asset-browser', store);

        toolbar.render();
        assetBrowser.render();
        console.log('3D Engine Ready');
    } catch (e) {
        console.error(e);
        alert('Runtime Error: ' + e.message);
    }
};
