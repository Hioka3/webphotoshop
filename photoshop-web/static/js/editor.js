// Основной JavaScript файл для редактора изображений

class PhotoshopEditor {
    constructor() {
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        this.previewCanvas = document.getElementById('preview-canvas');
        this.previewCtx = this.previewCanvas.getContext('2d', { willReadFrequently: true });
        
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#ffffff';
        this.brushSize = 10;
        this.opacity = 1;
        
       
        this.shapes = [];
        this.selectedShape = null;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.dragOffset = { x: 0, y: 0 };
        
       
        this.brushStrokes = [];
        
        
        this.retouchIntensity = 0.5;
        this.retouchSoftness = 3;
        
       
        this.history = [];
        this.historyStep = -1;
        
        
        this.pristineImageData = null; 
        this.originalImageData = null; 
        this.currentImageData = null;  
        
        
        this.filters = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            hue: 0,
            blur: 0,
            vignette: 0,
            grain: 0,
            temperature: 0
        };
        
        
        this.cropData = {
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            ratio: 'free'
        };
        
        this.initializeEventListeners();
        this.initializeUI();
        
        
        if (document.querySelector('.history-list')) {
            this.updateHistoryUI();
        }
    }
    
    initializeEventListeners() {
        
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectTool(e.target.closest('.tool-btn').dataset.tool);
            });
        });
        
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        const fileInput = document.getElementById('file-input');
        fileInput.addEventListener('change', this.loadImage.bind(this));
        
        const uploadPanel = document.getElementById('upload-panel');
        const uploadContent = document.querySelector('.upload-content');
        uploadPanel.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadPanel.addEventListener('drop', this.handleDrop.bind(this));
        
        uploadContent.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON') {
                document.getElementById('file-input').click();
            }
        });
        
        document.getElementById('color-picker').addEventListener('change', (e) => {
            this.currentColor = e.target.value;
        });
        
        document.getElementById('brush-size').addEventListener('input', (e) => {
            this.brushSize = e.target.value;
            document.getElementById('brush-size-value').textContent = e.target.value + 'px';
        });
        
        document.getElementById('opacity').addEventListener('input', (e) => {
            this.opacity = e.target.value / 100;
            document.getElementById('opacity-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('retouch-intensity').addEventListener('input', (e) => {
            this.retouchIntensity = e.target.value / 100;
            document.getElementById('retouch-intensity-value').textContent = e.target.value + '%';
        });
        
        document.getElementById('retouch-softness').addEventListener('input', (e) => {
            this.retouchSoftness = parseInt(e.target.value);
            document.getElementById('retouch-softness-value').textContent = e.target.value;
        });
        
        this.initializeFilters();
        
        
        document.getElementById('upload-new-btn').addEventListener('click', this.showUploadPanel.bind(this));
        document.getElementById('undo-btn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redo-btn').addEventListener('click', this.redo.bind(this));
        document.getElementById('save-btn').addEventListener('click', this.showSaveModal.bind(this));
        document.getElementById('download-btn').addEventListener('click', this.downloadImage.bind(this));
        
        
        const clearHistoryBtn = document.getElementById('clear-history');
        if (clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', this.clearHistory.bind(this));
        }
        
       
        this.initializeModal();
        
        
        this.initializeCropTools();
        
        
        this.initializeTabs();
    }
    
    initializeUI() {
        
        const uploadPanel = document.getElementById('upload-panel');
        if (!this.currentImageData) {
            uploadPanel.style.display = 'flex';
        } else {
            uploadPanel.style.display = 'none';
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        
        
        if (tool !== 'crop' && tool !== 'select') {
            this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            this.cropData = { startX: 0, startY: 0, endX: 0, endY: 0, ratio: this.cropData.ratio };
        }
        
        
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
        
        
        const cropSection = document.querySelector('.crop-section');
        const retouchSection = document.querySelector('.retouch-section');
        
       
        cropSection.style.display = 'none';
        retouchSection.style.display = 'none';
        
        if (tool === 'crop') {
            cropSection.style.display = 'block';
            this.enableCropMode();
        } else if (tool === 'retouch') {
            retouchSection.style.display = 'block';
        } else {
            this.disableCropMode();
        }
        
        
        this.updateCursor();
    }
    
    updateCursor() {
        switch(this.currentTool) {
            case 'brush':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'eraser':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'retouch':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'select':
                this.canvas.style.cursor = 'crosshair';
                break;
            case 'crop':
                this.canvas.style.cursor = 'crop';
                break;
            case 'text':
                this.canvas.style.cursor = 'text';
                break;
            default:
                this.canvas.style.cursor = 'crosshair';
        }
    }
    
    startDrawing(e) {
        if (!this.currentImageData) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Проверяем, нажал ли пользователь на ручку изменения размера
        if (this.selectedShape !== null) {
            const resizeHandle = this.getResizeHandle(x, y);
            if (resizeHandle) {
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                return;
            }
        }
        
        // Проверяем, нажал ли пользователь на существующую фигуру (режим перемещения)
        const shapeIndex = this.getShapeAtPoint(x, y);
        if (shapeIndex !== null) {
            // Обычный клик = режим перемещения фигуры
            this.selectedShape = shapeIndex;
            this.isDragging = true;
            const shape = this.shapes[shapeIndex];
            this.dragOffset.x = x - shape.startX;
            this.dragOffset.y = y - shape.startY;
            this.redrawCanvas();
            return;
        }
        
        // Сбрасываем выбор, если кликнули вне фигур
        this.selectedShape = null;
        this.isDrawing = true;
        
        switch(this.currentTool) {
            case 'brush':
            case 'eraser':
            case 'retouch':
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.setupBrush();
                break;
            case 'select':
            case 'crop':
            case 'rectangle':
            case 'circle':
            case 'line':
                // Сохраняем текущее состояние canvas для временного рисования
                this.tempImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.cropData.startX = x;
                this.cropData.startY = y;
                
                if (this.currentTool === 'crop') {
                    console.log('=== Начало выделения обрезки ===');
                    console.log('Текущая пропорция:', this.cropData.ratio);
                    console.log('Начальная точка:', { x, y });
                }
                break;
            case 'text':
                this.addText(x, y);
                break;
        }
    }
    
    draw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Обработка изменения размера фигуры
        if (this.isResizing && this.selectedShape !== null) {
            const shape = this.shapes[this.selectedShape];
            
            if (this.resizeHandle === 'bottomRight') {
                shape.endX = x;
                shape.endY = y;
            } else if (this.resizeHandle === 'topLeft') {
                shape.startX = x;
                shape.startY = y;
            } else if (this.resizeHandle === 'topRight') {
                shape.endX = x;
                shape.startY = y;
            } else if (this.resizeHandle === 'bottomLeft') {
                shape.startX = x;
                shape.endY = y;
            }
            
            this.redrawCanvas();
            return;
        }
        
        // Обработка перемещения фигуры
        if (this.isDragging && this.selectedShape !== null) {
            const shape = this.shapes[this.selectedShape];
            const dx = x - this.dragOffset.x - shape.startX;
            const dy = y - this.dragOffset.y - shape.startY;
            
            // Перемещаем фигуру
            shape.startX += dx;
            shape.startY += dy;
            shape.endX += dx;
            shape.endY += dy;
            
            this.redrawCanvas();
            return;
        }
        
        if (!this.isDrawing || !this.currentImageData) return;
        
        switch(this.currentTool) {
            case 'brush':
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;
            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                this.ctx.globalCompositeOperation = 'source-over';
                break;
            case 'retouch':
                this.applyRetouch(x, y);
                break;
            case 'select':
            case 'crop':
                this.drawSelection(x, y);
                break;
            case 'rectangle':
                this.drawRectangle(x, y);
                break;
            case 'circle':
                this.drawCircle(x, y);
                break;
            case 'line':
                this.drawLine(x, y);
                break;
        }
    }
    
    stopDrawing(e) {
        // Завершаем изменение размера фигуры
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.saveState();
            return;
        }
        
        // Завершаем перемещение фигуры
        if (this.isDragging) {
            this.isDragging = false;
            this.saveState();
            return;
        }
        
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Сохраняем мазок кисти как ImageData (для сохранения после фильтров)
            if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
                // Обновляем ТОЛЬКО currentImageData (текущее состояние с мазком)
                // НЕ трогаем pristineImageData и originalImageData!
                this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }
            
            // Сохраняем фигуры как объекты для последующего перемещения
            if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'line') {
                if (e) {
                    const rect = this.canvas.getBoundingClientRect();
                    const endX = e.clientX - rect.left;
                    const endY = e.clientY - rect.top;
                    
                    const shape = {
                        type: this.currentTool,
                        startX: this.cropData.startX,
                        startY: this.cropData.startY,
                        endX: endX,
                        endY: endY,
                        color: this.currentColor,
                        lineWidth: this.brushSize,
                        opacity: this.opacity
                    };
                    
                    this.shapes.push(shape);
                    this.redrawCanvas();
                }
                this.tempImageData = null;
            }
            
            // Сохраняем конечные координаты для обрезки
            if ((this.currentTool === 'crop' || this.currentTool === 'select') && e) {
                const rect = this.canvas.getBoundingClientRect();
                const endX = e.clientX - rect.left;
                const endY = e.clientY - rect.top;
                
                // Если используются пропорции, координаты уже обновлены в drawSelection
                if (this.cropData.ratio === 'free') {
                    this.cropData.endX = endX;
                    this.cropData.endY = endY;
                }
            }
            
            this.saveState();
        }
    }
    
    setupBrush() {
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.globalAlpha = this.opacity;
    }
    
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    }
    
    handleDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.loadImageFile(files[0]);
        }
    }
    
    loadImage(e) {
        const file = e.target.files[0];
        if (file) {
            this.loadImageFile(file);
        }
    }
    
    loadImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.setupCanvas(img);
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.saveOriginalState();
                document.getElementById('upload-panel').style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    setupCanvas(img) {
        const maxWidth = 800;
        const maxHeight = 600;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.previewCanvas.width = width;
        this.previewCanvas.height = height;
    }
    
    saveOriginalState() {
        // Сохраняем САМОЕ ПЕРВОЕ изначальное изображение (для сравнения)
        this.pristineImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }
    
    saveState() {
        this.historyStep++;
        if (this.historyStep < this.history.length) {
            this.history.length = this.historyStep;
        }
        
        // Сохраняем состояние с размерами canvas
        const state = {
            imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
            width: this.canvas.width,
            height: this.canvas.height
        };
        
        this.history.push(state);
        this.updateHistoryUI();
        console.log('Состояние сохранено:', this.historyStep, 'размер:', state.width + 'x' + state.height);
    }
    
    undo() {
        if (this.historyStep > 0) {
            this.historyStep--;
            const state = this.history[this.historyStep];
            
            // Восстанавливаем размеры canvas
            if (this.canvas.width !== state.width || this.canvas.height !== state.height) {
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.previewCanvas.width = state.width;
                this.previewCanvas.height = state.height;
                console.log('Размер canvas восстановлен:', state.width + 'x' + state.height);
            }
            
            // Восстанавливаем изображение
            this.ctx.putImageData(state.imageData, 0, 0);
            
            // Обновляем текущие данные
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Перерисовываем фигуры если есть
            this.redrawCanvas();
            
            this.updateHistoryUI();
            console.log('Undo выполнен, шаг:', this.historyStep);
        }
    }
    
    redo() {
        if (this.historyStep < this.history.length - 1) {
            this.historyStep++;
            const state = this.history[this.historyStep];
            
            // Восстанавливаем размеры canvas
            if (this.canvas.width !== state.width || this.canvas.height !== state.height) {
                this.canvas.width = state.width;
                this.canvas.height = state.height;
                this.previewCanvas.width = state.width;
                this.previewCanvas.height = state.height;
                console.log('Размер canvas восстановлен:', state.width + 'x' + state.height);
            }
            
            // Восстанавливаем изображение
            this.ctx.putImageData(state.imageData, 0, 0);
            
            // Обновляем текущие данные
            this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            
            // Перерисовываем фигуры если есть
            this.redrawCanvas();
            
            this.updateHistoryUI();
            console.log('Redo выполнен, шаг:', this.historyStep);
        }
    }
    
    clearHistory() {
        if (confirm('Вы уверены, что хотите очистить всю историю? Это действие нельзя отменить.')) {
            // Сохраняем только текущее состояние
            const currentState = {
                imageData: this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height),
                width: this.canvas.width,
                height: this.canvas.height
            };
            this.history = [currentState];
            this.historyStep = 0;
            
            // Очищаем список фигур
            this.shapes = [];
            this.selectedShape = null;
            
            // Перерисовываем canvas
            this.redrawCanvas();
            this.updateHistoryUI();
            
            alert('История очищена!');
        }
    }
    
    updateHistoryUI() {
        const historyList = document.querySelector('.history-list');
        if (!historyList) {
            console.error('История: элемент .history-list не найден');
            return;
        }
        
        historyList.innerHTML = '';
        
        if (this.history.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'history-item';
            emptyItem.textContent = 'История пуста';
            emptyItem.style.opacity = '0.5';
            historyList.appendChild(emptyItem);
            return;
        }
        
        this.history.forEach((state, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            if (index === this.historyStep) {
                item.classList.add('active');
            }
            item.textContent = `Действие ${index + 1}`;
            item.addEventListener('click', () => {
                this.historyStep = index;
                
                // Восстанавливаем размеры canvas
                if (this.canvas.width !== state.width || this.canvas.height !== state.height) {
                    this.canvas.width = state.width;
                    this.canvas.height = state.height;
                    this.previewCanvas.width = state.width;
                    this.previewCanvas.height = state.height;
                }
                
                // Восстанавливаем изображение
                this.ctx.putImageData(state.imageData, 0, 0);
                
                // Обновляем текущие данные
                this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                
                this.redrawCanvas();
                this.updateHistoryUI();
            });
            historyList.appendChild(item);
        });
        
        console.log(`История обновлена: ${this.history.length} действий, текущий шаг: ${this.historyStep}`);
    }
    
    initializeFilters() {
        const filterControls = ['brightness', 'contrast', 'saturation', 'hue', 'blur', 'vignette', 'grain', 'temperature'];
        
        filterControls.forEach(filter => {
            const input = document.getElementById(filter);
            const value = document.getElementById(filter + '-value');
            
            if (input && value) {
                input.addEventListener('input', (e) => {
                    this.filters[filter] = parseInt(e.target.value);
                    value.textContent = e.target.value + (filter === 'blur' ? '' : '');
                    this.applyFilters();
                });
            }
        });
        
        document.getElementById('reset-filters').addEventListener('click', this.resetFilters.bind(this));
        document.getElementById('remove-background').addEventListener('click', this.removeBackground.bind(this));
    }
    
    applyFilters() {
        if (!this.currentImageData) return;
        
        // Используем currentImageData (с мазками кисти), а не originalImageData
        this.ctx.putImageData(this.currentImageData, 0, 0);
        
        let filterString = '';
        
        if (this.filters.brightness !== 0) {
            filterString += `brightness(${100 + this.filters.brightness}%) `;
        }
        if (this.filters.contrast !== 0) {
            filterString += `contrast(${100 + this.filters.contrast}%) `;
        }
        if (this.filters.saturation !== 0) {
            filterString += `saturate(${100 + this.filters.saturation}%) `;
        }
        if (this.filters.hue !== 0) {
            filterString += `hue-rotate(${this.filters.hue}deg) `;
        }
        if (this.filters.blur > 0) {
            filterString += `blur(${this.filters.blur}px) `;
        }
        
        this.ctx.filter = filterString || 'none';
        this.ctx.drawImage(this.canvas, 0, 0);
        this.ctx.filter = 'none';
        
        // Применить дополнительные эффекты
        if (this.filters.vignette > 0) {
            this.applyVignette();
        }
        if (this.filters.grain > 0) {
            this.applyGrain();
        }
        if (this.filters.temperature !== 0) {
            this.applyTemperature();
        }
    }
    
    applyVignette() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.sqrt(centerX * centerX + centerY * centerY);
        
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `rgba(0,0,0,0)`);
        gradient.addColorStop(1, `rgba(0,0,0,${this.filters.vignette / 100})`);
        
        this.ctx.globalCompositeOperation = 'multiply';
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    applyGrain() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const intensity = this.filters.grain / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 255 * intensity;
            data[i] = Math.max(0, Math.min(255, data[i] + noise));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    applyTemperature() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const temp = this.filters.temperature / 100;
        
        for (let i = 0; i < data.length; i += 4) {
            if (temp > 0) {
                // Теплее (больше красного/желтого)
                data[i] = Math.min(255, data[i] + temp * 30);
                data[i + 1] = Math.min(255, data[i + 1] + temp * 15);
            } else {
                // Холоднее (больше синего)
                data[i + 2] = Math.min(255, data[i + 2] + Math.abs(temp) * 30);
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }
    
    resetFilters() {
        Object.keys(this.filters).forEach(filter => {
            this.filters[filter] = 0;
            const input = document.getElementById(filter);
            const value = document.getElementById(filter + '-value');
            if (input) input.value = 0;
            if (value) value.textContent = '0';
        });
        
        // Показываем изображение с мазками кисти, но без фильтров
        if (this.currentImageData) {
            this.ctx.putImageData(this.currentImageData, 0, 0);
        }
    }
    
    removeBackground() {
        // Простой алгоритм удаления фона (можно улучшить с помощью AI API)
        if (!this.currentImageData) return;
        
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        // Получить цвет фона (левый верхний угол)
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];
        
        const tolerance = 50;
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Проверить схожесть с цветом фона
            if (Math.abs(r - bgR) < tolerance && 
                Math.abs(g - bgG) < tolerance && 
                Math.abs(b - bgB) < tolerance) {
                data[i + 3] = 0; // Сделать прозрачным
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        this.saveState();
    }
    
    initializeCropTools() {
        // Инициализация кнопок пропорций
        const cropPresets = document.querySelectorAll('.crop-preset');
        console.log('Найдено кнопок пропорций:', cropPresets.length);
        
        cropPresets.forEach(btn => {
            // Устанавливаем активную кнопку "Свободная" по умолчанию
            if (btn.dataset.ratio === 'free') {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', (e) => {
                const ratio = e.target.dataset.ratio;
                console.log('=== Клик по кнопке пропорции ===');
                console.log('Выбранная пропорция:', ratio);
                
                // Убираем active со всех кнопок
                cropPresets.forEach(b => b.classList.remove('active'));
                
                // Добавляем active на нажатую кнопку
                e.target.classList.add('active');
                
                // Сохраняем пропорцию
                this.cropData.ratio = ratio;
                
                console.log('cropData.ratio установлен в:', this.cropData.ratio);
                console.log('Активная кнопка:', e.target.textContent);
            });
        });
        
        const rotateLeftBtn = document.getElementById('rotate-left');
        const rotateRightBtn = document.getElementById('rotate-right');
        const applyCropBtn = document.getElementById('apply-crop');
        
        if (rotateLeftBtn) {
            rotateLeftBtn.addEventListener('click', () => {
                console.log('Нажата кнопка: Повернуть влево');
                this.rotateImage(-90);
            });
        } else {
            console.error('Кнопка rotate-left не найдена');
        }
        
        if (rotateRightBtn) {
            rotateRightBtn.addEventListener('click', () => {
                console.log('Нажата кнопка: Повернуть вправо');
                this.rotateImage(90);
            });
        } else {
            console.error('Кнопка rotate-right не найдена');
        }
        
        if (applyCropBtn) {
            applyCropBtn.addEventListener('click', () => {
                console.log('Нажата кнопка: Применить обрезку');
                this.applyCrop();
            });
        } else {
            console.error('Кнопка apply-crop не найдена');
        }
    }
    
    rotateImage(degrees) {
        if (!this.currentImageData) {
            alert('Сначала загрузите изображение');
            return;
        }
        
        console.log('Поворот на', degrees, 'градусов');
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        // Для поворота на 90 или -90 градусов меняем ширину и высоту
        if (Math.abs(degrees) === 90) {
            tempCanvas.width = this.canvas.height;
            tempCanvas.height = this.canvas.width;
        } else {
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
        }
        
        // Поворачиваем изображение
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(degrees * Math.PI / 180);
        tempCtx.drawImage(this.canvas, -this.canvas.width / 2, -this.canvas.height / 2);
        
        // Обновляем размеры основного canvas
        this.canvas.width = tempCanvas.width;
        this.canvas.height = tempCanvas.height;
        this.previewCanvas.width = tempCanvas.width;
        this.previewCanvas.height = tempCanvas.height;
        
        // Копируем повернутое изображение
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(tempCanvas, 0, 0);
        
        // Обновляем оригинальные данные (важно для функции "До/После")
        this.originalImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.currentImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Очищаем фигуры после поворота (координаты не актуальны)
        this.shapes = [];
        this.selectedShape = null;
        
        // Сохраняем состояние
        this.saveState();
        
        console.log('Поворот выполнен. Новый размер:', this.canvas.width, 'x', this.canvas.height);
    }
    
    initializeModal() {
        const modal = document.getElementById('save-modal');
        const closeBtn = document.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-save');
        const confirmBtn = document.getElementById('confirm-save');
        
        closeBtn.addEventListener('click', () => modal.classList.remove('show'));
        cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
        confirmBtn.addEventListener('click', this.saveProject.bind(this));
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }
    
    showSaveModal() {
        document.getElementById('save-modal').classList.add('show');
    }
    
    saveProject() {
        const title = document.getElementById('project-title').value || 'Без названия';
        const description = document.getElementById('project-description').value || '';
        
        // Проверяем, загружено ли изображение
        if (!this.currentImageData) {
            alert('Сначала загрузите изображение для редактирования!');
            return;
        }
        
        // Получить данные canvas как base64
        const canvasData = this.canvas.toDataURL();
        
        console.log('=== Saving project ===');
        console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
        console.log('Canvas data length:', canvasData.length);
        console.log('Canvas data preview:', canvasData.substring(0, 100));
        
        const projectData = {
            title: title,
            description: description,
            width: this.canvas.width,
            height: this.canvas.height,
            project_data: {
                image: canvasData,
                filters: this.filters,
                history: this.history.length
            }
        };
        
        fetch('/api/save_project', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(projectData)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Server response:', data);
            if (data.success) {
                alert('Проект сохранен успешно!');
                document.getElementById('save-modal').classList.remove('show');
            } else {
                alert('Ошибка при сохранении: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Произошла ошибка при сохранении проекта');
        });
    }
    
    showUploadPanel() {
        document.getElementById('upload-panel').style.display = 'flex';
    }
    
    hideUploadPanel() {
        document.getElementById('upload-panel').style.display = 'none';
    }
    
    downloadImage() {
        if (!this.currentImageData) return;
        
        const link = document.createElement('a');
        link.download = 'photoshop-web-image.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }
    
    initializeTabs() {
        // Убрана функциональность вкладок - панель истории удалена
    }
    
    // Дополнительные методы для рисования фигур
    drawSelection(x, y) {
        // Очищаем preview канвас
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        let width = x - this.cropData.startX;
        let height = y - this.cropData.startY;
        
        // Применяем пропорции если выбраны
        if (this.cropData.ratio && this.cropData.ratio !== 'free') {
            const ratios = this.cropData.ratio.split(':');
            const aspectRatio = parseFloat(ratios[0]) / parseFloat(ratios[1]);
            
            console.log('Применяется пропорция:', this.cropData.ratio, 'соотношение:', aspectRatio);
            
            // Определяем, какая сторона будет базовой
            if (Math.abs(width) > Math.abs(height)) {
                height = width / aspectRatio;
            } else {
                width = height * aspectRatio;
            }
            
            // Корректируем направление
            if ((x - this.cropData.startX) < 0) width = -Math.abs(width);
            if ((y - this.cropData.startY) < 0) height = -Math.abs(height);
            
            console.log('Расчетные размеры:', width, 'x', height);
        }
        
        // Настройки для рамки выделения
        this.previewCtx.strokeStyle = '#007bff';
        this.previewCtx.lineWidth = 3;
        this.previewCtx.setLineDash([10, 5]);
        
        // Рисуем прямоугольник выделения
        this.previewCtx.strokeRect(this.cropData.startX, this.cropData.startY, width, height);
        
        // Добавляем полупрозрачную заливку
        this.previewCtx.fillStyle = 'rgba(0, 123, 255, 0.15)';
        this.previewCtx.fillRect(this.cropData.startX, this.cropData.startY, width, height);
        
        // Рисуем угловые маркеры
        const markerSize = 10;
        this.previewCtx.fillStyle = '#007bff';
        this.previewCtx.fillRect(this.cropData.startX - markerSize/2, this.cropData.startY - markerSize/2, markerSize, markerSize);
        this.previewCtx.fillRect(this.cropData.startX + width - markerSize/2, this.cropData.startY - markerSize/2, markerSize, markerSize);
        this.previewCtx.fillRect(this.cropData.startX - markerSize/2, this.cropData.startY + height - markerSize/2, markerSize, markerSize);
        this.previewCtx.fillRect(this.cropData.startX + width - markerSize/2, this.cropData.startY + height - markerSize/2, markerSize, markerSize);
        
        // Показываем размеры выделения и пропорцию
        const infoText = `${Math.abs(width).toFixed(0)} × ${Math.abs(height).toFixed(0)} px`;
        const ratioText = this.cropData.ratio !== 'free' ? ` (${this.cropData.ratio})` : '';
        
        this.previewCtx.fillStyle = '#ffffff';
        this.previewCtx.strokeStyle = '#000000';
        this.previewCtx.lineWidth = 3;
        this.previewCtx.font = 'bold 14px Arial';
        this.previewCtx.setLineDash([]);
        
        const textX = this.cropData.startX + 10;
        const textY = this.cropData.startY + 25;
        
        this.previewCtx.strokeText(infoText + ratioText, textX, textY);
        this.previewCtx.fillText(infoText + ratioText, textX, textY);
        
        // Сбрасываем линию на сплошную
        this.previewCtx.setLineDash([]);
        
        // Обновляем конечные координаты с учетом пропорций
        this.cropData.endX = this.cropData.startX + width;
        this.cropData.endY = this.cropData.startY + height;
        
        console.log('Выделение обновлено:', this.cropData);
    }
    
    drawRectangle(x, y) {
        // Восстанавливаем изображение и рисуем фигуру временно
        if (this.tempImageData) {
            this.ctx.putImageData(this.tempImageData, 0, 0);
        }
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.strokeRect(
            this.cropData.startX, 
            this.cropData.startY, 
            x - this.cropData.startX, 
            y - this.cropData.startY
        );
        this.ctx.globalAlpha = 1;
    }
    
    drawCircle(x, y) {
        // Восстанавливаем изображение и рисуем фигуру временно
        if (this.tempImageData) {
            this.ctx.putImageData(this.tempImageData, 0, 0);
        }
        const radius = Math.sqrt(Math.pow(x - this.cropData.startX, 2) + Math.pow(y - this.cropData.startY, 2));
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.beginPath();
        this.ctx.arc(this.cropData.startX, this.cropData.startY, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    drawLine(x, y) {
        // Восстанавливаем изображение и рисуем фигуру временно
        if (this.tempImageData) {
            this.ctx.putImageData(this.tempImageData, 0, 0);
        }
        this.ctx.strokeStyle = this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.globalAlpha = this.opacity;
        this.ctx.beginPath();
        this.ctx.moveTo(this.cropData.startX, this.cropData.startY);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        this.ctx.globalAlpha = 1;
    }
    
    addText(x, y) {
        const text = prompt('Введите текст:');
        if (text) {
            this.ctx.font = `${this.brushSize * 2}px Arial`;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillText(text, x, y);
            this.saveState();
        }
    }
    
    // Перерисовка canvas с изображением и всеми фигурами
    redrawCanvas() {
        // Очищаем canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем основное изображение
        if (this.currentImageData) {
            this.ctx.putImageData(this.currentImageData, 0, 0);
        }
        
        // Рисуем все фигуры
        this.shapes.forEach((shape, index) => {
            this.ctx.strokeStyle = shape.color;
            this.ctx.lineWidth = shape.lineWidth;
            this.ctx.globalAlpha = shape.opacity;
            
            if (shape.type === 'rectangle') {
                this.ctx.strokeRect(
                    shape.startX,
                    shape.startY,
                    shape.endX - shape.startX,
                    shape.endY - shape.startY
                );
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(shape.endX - shape.startX, 2) + 
                    Math.pow(shape.endY - shape.startY, 2)
                );
                this.ctx.beginPath();
                this.ctx.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            } else if (shape.type === 'line') {
                this.ctx.beginPath();
                this.ctx.moveTo(shape.startX, shape.startY);
                this.ctx.lineTo(shape.endX, shape.endY);
                this.ctx.stroke();
            }
            
            this.ctx.globalAlpha = 1;
            
            // Подсветка выбранной фигуры с ручками изменения размера
            if (this.selectedShape === index) {
                this.ctx.strokeStyle = '#00ff00';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([5, 5]);
                
                if (shape.type === 'rectangle') {
                    this.ctx.strokeRect(
                        shape.startX - 5,
                        shape.startY - 5,
                        shape.endX - shape.startX + 10,
                        shape.endY - shape.startY + 10
                    );
                    
                    // Рисуем ручки изменения размера
                    this.drawResizeHandles(shape);
                } else if (shape.type === 'circle') {
                    const radius = Math.sqrt(
                        Math.pow(shape.endX - shape.startX, 2) + 
                        Math.pow(shape.endY - shape.startY, 2)
                    );
                    this.ctx.beginPath();
                    this.ctx.arc(shape.startX, shape.startY, radius + 5, 0, 2 * Math.PI);
                    this.ctx.stroke();
                    
                    
                    this.drawResizeHandles(shape);
                } else if (shape.type === 'line') {
                   
                    this.drawResizeHandles(shape);
                }
                
                this.ctx.setLineDash([]);
            }
        });
    }
    
   
    drawResizeHandles(shape) {
        const handleSize = 8;
        this.ctx.fillStyle = '#00ff00';
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([]);
        
        if (shape.type === 'rectangle') {
            
            this.drawHandle(shape.startX, shape.startY, handleSize);
            this.drawHandle(shape.endX, shape.startY, handleSize);   
            this.drawHandle(shape.startX, shape.endY, handleSize);   
            this.drawHandle(shape.endX, shape.endY, handleSize);     
        } else if (shape.type === 'circle') {
           
            const radius = Math.sqrt(
                Math.pow(shape.endX - shape.startX, 2) + 
                Math.pow(shape.endY - shape.startY, 2)
            );
            this.drawHandle(shape.startX + radius, shape.startY, handleSize);
            this.drawHandle(shape.startX - radius, shape.startY, handleSize);
            this.drawHandle(shape.startX, shape.startY + radius, handleSize);
            this.drawHandle(shape.startX, shape.startY - radius, handleSize);
        } else if (shape.type === 'line') {
            
            this.drawHandle(shape.startX, shape.startY, handleSize);
            this.drawHandle(shape.endX, shape.endY, handleSize);
        }
    }

    drawHandle(x, y, size) {
        this.ctx.fillRect(x - size/2, y - size/2, size, size);
        this.ctx.strokeRect(x - size/2, y - size/2, size, size);
    }
 
    getResizeHandle(x, y) {
        if (this.selectedShape === null) return null;
        
        const shape = this.shapes[this.selectedShape];
        const handleSize = 8;
        const threshold = handleSize;
        
        if (shape.type === 'rectangle') {
            if (Math.abs(x - shape.endX) < threshold && Math.abs(y - shape.endY) < threshold) {
                return 'bottomRight';
            }
            if (Math.abs(x - shape.startX) < threshold && Math.abs(y - shape.startY) < threshold) {
                return 'topLeft';
            }
            if (Math.abs(x - shape.endX) < threshold && Math.abs(y - shape.startY) < threshold) {
                return 'topRight';
            }
            if (Math.abs(x - shape.startX) < threshold && Math.abs(y - shape.endY) < threshold) {
                return 'bottomLeft';
            }
        } else if (shape.type === 'line') {
            if (Math.abs(x - shape.startX) < threshold && Math.abs(y - shape.startY) < threshold) {
                return 'topLeft';
            }
            if (Math.abs(x - shape.endX) < threshold && Math.abs(y - shape.endY) < threshold) {
                return 'bottomRight';
            }
        }
        
        return null;
    }
    

    getShapeAtPoint(x, y) {
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            
            if (shape.type === 'rectangle') {
                const minX = Math.min(shape.startX, shape.endX);
                const maxX = Math.max(shape.startX, shape.endX);
                const minY = Math.min(shape.startY, shape.endY);
                const maxY = Math.max(shape.startY, shape.endY);
                
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                    return i;
                }
            } else if (shape.type === 'circle') {
                const radius = Math.sqrt(
                    Math.pow(shape.endX - shape.startX, 2) + 
                    Math.pow(shape.endY - shape.startY, 2)
                );
                const dist = Math.sqrt(
                    Math.pow(x - shape.startX, 2) + 
                    Math.pow(y - shape.startY, 2)
                );
                
                if (dist <= radius) {
                    return i;
                }
            } else if (shape.type === 'line') {
            
                const dist = this.distanceToLine(x, y, shape.startX, shape.startY, shape.endX, shape.endY);
                if (dist < 10) {
                    return i;
                }
            }
        }
        return null;
    }
    
    distanceToLine(x, y, x1, y1, x2, y2) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) param = dot / lenSq;
        
        let xx, yy;
        
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    enableCropMode() {
        this.canvas.style.cursor = 'crop';
    }
    
    disableCropMode() {
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.updateCursor();
    }
    
    applyCrop() {
        if (!this.currentImageData) {
            alert('Сначала загрузите изображение');
            return;
        }
        
        console.log('applyCrop вызван. cropData:', this.cropData);
        
        
        if (!this.cropData.endX || !this.cropData.endY) {
            alert('⚠️ ИНСТРУКЦИЯ:\n\n1. Выберите инструмент "Обрезка"\n2. ВЫДЕЛИТЕ ОБЛАСТЬ МЫШКОЙ на изображении\n   (нажмите и тяните курсор)\n3. Только потом нажмите "Применить"\n\n❌ Сейчас область НЕ ВЫДЕЛЕНА!');
            console.error('Область не выделена! cropData:', this.cropData);
            return;
        }
        
        const startX = Math.min(this.cropData.startX, this.cropData.endX);
        const startY = Math.min(this.cropData.startY, this.cropData.endY);
        const width = Math.abs(this.cropData.endX - this.cropData.startX);
        const height = Math.abs(this.cropData.endY - this.cropData.startY);
        
        console.log('Размеры обрезки:', { startX, startY, width, height });
        
        if (width < 10 || height < 10) {
            alert('Выделенная область слишком мала для обрезки (минимум 10x10 px)');
            return;
        }
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
       
        tempCtx.putImageData(this.pristineImageData, 0, 0);
        
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const croppedCtx = croppedCanvas.getContext('2d');
        
        croppedCtx.drawImage(tempCanvas, startX, startY, width, height, 0, 0, width, height);
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.previewCanvas.width = width;
        this.previewCanvas.height = height;
        
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(croppedCanvas, 0, 0);
        
    
        this.pristineImageData = this.ctx.getImageData(0, 0, width, height);
        this.originalImageData = this.ctx.getImageData(0, 0, width, height);
        this.currentImageData = this.ctx.getImageData(0, 0, width, height);
        
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        
        this.cropData = { startX: 0, startY: 0, endX: 0, endY: 0, ratio: 'free' };
        this.shapes = [];
        this.selectedShape = null;
        
        this.saveState();
        
        console.log('Обрезка применена успешно:', { width, height });
        alert('Обрезка применена!');
    }
    
    
    applyRetouch(x, y) {
        if (!this.currentImageData) return;
        
        const radius = this.brushSize;
        const intensity = this.retouchIntensity;
        const softness = this.retouchSoftness;
        
        const imageData = this.ctx.getImageData(
            Math.max(0, x - radius), 
            Math.max(0, y - radius),
            Math.min(this.canvas.width, radius * 2),
            Math.min(this.canvas.height, radius * 2)
        );
        
        const data = imageData.data;
        const centerX = Math.min(radius, x);
        const centerY = Math.min(radius, y);
        
       
        for (let py = 0; py < imageData.height; py++) {
            for (let px = 0; px < imageData.width; px++) {
                const distance = Math.sqrt(
                    Math.pow(px - centerX, 2) + Math.pow(py - centerY, 2)
                );
                
                if (distance <= radius) {
                    const falloff = Math.max(0, 1 - (distance / radius));
                    const index = (py * imageData.width + px) * 4;
                    
                    
                    let r = 0, g = 0, b = 0, count = 0;
                    
                    for (let dy = -softness; dy <= softness; dy++) {
                        for (let dx = -softness; dx <= softness; dx++) {
                            const nx = px + dx;
                            const ny = py + dy;
                            
                            if (nx >= 0 && nx < imageData.width && 
                                ny >= 0 && ny < imageData.height) {
                                const nIndex = (ny * imageData.width + nx) * 4;
                                r += data[nIndex];
                                g += data[nIndex + 1];
                                b += data[nIndex + 2];
                                count++;
                            }
                        }
                    }
                    
                    if (count > 0) {
                        const avgR = r / count;
                        const avgG = g / count;
                        const avgB = b / count;
                        
                       
                        const mixAmount = intensity * falloff;
                        data[index] = data[index] * (1 - mixAmount) + avgR * mixAmount;
                        data[index + 1] = data[index + 1] * (1 - mixAmount) + avgG * mixAmount;
                        data[index + 2] = data[index + 2] * (1 - mixAmount) + avgB * mixAmount;
                    }
                }
            }
        }
        
        this.ctx.putImageData(imageData, Math.max(0, x - radius), Math.max(0, y - radius));
    }
}


