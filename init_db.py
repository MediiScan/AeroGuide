import sqlite3
import os
import datetime

# Upewnij się, że katalog data istnieje
if not os.path.exists('data'):
    os.makedirs('data')

# Ścieżka do bazy danych
DATABASE = os.path.join('data', 'aeroguide.db')

# Inicjalizacja bazy danych
conn = sqlite3.connect(DATABASE)
cursor = conn.cursor()

# Tworzenie tabel
cursor.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS flights (
    id INTEGER PRIMARY KEY,
    flight_number TEXT NOT NULL,
    airline TEXT NOT NULL,
    aircraft_type TEXT NOT NULL,
    departure_time TEXT NOT NULL,
    arrival_time TEXT NOT NULL,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    status TEXT NOT NULL,
    runway INTEGER,
    FOREIGN KEY (runway) REFERENCES runways (id)
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS runways (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    length INTEGER NOT NULL,
    width INTEGER NOT NULL,
    status TEXT NOT NULL
)
''')

cursor.execute('''
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    related_flight INTEGER,
    timestamp TEXT NOT NULL,
    acknowledged INTEGER NOT NULL,
    FOREIGN KEY (related_flight) REFERENCES flights (id)
)
''')

# Dodanie domyślnego użytkownika, jeśli nie istnieje
cursor.execute('SELECT * FROM users WHERE username = "controller"')
if not cursor.fetchone():
    cursor.execute('''
    INSERT INTO users (username, password, full_name, role)
    VALUES ("controller", "password123", "Main Controller", "admin")
    ''')

# Dodanie pasów startowych, jeśli tabela jest pusta
cursor.execute('SELECT COUNT(*) FROM runways')
if cursor.fetchone()[0] == 0:
    runways = [
        ('01L/19R', 3500, 45, 'active'),
        ('01R/19L', 3200, 45, 'active'),
        ('09/27', 2800, 40, 'maintenance')
    ]
    
    cursor.executemany('''
    INSERT INTO runways (name, length, width, status)
    VALUES (?, ?, ?, ?)
    ''', runways)

# Dodanie przykładowych lotów, jeśli tabela jest pusta
cursor.execute('SELECT COUNT(*) FROM flights')
if cursor.fetchone()[0] == 0:
    # Obliczanie czasów dla lotów
    now = datetime.datetime.now()
    
    flights = [
        ('KL1234', 'KLM', 'B737', 
         (now + datetime.timedelta(hours=1)).strftime('%Y-%m-%d %H:%M:%S'),
         (now + datetime.timedelta(hours=3)).strftime('%Y-%m-%d %H:%M:%S'),
         'AMS', 'WAW', 'scheduled', None),
        
        ('LO2345', 'LOT', 'E195', 
         (now + datetime.timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'),
         (now + datetime.timedelta(hours=3, minutes=30)).strftime('%Y-%m-%d %H:%M:%S'),
         'WAW', 'KRK', 'scheduled', None),
        
        ('FR3456', 'Ryanair', 'B738', 
         (now + datetime.timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M:%S'),
         (now + datetime.timedelta(hours=2, minutes=15)).strftime('%Y-%m-%d %H:%M:%S'),
         'STN', 'WAW', 'approaching', None),
        
        ('LH4567', 'Lufthansa', 'A320', 
         (now - datetime.timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S'),
         (now + datetime.timedelta(hours=1, minutes=45)).strftime('%Y-%m-%d %H:%M:%S'),
         'FRA', 'WAW', 'landed', 1)
    ]
    
    cursor.executemany('''
    INSERT INTO flights (flight_number, airline, aircraft_type, departure_time, 
                        arrival_time, origin, destination, status, runway)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', flights)

# Dodanie przykładowych alertów, jeśli tabela jest pusta
cursor.execute('SELECT COUNT(*) FROM alerts')
if cursor.fetchone()[0] == 0:
    now = datetime.datetime.now()
    
    alerts = [
        ('Ostrzeżenie pogodowe', 'Silne opady śniegu spodziewane od 15:00', 'medium',
         None, (now - datetime.timedelta(hours=2)).strftime('%Y-%m-%d %H:%M:%S'), 0),
        
        ('Ograniczona widoczność', 'Widoczność poniżej 1000m na pasie 01L/19R', 'high',
         1, (now - datetime.timedelta(minutes=45)).strftime('%Y-%m-%d %H:%M:%S'), 1)
    ]
    
    cursor.executemany('''
    INSERT INTO alerts (title, description, severity, related_flight, timestamp, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', alerts)

# Zapisanie zmian i zamknięcie połączenia
conn.commit()
conn.close()

print("Baza danych została zainicjowana pomyślnie.")