import os
import json
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from PIL import Image
import pymysql
from dotenv import load_dotenv

# Загрузка переменных окружения
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'static/uploads')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))

# Конфигурация базы данных
# Переключение между SQLite и MySQL
USE_MYSQL = os.getenv('USE_MYSQL', 'False').lower() == 'true'

if USE_MYSQL:
    # Подключение к MySQL
    mysql_host = os.getenv('MYSQL_HOST', 'localhost')
    mysql_port = os.getenv('MYSQL_PORT', '3306')
    mysql_username = os.getenv('MYSQL_USERNAME', 'root')
    mysql_password = os.getenv('MYSQL_PASSWORD', '')
    mysql_database = os.getenv('MYSQL_DATABASE', 'photoshop_web')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'mysql+pymysql://{mysql_username}:{mysql_password}@{mysql_host}:{mysql_port}/{mysql_database}'
    print(f"🔌 Подключение к MySQL: {mysql_host}:{mysql_port}/{mysql_database}")
else:
    # Подключение к SQLite (по умолчанию)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///photoshop_web.db'
    print("📁 Использование SQLite базы данных")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Настройка Flask-Login
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Модели базы данных
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    projects = db.relationship('Project', backref='user', lazy=True, cascade='all, delete-orphan')

class Project(db.Model):
    __tablename__ = 'projects'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    original_filename = db.Column(db.String(255))
    thumbnail_path = db.Column(db.String(500))
    project_data = db.Column(db.Text)  # JSON данные
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_public = db.Column(db.Boolean, default=False)
    
    history = db.relationship('ProjectHistory', backref='project', lazy=True, cascade='all, delete-orphan')
    saved_images = db.relationship('SavedImage', backref='project', lazy=True, cascade='all, delete-orphan')

class ProjectHistory(db.Model):
    __tablename__ = 'project_history'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    action_type = db.Column(db.String(50), nullable=False)
    action_data = db.Column(db.Text)  # JSON данные
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class SavedImage(db.Model):
    __tablename__ = 'saved_images'
    
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.BigInteger)
    format = db.Column(db.String(10))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Функция для создания таблиц при первом запуске
def create_tables():
    try:
        db.create_all()
        print("Таблицы базы данных созданы успешно!")
    except Exception as e:
        print(f"Ошибка при создании таблиц: {e}")

