---
name: kimi-env-check
description: Check Kimi Code CLI runtime environment, including Node.js version, package managers (npm/pnpm/yarn), Python environment, operating system info, and common development tools. Use when user asks to check environment, diagnose setup issues, verify dependencies, or troubleshoot "command not found" errors.
---

# Kimi Code Environment Checker

This skill helps diagnose and verify the Kimi Code CLI runtime environment.

## When to Use

- User asks to "check environment" or "检查环境"
- Diagnosing setup or installation issues
- Troubleshooting "command not found" errors
- Verifying dependencies before starting development
- Debugging environment-related problems

## Quick Start

Run the environment check script:

```bash
python .agents/skills/kimi-env-check/scripts/check_env.py
```

Or use Shell tool to execute checks individually (see below).

## Manual Environment Checks

If the script cannot run, perform checks manually:

### 1. Node.js Environment

```bash
node --version
npm --version
```

Expected: Node.js 18+ for most modern projects

### 2. Package Managers

```bash
# Check pnpm (preferred for this project)
pnpm --version

# Check yarn
yarn --version

# Check npm
npm --version
```

### 3. Python Environment

```bash
python --version
# or
python3 --version

# Check pip
pip --version
```

### 4. Operating System Info

Windows:
```powershell
ver
systeminfo | findstr /B /C:"OS Name" /C:"OS Version"
```

macOS/Linux:
```bash
uname -a
cat /etc/os-release  # Linux only
```

### 5. Git Version

```bash
git --version
```

### 6. Common Tools

```bash
# TypeScript compiler
tsc --version

# Check if in PATH
echo $PATH  # macOS/Linux
$env:PATH   # Windows PowerShell
```

## Environment Requirements Reference

| Tool | Minimum Version | Notes |
|------|-----------------|-------|
| Node.js | 18.x | Required for React/Vite |
| pnpm | 8.x | Preferred package manager |
| Python | 3.9+ | For scripts and tooling |
| Git | 2.x | Version control |
| TypeScript | 5.x | Strict mode required |

## Troubleshooting Common Issues

### "node: command not found"
- Node.js not installed or not in PATH
- Solution: Install Node.js from https://nodejs.org/

### "pnpm: command not found"
- pnpm not installed
- Solution: `npm install -g pnpm`

### Version Conflicts
- Use nvm (macOS/Linux) or nvm-windows to manage Node.js versions
- Check `.nvmrc` or `package.json` engines field for required versions

## Output Interpretation

The check script outputs:
- ✅ Found - Tool is available and meets version requirements
- ⚠️ Warning - Tool available but version may cause issues
- ❌ Not Found - Tool not installed or not in PATH

Report all findings to the user with clear recommendations.
