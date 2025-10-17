-- Создание базы данных для веб-версии Photoshop
-- Выполните этот скрипт в MySQL Workbench

-- Создание базы данных
CREATE DATABASE IF NOT EXISTS photoshop_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Использование созданной базы данных
USE photoshop_web;

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Таблица проектов
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    original_filename VARCHAR(255),
    thumbnail_path VARCHAR(500),
    project_data LONGTEXT, -- JSON с данными проекта (слои, фильтры, история)
    width INT,
    height INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Таблица истории действий для каждого проекта
CREATE TABLE IF NOT EXISTS project_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'filter', 'crop', 'draw', 'text', etc.
    action_data LONGTEXT, -- JSON с параметрами действия
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Таблица сохраненных изображений
CREATE TABLE IF NOT EXISTS saved_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    format VARCHAR(10), -- 'png', 'jpg', 'webp'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Индексы для оптимизации
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_project_history_project_id ON project_history(project_id);
CREATE INDEX idx_project_history_created_at ON project_history(created_at DESC);
CREATE INDEX idx_saved_images_project_id ON saved_images(project_id);

-- Вставка тестового пользователя (пароль: admin123)
INSERT INTO users (username, email, password_hash) VALUES 
('admin', 'admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2fz.N/WdI2');

COMMIT;