from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
import sqlite3
import os
import time
import json
import datetime
from functools import wraps

app = Flask(__name__)
app.secret_key = 'aeroguide-security-key'

# Ścieżka do bazy danych
DATABASE = os.path.join('data', 'aeroguide.db')

# Funkcja do łączenia z bazą danych
def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# Dekorator sprawdzający, czy użytkownik jest zalogowany
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Strona logowania
@app.route('/', methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and user['password'] == password:  # W prawdziwej aplikacji używalibyśmy haszowania
            session['logged_in'] = True
            session['username'] = username
            flash('Zalogowano pomyślnie!')
            return redirect(url_for('dashboard'))
        else:
            error = 'Nieprawidłowa nazwa użytkownika lub hasło'
    
    return render_template('login.html', error=error)

# Wylogowanie
@app.route('/logout')
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    flash('Zostałeś wylogowany')
    return redirect(url_for('login'))

# Główny panel
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=session['username'])

# API: Pobieranie aktywnych lotów
@app.route('/api/flights', methods=['GET'])
@login_required
def get_flights():
    conn = get_db_connection()
    flights = conn.execute('SELECT * FROM flights WHERE status != "completed" ORDER BY departure_time').fetchall()
    conn.close()
    
    # Konwersja na listę słowników
    flight_list = []
    for flight in flights:
        flight_dict = dict(flight)
        flight_list.append(flight_dict)
    
    timestamp = datetime.datetime.now().strftime('%H:%M:%S')
    
    # Symulacja opóźnienia przy dużym obciążeniu
    # To celowe opóźnienie do zadania - w prawdziwej aplikacji nie powinno go być
    time.sleep(0.1)
    
    return jsonify({
        'flights': flight_list,
        'timestamp': timestamp
    })

# API: Dodawanie nowego lotu
@app.route('/api/flights', methods=['POST'])
@login_required
def add_flight():
    data = request.get_json()
    
    # Walidacja danych
    required_fields = ['flight_number', 'airline', 'aircraft_type', 
                       'departure_time', 'arrival_time', 'origin', 'destination']
    
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brak wymaganego pola: {field}'}), 400
    
    # Dodanie lotu do bazy danych
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO flights (flight_number, airline, aircraft_type, departure_time, 
            arrival_time, origin, destination, status, runway)
            VALUES (?, ?, ?, ?, ?, ?, ?, "scheduled", NULL)
        ''', (
            data['flight_number'], data['airline'], data['aircraft_type'],
            data['departure_time'], data['arrival_time'], data['origin'], data['destination']
        ))
        
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
    # Symulacja opóźnienia przy dużym obciążeniu
    time.sleep(0.2)
    
    return jsonify({'id': new_id, 'message': 'Lot dodany pomyślnie'})

# API: Przydzielanie pasa startowego
@app.route('/api/flights/<int:flight_id>/assign_runway', methods=['POST'])
@login_required
def assign_runway(flight_id):
    data = request.get_json()
    
    if 'runway_id' not in data:
        return jsonify({'error': 'Nie podano ID pasa startowego'}), 400
    
    runway_id = data['runway_id']
    
    # Pobranie informacji o pasie startowym
    conn = get_db_connection()
    runway = conn.execute('SELECT * FROM runways WHERE id = ?', (runway_id,)).fetchone()
    
    if not runway:
        conn.close()
        return jsonify({'error': 'Nieprawidłowy pas startowy'}), 404
    
    # Sprawdzenie, czy pas jest dostępny
    runway_status = conn.execute(
        'SELECT COUNT(*) as count FROM flights WHERE runway = ? AND status IN ("preparing", "ready", "taxiing")',
        (runway_id,)
    ).fetchone()
    
    if runway_status['count'] > 0:
        conn.close()
        return jsonify({'error': 'Pas startowy jest już używany'}), 409
    
    # Przydzielenie pasa startowego
    try:
        conn.execute(
            'UPDATE flights SET runway = ?, status = "preparing" WHERE id = ?',
            (runway_id, flight_id)
        )
        conn.commit()
    except sqlite3.Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
    # Symulacja opóźnienia przy dużym obciążeniu
    time.sleep(0.1)
    
    return jsonify({'message': 'Pas startowy przydzielony pomyślnie'})

# API: Pobieranie pasów startowych
@app.route('/api/runways', methods=['GET'])
@login_required
def get_runways():
    conn = get_db_connection()
    runways = conn.execute('SELECT * FROM runways').fetchall()
    conn.close()
    
    # Konwersja na listę słowników
    runway_list = []
    for runway in runways:
        runway_dict = dict(runway)
        runway_list.append(runway_dict)
    
    return jsonify({'runways': runway_list})

# API: Tworzenie alertu
@app.route('/api/alerts', methods=['POST'])
@login_required
def create_alert():
    data = request.get_json()
    
    # Walidacja danych
    required_fields = ['title', 'description', 'severity']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Brak wymaganego pola: {field}'}), 400
    
    # Dodanie alertu do bazy danych
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO alerts (title, description, severity, related_flight, timestamp, acknowledged)
            VALUES (?, ?, ?, ?, ?, 0)
        ''', (
            data['title'], data['description'], data['severity'],
            data.get('related_flight'), datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        conn.commit()
        new_id = cursor.lastrowid
    except sqlite3.Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
    return jsonify({'id': new_id, 'message': 'Alert utworzony pomyślnie'})

# API: Pobieranie alertów
@app.route('/api/alerts', methods=['GET'])
@login_required
def get_alerts():
    conn = get_db_connection()
    alerts = conn.execute('SELECT * FROM alerts ORDER BY timestamp DESC').fetchall()
    conn.close()
    
    # Konwersja na listę słowników
    alert_list = []
    for alert in alerts:
        alert_dict = dict(alert)
        alert_list.append(alert_dict)
    
    return jsonify({'alerts': alert_list})

# API: Emergency Alert
@app.route('/api/emergency_alert', methods=['POST'])
@login_required
def emergency_alert():
    data = request.get_json()
    message = data.get('message', 'Aktywowano alarm awaryjny!')
    
    # W rzeczywistej aplikacji tutaj byłaby logika do powiadamiania odpowiednich służb,
    # uruchamiania procedur awaryjnych itp.
    
    # Logowanie alertu w bazie danych
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO alerts (title, description, severity, timestamp, acknowledged)
            VALUES (?, ?, "critical", ?, 0)
        ''', (
            "EMERGENCY ALERT", message, datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        
        conn.commit()
    except sqlite3.Error as e:
        conn.close()
        return jsonify({'error': str(e)}), 500
    finally:
        conn.close()
    
    return jsonify({'status': 'success', 'message': 'Emergency alert activated'})

if __name__ == '__main__':
    # Upewnij się, że katalog data istnieje
    if not os.path.exists('data'):
        os.makedirs('data')
    
    app.run(debug=True)