# Маршруты
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        
        # Проверка существующего пользователя
        if User.query.filter_by(username=username).first():
            flash('Пользователь с таким именем уже существует')
            return redirect(url_for('register'))
        
        if User.query.filter_by(email=email).first():
            flash('Пользователь с таким email уже существует')
            return redirect(url_for('register'))
        
        # Создание нового пользователя
        password_hash = generate_password_hash(password)
        new_user = User(username=username, email=email, password_hash=password_hash)
        
        try:
            db.session.add(new_user)
            db.session.commit()
            flash('Регистрация успешна! Можете войти в систему.')
            return redirect(url_for('login'))
        except Exception as e:
            db.session.rollback()
            flash('Ошибка при регистрации. Попробуйте снова.')
            return redirect(url_for('register'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            login_user(user)
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('profile'))
        else:
            flash('Неправильное имя пользователя или пароль')
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/profile')
@login_required
def profile():
    projects = Project.query.filter_by(user_id=current_user.id).order_by(Project.updated_at.desc()).all()
    return render_template('profile.html', projects=projects)

@app.route('/editor')
@login_required
def editor():
    return render_template('editor.html')

@app.route('/editor/<int:project_id>')
@login_required
def edit_project(project_id):
    project = Project.query.filter_by(id=project_id, user_id=current_user.id).first_or_404()
    return render_template('editor.html', project=project)

@app.route('/api/save_project', methods=['POST'])
@login_required
def save_project():
    print("\n" + "="*50)
    print("🔥 API SAVE_PROJECT ВЫЗВАНА!")
    print("="*50 + "\n")
    try:
        data = request.json
        print(f"📦 Получены данные: {list(data.keys()) if data else 'None'}")
        project_id = data.get('project_id')
        
        print("=== DEBUG: Сохранение проекта ===")
        print(f"Title: {data.get('title')}")
        print(f"Width: {data.get('width')}")
        print(f"Height: {data.get('height')}")
        print(f"Project_data type: {type(data.get('project_data'))}")
        
        # Проверяем, что есть минимально необходимые данные
        if not data.get('width') or not data.get('height'):
            print("ERROR: Отсутствуют размеры изображения")
            return jsonify({'success': False, 'error': 'Отсутствуют размеры изображения'})
        
        # Проверяем, что есть данные проекта (не пустые)
        project_data = data.get('project_data', {})
        if not project_data or not isinstance(project_data, dict):
            print("ERROR: Отсутствуют данные проекта")
            return jsonify({'success': False, 'error': 'Отсутствуют данные проекта'})
        
        # Проверяем наличие изображения
        if not project_data.get('image'):
            print("ERROR: Отсутствует изображение")
            return jsonify({'success': False, 'error': 'Отсутствует изображение для сохранения'})
        
        image_data = project_data.get('image', '')
        print(f"Image data length: {len(image_data)}")
        print(f"Image data preview: {image_data[:100]}...")
        
        if project_id:
            project = Project.query.filter_by(id=project_id, user_id=current_user.id).first_or_404()
        else:
            project = Project(user_id=current_user.id)
        
        project.title = data.get('title', 'Без названия')
        project.description = data.get('description', '')
        project.project_data = json.dumps(project_data)
        project.width = data.get('width')
        project.height = data.get('height')
        
        if not project_id:
            db.session.add(project)
        
        db.session.commit()
        
        print(f"SUCCESS: Проект сохранен с ID: {project.id}")
        return jsonify({'success': True, 'project_id': project.id})
    except Exception as e:
        db.session.rollback()
        print(f"EXCEPTION: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/load_project/<int:project_id>')
@login_required
def load_project(project_id):
    try:
        project = Project.query.filter_by(id=project_id, user_id=current_user.id).first_or_404()
        
        project_data = {}
        if project.project_data:
            project_data = json.loads(project.project_data)
        
        return jsonify({
            'success': True,
            'project': {
                'id': project.id,
                'title': project.title,
                'description': project.description,
                'width': project.width,
                'height': project.height,
                'project_data': project_data
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/upload_image', methods=['POST'])
@login_required
def upload_image():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'Файл не выбран'})
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'Файл не выбран'})
    
    if file:
        try:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Получение размеров изображения
            with Image.open(file_path) as img:
                width, height = img.size
            
            return jsonify({
                'success': True,
                'file_path': file_path,
                'width': width,
                'height': height
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

@app.route('/api/delete_project/<int:project_id>', methods=['DELETE'])
@login_required
def delete_project(project_id):
    try:
        project = Project.query.filter_by(id=project_id, user_id=current_user.id).first_or_404()
        db.session.delete(project)
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/clean_empty_projects', methods=['POST'])
@login_required
def clean_empty_projects():
    try:
        # Находим все проекты пользователя
        all_projects = Project.query.filter_by(user_id=current_user.id).all()
        empty_projects = []
        
        for project in all_projects:
            # Проверяем, пустой ли проект
            is_empty = False
            
            if not project.width or not project.height:
                is_empty = True
            elif not project.project_data or project.project_data in ['', '{}', 'null']:
                is_empty = True
            else:
                # Проверяем наличие изображения в данных проекта
                try:
                    data = json.loads(project.project_data)
                    if not data.get('image'):
                        is_empty = True
                except:
                    is_empty = True
            
            if is_empty:
                empty_projects.append(project)
        
        count = len(empty_projects)
        
        for project in empty_projects:
            db.session.delete(project)
        
        db.session.commit()
        return jsonify({'success': True, 'deleted_count': count})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    app.run(debug=True)