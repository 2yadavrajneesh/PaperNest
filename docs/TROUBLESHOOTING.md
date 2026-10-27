# PaperNest Troubleshooting

## `ModuleNotFoundError: No module named 'app'`

Run Uvicorn from the `backend` directory, not from the project root or the `app` subdirectory:

```powershell
cd path\to\PaperNest\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Confirm that `backend\app\main.py` exists. An empty `backend\app\__init__.py` can make the package explicit if needed.

## `No module named 'uvicorn'` or another dependency

Activate the correct virtual environment and install the dependencies listed in the project's `requirements.txt`:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If there is no dependency file, the project needs a maintained list of its actual dependencies.

## Office conversion says LibreOffice is missing

LibreOffice must be installed on the computer or server running FastAPI. Check the common Windows path:

```powershell
Test-Path "C:\Program Files\LibreOffice\program\soffice.exe"
& "C:\Program Files\LibreOffice\program\soffice.exe" --headless --version
```

Set the path and restart the API in the same PowerShell session:

```powershell
$env:LIBREOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
```

The backend code must read that variable or otherwise locate LibreOffice. A value in an `.env` file is not automatically loaded unless the application or server is configured to load it.

## Frontend cannot reach the backend

- Confirm FastAPI is running at the configured API URL.
- Check the frontend's API URL setting.
- Confirm CORS allows the frontend origin, commonly `http://localhost:3000`.
- Restart the process after changing environment variables.

## Port 8000 is already in use

Stop the previous server with Ctrl+C in the terminal where it is running. Avoid starting duplicate servers unless you intentionally use a different port.

## Local conversion works, but deployment fails

The deployed backend is a different machine from your Windows PC. It needs its own compatible system dependencies, writable temporary storage, correct environment variables, suitable upload limits, and cleanup configuration. In a deployed frontend, `localhost` refers to the visitor's computer, not your API server.
