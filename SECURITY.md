# Security Guidelines

## 🔒 Sensitive Information

**NEVER commit the following to the repository:**

### Firebase / Google Cloud
- ❌ `.env` files with Firebase API keys
- ❌ `service-account.json` (Firebase Admin SDK credentials)
- ❌ Firebase project credentials
- ✅ These are already in `.gitignore`

### Roku Development
- ❌ Your Roku device IP address (e.g., `192.168.x.x`)
- ❌ Your Roku developer password
- ❌ Any `roku-config.json` files with actual credentials
- ✅ Use `roku-config.example.json` as a template
- ✅ Actual config files are in `.gitignore`

### Personal Information
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Personal API keys or tokens
- ❌ Database connection strings with passwords

## ✅ Safe to Commit

### Configuration Templates
- ✅ `.env.example` files (with placeholder values)
- ✅ `roku-config.example.json` (with placeholder values)
- ✅ Generic documentation with `<placeholders>`

### Public Information
- ✅ Firebase project ID: `story-scout` (public)
- ✅ Firebase app IDs (these are public by design)
- ✅ Internet Archive content URLs (public domain)

## 📋 Pre-Commit Checklist

Before committing, verify:

1. **No real credentials**:
   ```bash
   # Check for potential leaks
   git diff | grep -i "password\|credential\|192.168"
   ```

2. **Environment files ignored**:
   ```bash
   # Verify .gitignore is working
   git status --ignored
   ```

3. **Use placeholders in docs**:
   - ✅ `<your-roku-ip>` instead of `192.168.1.100`
   - ✅ `your-developer-password` instead of actual password
   - ✅ `your-email@example.com` instead of real email

## 🛡️ For Collaborators

### Setting Up Your Local Environment

1. **Copy example files**:
   ```bash
   # Mobile
   cp mobile/.env.example mobile/.env

   # Web
   cp web/.env.example web/.env

   # Roku (optional)
   cp tv/roku/roku-config.example.json tv/roku/roku-config.json
   ```

2. **Add your credentials** to the copied files (not the examples)

3. **Never commit** the actual config files - they're gitignored

### Roku Setup

Each developer needs their own Roku device:

1. Enable Developer Mode on YOUR Roku
2. Find YOUR Roku's IP address
3. Create your own `roku-config.json` (gitignored)
4. Keep your credentials private

### Firebase Setup

1. Get Firebase credentials from project owner
2. Add to your local `.env` files
3. Never commit `.env` files to repo

## 🚨 If Credentials Are Leaked

If you accidentally commit sensitive information:

1. **Immediately rotate the credentials**:
   - Firebase: Regenerate API keys in Firebase Console
   - Roku: Change your developer password

2. **Remove from git history**:
   ```bash
   # Use git filter-branch or BFG Repo-Cleaner
   # Contact repository admin for help
   ```

3. **Force push** (if you have permission)

4. **Notify team members** to re-clone the repository

## 📞 Questions?

If you're unsure whether something is safe to commit, ask before committing!
