# AeroGuide

AeroGuide to prosty system wspomagania zarządzania ruchem lotniczym, dedykowany dla małych lotnisk w krajach rozwijających się. Aplikacja została stworzona jako projekt open-source, aby zapewnić dostęp do podstawowych funkcji kontroli lotów nawet dla lotnisk o ograniczonych zasobach.

## Funkcje

- Wizualizacja samolotów w przestrzeni powietrznej
- Rejestracja planów lotów
- Przydzielanie pasm startowych i lądowań
- Alerty pogodowe i bezpieczeństwa

## Instalacja

### Wymagania

- Python 3.x
- Flask

### Instrukcja

1. Sklonuj repozytorium:

```bash
git clone https://github.com/TestUJsmialo/AeroGuide.git
cd AeroGuide
```

2. Utwórz wirtualne środowisko i aktywuj je:

```bash
python -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
```

3. Zainstaluj wymagane pakiety:

```bash
pip install -r requirements.txt
```

4. Zainicjuj bazę danych:

```bash
python init_db.py
```

5. Uruchom aplikację:

```bash
python app.py
```

6. Otwórz przeglądarkę i przejdź do adresu:

```
http://127.0.0.1:5000
```

## Logowanie

Domyślne dane logowania:
- Nazwa użytkownika: controller
- Hasło: password123

## Licencja

Projekt dostępny jest na licencji MIT. Szczegóły znajdziesz w pliku LICENSE.

## Współpraca

Zachęcamy do współpracy nad projektem! Jeśli chcesz pomóc w rozwoju AeroGuide, sprawdź otwarte zgłoszenia (issues) lub zgłoś własne propozycje.