# PaperNest

PaperNest is a work-in-progress PDF tools website built with a Next.js frontend and a FastAPI backend.

> **Project status:** Work in progress. Only features implemented in the current source code should be treated as available.

## Planned workflows

- Organize PDF
- Convert PDF
- Edit PDF

Update this list as features become available in the application.

## Architecture

- **Frontend:** Next.js
- **Backend:** Python + FastAPI
- **Office document conversion:** LibreOffice on the backend host
- **Local development:** Run the frontend and backend in separate terminal windows

## Prerequisites

Install the following software:

1. [Git for Windows](https://git-scm.com/download/win)
2. [Node.js LTS](https://nodejs.org/)
3. [Python](https://www.python.org/downloads/)
4. [LibreOffice](https://www.libreoffice.org/download/download-libreoffice/) if you need Office-to-PDF conversion
5. [Visual Studio Code](https://code.visualstudio.com/) (optional)

## Quick start on Windows

### 1. Clone the repository

```powershell
git clone https://github.com/2yadavrajneesh/PaperNest.git
cd PaperNest
```

### 2. Start the backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
```

If the backend contains a `requirements.txt`, install its dependencies:

```powershell
python -m pip install -r requirements.txt
```

Create a local `.env` from `backend/.env.example` if that example file exists. Never commit your real `.env` file.

Start FastAPI from the **backend directory**:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3. Start the frontend

Open a second PowerShell window and navigate to the directory containing the frontend's `package.json`. If it is in the repository root:

```powershell
cd path\to\PaperNest
npm install
npm run dev
```

If the frontend is inside a folder such as `frontend`, change into that folder first.

Open http://localhost:3000 in your browser. Keep both development servers running.

## Configuration

Typical local development values may include:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:8000
LIBREOFFICE_PATH=C:\\Program Files\\LibreOffice\\program\\soffice.exe
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
MAX_FILE_BYTES=52428800
MAX_TOTAL_BYTES=104857600
MAX_OUTPUT_BYTES=262144000
MAX_FILES=20
MAX_PDF_PAGES=500
RETENTION_SECONDS=1800
PAPERNEST_TEMP_DIR=
```

These are example values based on the current development setup, not guaranteed settings for every deployment. Confirm that the backend reads each variable. Set the temporary directory to a writable path for your operating system.

## Office document conversion

LibreOffice must be installed on the machine running the FastAPI backend. On Windows, a common path is:

```text
C:\Program Files\LibreOffice\program\soffice.exe
```

Set the path in the same PowerShell session before starting the backend:

```powershell
$env:LIBREOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
& $env:LIBREOFFICE_PATH --headless --version
```

The backend's LibreOffice detection code must read this variable or otherwise locate the executable.

## API documentation

With the backend running, open:

- API docs: http://127.0.0.1:8000/docs
- OpenAPI schema: http://127.0.0.1:8000/openapi.json
- Health endpoint: http://127.0.0.1:8000/api/health (if implemented at this route)

## Project structure

The exact layout depends on the current source code. A typical structure is:

```text
PaperNest/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py
│   ├── requirements.txt
│   └── .env.example
├── docs/
├── .gitignore
└── README.md
```

## Security and privacy

- Do not commit real `.env` files, credentials, API keys, access tokens, private documents, or uploaded files.
- Keep `.venv`, `node_modules`, build output, and temporary conversion files out of Git.
- Validate file types and contents on the backend, not only in the browser.
- Configure upload limits and temporary-file cleanup for your deployment.
- Use HTTPS in production and restrict CORS to trusted frontend origins.
- Review logs to ensure private document contents and secrets are not recorded.

## Deployment

The frontend may be deployed to Vercel, but Office conversion requires a backend host capable of running LibreOffice. A deployed frontend cannot use the LibreOffice executable installed on your personal Windows computer. Set the production API URL and CORS origins appropriately.

## Documentation

- [Windows setup guide](docs/SETUP_WINDOWS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Contributing](CONTRIBUTING.md)

## License

No license has been added. Until one is selected, do not assume that the repository grants permission to reuse, modify, or redistribute the code.
