# PaperNest — PDF tools

PaperNest is a self-hosted PDF toolkit with a Next.js frontend and a FastAPI backend. Files are processed by the API host; the project does not call an AI service for document processing. Temporary jobs are removed after the configured retention period (30 minutes by default).

> **Project status:** early-stage but functional. The default branch currently contains 35 tools. Tool limitations are described on the corresponding tool pages.

## Tools

| Category | Available tools |
|---|---|
| Organize PDF | Merge PDF, Split PDF, Compress PDF, Organize PDF, Rotate PDF, Remove Pages, Extract Pages |
| Convert PDF | PDF to Word, Word to PDF, PDF to JPG, JPG to PDF, PDF to Excel, Excel to PDF, PDF to PowerPoint, PowerPoint to PDF, HTML / URL to PDF, PNG to PDF, PDF to PNG, PDF to Text, OCR PDF |
| Edit PDF | Edit PDF (text, shapes, images, annotations), Add Page Numbers, Add Signature, Watermark PDF, Crop PDF, Add Text to PDF |
| Security | Redact PDF, Protect PDF, Unlock PDF, Delete / Sanitize Metadata |
| More tools | Fill PDF Forms, PDF Reader, Edit PDF Metadata, Compare PDF, Repair PDF |

Important limitations: Add Signature places a visual signature image; it is not a cryptographic digital signature. PDF to PowerPoint creates image-based slides. PDF to Excel extracts machine-detectable tables, and OCR quality depends on the scan and installed language data. Redaction is irreversible, so keep an original copy.

## Architecture

