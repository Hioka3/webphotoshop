-- Проверка данных в MySQL базе данных

-- 1. Посмотреть все проекты
USE photoshop_web;

SELECT 
    id,
    title,
    width,
    height,
    CHAR_LENGTH(project_data) as data_length,
    LEFT(project_data, 100) as data_preview,
    created_at
FROM projects
ORDER BY created_at DESC;

-- 2. Проверить конкретный проект (замените ID на нужный)
SELECT 
    id,
    title,
    description,
    width,
    height,
    CHAR_LENGTH(project_data) as data_chars,
    LENGTH(project_data) as data_bytes,
    created_at
FROM projects
WHERE id = 1;

-- 3. Проверить, есть ли слово "image" в данных проекта
SELECT 
    id,
    title,
    CASE 
        WHEN project_data LIKE '%"image"%' THEN 'Да'
        ELSE 'Нет'
    END as has_image_field,
    CASE 
        WHEN project_data LIKE '%data:image%' THEN 'Да'
        ELSE 'Нет'
    END as has_base64_image
FROM projects;

-- 4. Попробовать извлечь JSON данные (если MySQL поддерживает JSON)
SELECT 
    id,
    title,
    JSON_EXTRACT(project_data, '$.image') IS NOT NULL as has_image,
    JSON_EXTRACT(project_data, '$.filters') as filters
FROM projects;
