export class Toolbar {
    constructor(containerId, store) {
        this.container = document.getElementById(containerId);
        this.store = store;
        this.tools = [
            { id: 'select', label: 'Select', icon: 'Cursor' },
            { id: 'wall', label: 'Wall', icon: 'Square' },
            { id: 'door', label: 'Door', icon: 'DoorOpen' },
            { id: 'window', label: 'Window', icon: 'Layout' }
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

        // Separator
        const sep = document.createElement('div');
        sep.style.width = '1px';
        sep.style.height = '30px';
        sep.style.background = '#444';
        sep.style.margin = '0 10px';
        this.container.appendChild(sep);

        // Template Buttons
        import('../data/templates.js').then(({ templates }) => {
            Object.keys(templates).forEach(name => {
                const btn = document.createElement('button');
                btn.className = 'btn';
                btn.textContent = `Load ${name}`;
                btn.onclick = () => {
                    if (confirm(`Load ${name} template? This will clear current design.`)) {
                        this.store.loadTemplate(templates[name]);
                    }
                };
                this.container.appendChild(btn);
            });
        });

        // Utility Buttons Separator
        const sep2 = document.createElement('div');
        sep2.style.width = '1px';
        sep2.style.height = '30px';
        sep2.style.background = '#444';
        sep2.style.margin = '0 10px';
        this.container.appendChild(sep2);

        // Save Button
        const saveBtn = document.createElement('button');
        saveBtn.className = 'btn';
        saveBtn.textContent = 'Save';
        saveBtn.onclick = () => {
            const data = JSON.stringify({
                walls: this.store.state.walls,
                furniture: this.store.state.furniture
            });
            localStorage.setItem('bto_design', data);
            alert('Design saved!');
        };
        this.container.appendChild(saveBtn);

        // Load Button
        const loadBtn = document.createElement('button');
        loadBtn.className = 'btn';
        loadBtn.textContent = 'Load Saved';
        loadBtn.onclick = () => {
            const data = localStorage.getItem('bto_design');
            if (data) {
                const parsed = JSON.parse(data);
                this.store.loadTemplate(parsed);
            } else {
                alert('No saved design found.');
            }
        };
        this.container.appendChild(loadBtn);

        // Clear Button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn';
        clearBtn.style.backgroundColor = '#d32f2f';
        clearBtn.textContent = 'Clear';
        clearBtn.onclick = () => {
            if (confirm('Clear all?')) {
                this.store.loadTemplate({ walls: [], furniture: [] });
            }
        };
        this.container.appendChild(clearBtn);

        // Subscribe to update UI when state changes
        this.store.subscribe((state) => {
            const buttons = this.container.querySelectorAll('.btn');
            buttons.forEach((btn, index) => {
                const toolId = this.tools[index].id;
                if (toolId === state.tool) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        });
    }
}