- **Frontend:** Next.js App Router and Tailwind CSS in the **frontend/** directory.
- **Backend:** Python and FastAPI in the **backend/** directory.
- **PDF and document libraries:** PyMuPDF, pypdf, pdfplumber, Pillow, openpyxl, python-docx, python-pptx, reportlab, and pdf2docx.
- **External engines:** LibreOffice, Tesseract OCR, Ghostscript, and Chromium via Playwright. Install these on the machine or container running the API, not just on the computer running the frontend. See [External tools](#external-tools).

## Prerequisites

- Git
- Python 3.11 or newer
- Node.js LTS and npm
- LibreOffice, Tesseract, Ghostscript, and Chromium only for the features that need them (see below)

## Quick start

### 1. Clone the repository

~~~powershell
git clone https://github.com/2yadavrajneesh/PaperNest.git
cd PaperNest
~~~

### 2. Start the backend

Windows PowerShell:

~~~powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

macOS / Linux:

~~~bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

Run Uvicorn from the **backend directory**, so the app.main module can be imported. Install and configure any external tools required for the tools you plan to use before starting the API.

### 3. Start the frontend

Open a second terminal:

~~~bash
cd frontend
npm install
npm run dev
~~~

Open http://localhost:3000. Keep both development servers running.

### 4. API documentation

With the backend running:

- Interactive API docs: http://127.0.0.1:8000/docs
- OpenAPI schema: http://127.0.0.1:8000/openapi.json
- Health endpoint: http://127.0.0.1:8000/api/health

## External tools

These executables are used by the backend. Installing a Python package alone does not install the external program. After installation, verify that the API process can find the executable and restart FastAPI if you change environment variables or PATH.

### LibreOffice — Word, Excel, and PowerPoint to PDF

Install LibreOffice from the [official download page](https://www.libreoffice.org/download/download-libreoffice/). It is required for Word-to-PDF, Excel-to-PDF, and PowerPoint-to-PDF conversions.

**Windows:** A common executable path is:

~~~powershell
$env:LIBREOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
Test-Path $env:LIBREOFFICE_PATH
& $env:LIBREOFFICE_PATH --headless --version
~~~

Set the variable in the same PowerShell session used to start FastAPI. The backend also searches PATH, common Windows install folders, and Windows Registry locations. If LibreOffice is installed elsewhere, adjust the path accordingly.

**Ubuntu / Debian:**

~~~bash
sudo apt-get update
sudo apt-get install libreoffice-writer libreoffice-calc libreoffice-impress
soffice --headless --version
~~~

**macOS:** Install LibreOffice from the official download page, then make sure its executable is available to the backend process.

### Tesseract OCR — searchable PDFs

Tesseract is required for OCR PDF. Install the Tesseract engine and the language data you need on the API host. This project offers English (eng), Hindi (hin), and English plus Hindi (eng+hin) OCR options.

**Windows:** Install Tesseract using the [UB Mannheim Windows installer](https://github.com/UB-Mannheim/tesseract/wiki). Select the required language data during installation and ensure the installation directory is on PATH.

**Ubuntu / Debian:**

~~~bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin
~~~

**macOS:** Install Tesseract with Homebrew using **brew install tesseract**. If you need Hindi OCR, confirm the hin trained data is also installed.

Verify the engine and language data:

~~~bash
tesseract --version
tesseract --list-langs
~~~

The language list should include every language code selected in PaperNest. The current backend finds Tesseract through PATH, so ensure the **tesseract** command is available to the FastAPI process. If the engine is missing, the API returns an OCR dependency error; if a requested language is missing, install its language package and restart the request.

### Ghostscript — stronger PDF compression

Ghostscript is optional. Compress PDF uses it when a **gs** executable is found, and otherwise falls back to structural PDF optimization through PyMuPDF. Image recompression may be limited when Ghostscript is unavailable.

**Ubuntu / Debian:**

~~~bash
sudo apt-get update
sudo apt-get install ghostscript
gs --version
~~~

**macOS:**

~~~bash
brew install ghostscript
gs --version
~~~

On Windows, some Ghostscript installers expose the executable as **gswin64c.exe** rather than **gs**. The current backend looks for **gs**, so that installation may not be detected unless a compatible **gs** command is available on PATH. The PyMuPDF fallback remains available.

### Playwright and Chromium — HTML / URL to PDF

HTML / URL to PDF requires the Playwright Python package and a Chromium browser. Playwright is listed in **backend/requirements.txt**; install the browser after installing the Python requirements.

**Windows / macOS / Linux:**

~~~bash
python -m playwright install chromium
~~~

**Linux server:** To install Chromium and its required operating-system dependencies:

~~~bash
python -m playwright install --with-deps chromium
~~~

The backend can also use system Chromium when **chromium** or **chromium-browser** is available on PATH. If HTML-to-PDF fails to launch the browser, run the install command in the same Python environment used by FastAPI. Some minimal server/container images also need the operating-system libraries required by Chromium.

## Configuration

The backend reads configuration from process environment variables. It does **not** automatically load a local .env file by itself. Configure these values in your terminal, IDE run configuration, service manager, or deployment environment before starting FastAPI.

| Variable | Default | Purpose |
|---|---:|---|
| LIBREOFFICE_PATH | Auto-detected when possible | Optional full path to LibreOffice's soffice executable |
| ALLOWED_ORIGINS | http://localhost:3000,http://127.0.0.1:3000 | Comma-separated frontend origins allowed by CORS |
| MAX_FILE_BYTES | 52428800 (50 MiB) | Maximum individual upload size |
| MAX_TOTAL_BYTES | 104857600 (100 MiB) | Maximum combined upload size per request |
| MAX_OUTPUT_BYTES | 262144000 (250 MiB) | Maximum generated output size |
| MAX_FILES | 20 | Maximum number of files in one request |
| MAX_PDF_PAGES | 500 | General PDF page limit |
| MAX_OCR_PAGES | 100 | Maximum OCR pages per file |
| RETENTION_SECONDS | 1800 (30 minutes) | Temporary job retention window |
| PAPERNEST_TEMP_DIR | /tmp/papernest-jobs | Writable directory for temporary job files |

For example, in Windows PowerShell, set the API origin allowlist and LibreOffice path before launching FastAPI:

~~~powershell
$env:ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"
$env:LIBREOFFICE_PATH = "C:\Program Files\LibreOffice\program\soffice.exe"
~~~

For the frontend, set NEXT_PUBLIC_API_URL to the API's reachable URL in its local environment configuration if the default API URL does not match your setup. Do not commit real environment files, credentials, or secrets.

## Troubleshooting

### ModuleNotFoundError: No module named 'app'

Start Uvicorn from the **backend/** directory, using **python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000**. Confirm **backend/app/main.py** exists and activate the intended virtual environment first.

### OCR says Tesseract is missing

Run **tesseract --version** from the same shell used to start the API. If the command is not found, install Tesseract and add its executable directory to PATH, then close and reopen the terminal or IDE and restart FastAPI.

### OCR says a language is missing

Run **tesseract --list-langs** and install the language data for the selected code, such as **eng** or **hin**. Restart the OCR operation after installing the trained data.

### Office conversion says LibreOffice is missing

Verify the executable with **soffice --headless --version** if it is on PATH, or set LIBREOFFICE_PATH to the full path of soffice.exe in the same terminal before starting FastAPI.

### HTML / URL to PDF cannot launch Chromium

Run **python -m playwright install chromium** in the backend virtual environment. On Linux, also try **python -m playwright install --with-deps chromium**. Confirm the API is running under that same environment.

### The frontend cannot connect to the API

Confirm FastAPI is running at the configured API URL, that the URL is reachable from the browser, and that ALLOWED_ORIGINS includes the frontend origin. Restart the relevant process after changing configuration. In a deployed frontend, localhost points to the visitor's computer, not the API server.

### A conversion works locally but fails after deployment

The deployed API runs on a different host from your development PC. Install required engines on that server, ensure temporary storage is writable, configure environment variables and CORS for the production URLs, and verify the host's file and page limits.

## Security and privacy

- Process files only on a host you control and trust.
- Never commit real .env files, credentials, API keys, private documents, or uploaded files.
- Keep virtual environments, node_modules, build output, and temporary conversion files out of Git.
- Validate uploads on the backend and restrict CORS to trusted frontend origins.
- Use HTTPS in production, apply sensible upload limits, and keep temporary-file cleanup enabled.
- Review output files before sharing them, especially redacted documents and conversions with complex layouts.

## Project documentation

- [Windows setup guide](docs/SETUP_WINDOWS.md)
- [Troubleshooting guide](docs/TROUBLESHOOTING.md)
- [Contributing](CONTRIBUTING.md)

