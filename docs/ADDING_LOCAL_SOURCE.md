# Add Your Existing Local PaperNest Source to This Repository

The GitHub repository already contains starter documentation. To add the actual frontend and backend code from your Windows computer, the safest beginner method is to clone this repository first, then copy your project source into that clone.

## 1. Clone the GitHub repository

Open PowerShell and run:

```powershell
cd "$HOME\Desktop"
git clone https://github.com/2yadavrajneesh/PaperNest.git PaperNest-github
```

This creates a folder named `PaperNest-github`.

## 2. Copy your local application source

Your existing project is believed to be at:

```text
C:\Users\Home\Desktop\papernest
```

Copy the actual frontend and backend source files and folders into `PaperNest-github`. Keep the documentation already in the cloned repository; merge folders carefully rather than overwriting them.

Do **not** copy any of the following:

- `.env` or `.env.local` files with real settings or secrets
- `.venv`, `venv`, or `node_modules`
- Private PDFs, uploaded documents, generated output, or temporary files
- API keys, passwords, access tokens, private keys, or personal credentials

Use the root `.gitignore` as a starting point, and review it against the real project structure. If a secret has previously been pushed to any Git repository, revoke or rotate it; deleting the file in a later commit does not remove it from Git history.

## 3. Check the copied files

```powershell
cd "$HOME\Desktop\PaperNest-github"
git status --short
```

Review every listed file before staging. Confirm the frontend's `package.json`, backend source, and actual dependency files are present. If the backend uses `requirements.txt`, ensure it lists the real dependencies.

## 4. Commit and push

```powershell
git add .
git status
git commit -m "Add PaperNest application source"
git push origin main
```

If Git reports there is nothing to commit, verify that you copied the files into the cloned repository folder. If Git asks you to authenticate, follow Git Credential Manager's browser/device flow. Never share credentials in chat.

## 5. Verify on GitHub

Open https://github.com/2yadavrajneesh/PaperNest and check that the source files and documentation are visible, and no secrets or private files were uploaded.
