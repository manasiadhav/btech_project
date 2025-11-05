# Backend (Flask) for Centralized Bot Monitoring

Setup (Windows PowerShell):

1. Create a Python virtual environment and activate it:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies:

```powershell
pip install -r requirements.txt
```

3. Place your trained model (optional) as `model.pkl` in this folder.

4. Run the server:

```powershell
python app.py
```

Open http://localhost:5000/api/overview to test.

Docker (optional):

Build: docker build -t bot-monitor-backend .
Run: docker run -p 5000:5000 bot-monitor-backend