document.addEventListener('DOMContentLoaded', function() {
   
    const editor = new PhotoshopEditor();
    
  
    window.photoEditor = editor;
    
    
    let compareMode = false;
    let savedCurrentState = null;
    
    const toggleCompareBtn = document.getElementById('toggle-compare');
    const compareText = document.getElementById('compare-text');
    
    if (toggleCompareBtn) {
        toggleCompareBtn.addEventListener('click', function() {
            if (!editor.pristineImageData) {
                alert('Сначала загрузите изображение');
                return;
            }
            
            compareMode = !compareMode;
            
            if (compareMode) {
                // Показываем САМОЕ ПЕРВОЕ оригинальное изображение (ДО ВСЕХ изменений)
                compareText.textContent = 'Показать результат';
                this.classList.add('active');
                
                
                savedCurrentState = editor.ctx.getImageData(0, 0, editor.canvas.width, editor.canvas.height);
                
                
                editor.ctx.clearRect(0, 0, editor.canvas.width, editor.canvas.height);
                editor.ctx.putImageData(editor.pristineImageData, 0, 0);
                
            } else {
                
                compareText.textContent = 'Показать оригинал';
                this.classList.remove('active');
                
                
                if (savedCurrentState) {
                    editor.ctx.clearRect(0, 0, editor.canvas.width, editor.canvas.height);
                    editor.ctx.putImageData(savedCurrentState, 0, 0);
                }
            }
        });
    }
    

    
    
    const uploadPanel = document.getElementById('upload-panel');
    if (uploadPanel) {
        uploadPanel.addEventListener('click', function(e) {
            
            if (e.target === uploadPanel) {
                editor.hideUploadPanel();
            }
        });
    }
    
   
    window.addEventListener('beforeunload', function(e) {
        if (editor.history.length > 1) {
            e.preventDefault();
            e.returnValue = '';
        }
    });
    
    
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'z':
                    e.preventDefault();
                    if (e.shiftKey) {
                        editor.redo();
                    } else {
                        editor.undo();
                    }
                    break;
                case 's':
                    e.preventDefault();
                    editor.showSaveModal();
                    break;
            }
        }
    });
});