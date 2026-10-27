# PaperNest Windows Setup Guide

This guide covers a typical local development setup. Follow the repository's actual folder layout if it differs from the examples below.

## 1. Install prerequisites

Install:
- [Git for Windows](https://git-scm.com/download/win)
- [Node.js LTS](https://nodejs.org/)
- [Python](https://www.python.org/downloads/)
- [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/) for Office-to-PDF conversion
- [Visual Studio Code](https://code.visualstudio.com/) (optional)

Open a new PowerShell window and verify:

```powershell
git --version
node --version
npm --version
python --version
```

## 2. Clone the repository

```powershell
git clone https://github.com/2yadavrajneesh/PaperNest.git
cd PaperNest
```

## 3. Set up the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

If `requirements.txt` exists, install dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create a local `.env` from `.env.example` if provided. Do not upload the real `.env` file.

Start FastAPI from the backend directory:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

If PowerShell prevents virtual-environment activation, use the environment's Python directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## 4. Set up the frontend

Open a second PowerShell window. Navigate to the folder containing the frontend `package.json`. If it is in the project root:

```powershell
cd path\to\PaperNest
npm install
npm run dev
```

If the frontend is in a `frontend` directory, enter that directory first. Open http://localhost:3000 and keep both terminals open.

## 5. Configure LibreOffice

In the backend PowerShell session:

```powershell
$env:LIBREOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
Test-Path $env:LIBREOFFICE_PATH
& $env:LIBREOFFICE_PATH --headless --version
```

The environment variable applies to that terminal session. Set it again in a new terminal before starting the backend.

## 6. Restart a server

Press Ctrl+C in the relevant terminal, then rerun the command used to start that server.

## 7. Stop the Python virtual environment

```powershell
deactivate
```
