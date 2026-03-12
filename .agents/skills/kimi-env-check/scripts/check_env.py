#!/usr/bin/env python3
"""
Kimi Code Environment Checker
Checks the runtime environment for Kimi Code CLI development.
"""

import subprocess
import sys
import os
import platform
from typing import Optional, Tuple

# Color codes for output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"

# Windows console encoding fix
if sys.platform == "win32":
    import ctypes
    # Enable ANSI colors on Windows 10+
    try:
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except Exception:
        pass
    # Set console codepage to UTF-8
    try:
        ctypes.windll.kernel32.SetConsoleOutputCP(65001)
    except Exception:
        pass


def print_section(title: str) -> None:
    """Print a section header."""
    print(f"\n{BOLD}{'=' * 50}{RESET}")
    print(f"{BOLD}{title}{RESET}")
    print(f"{BOLD}{'=' * 50}{RESET}")


def print_status(status: str, message: str) -> None:
    """Print a status message with color."""
    # Use ASCII symbols for Windows compatibility
    symbols = {
        "ok": "[OK]",
        "warn": "[WARN]",
        "error": "[FAIL]",
        "info": "[INFO]"
    }
    symbol = symbols.get(status, "    ")
    
    if status == "ok":
        print(f"{GREEN}{symbol}{RESET} {message}")
    elif status == "warn":
        print(f"{YELLOW}{symbol}{RESET} {message}")
    elif status == "error":
        print(f"{RED}{symbol}{RESET} {message}")
    else:
        print(f"  {message}")


def run_command(command: list[str]) -> Tuple[bool, Optional[str]]:
    """Run a command and return success status and output."""
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
            shell=(sys.platform == "win32")
        )
        if result.returncode == 0:
            return True, result.stdout.strip()
        return False, None
    except Exception:
        return False, None


def check_nodejs() -> None:
    """Check Node.js installation."""
    print_section("Node.js Environment")
    
    success, version = run_command(["node", "--version"])
    if success and version:
        # Parse version number
        ver_num = version.lstrip("v").split(".")[0]
        major_ver = int(ver_num) if ver_num.isdigit() else 0
        
        if major_ver >= 18:
            print_status("ok", f"Node.js: {version} (meets requirement: 18+)")
        elif major_ver >= 16:
            print_status("warn", f"Node.js: {version} (recommended: 18+)")
        else:
            print_status("error", f"Node.js: {version} (required: 18+)")
    else:
        print_status("error", "Node.js not found in PATH")
        print("   Install from: https://nodejs.org/")


def check_package_managers() -> None:
    """Check package manager installations."""
    print_section("Package Managers")
    
    # Check pnpm
    success, version = run_command(["pnpm", "--version"])
    if success and version:
        ver_num = version.split(".")[0]
        major_ver = int(ver_num) if ver_num.isdigit() else 0
        if major_ver >= 8:
            print_status("ok", f"pnpm: {version} (meets requirement: 8+)")
        else:
            print_status("warn", f"pnpm: {version} (recommended: 8+)")
    else:
        print_status("error", "pnpm not found")
        print("   Install with: npm install -g pnpm")
    
    # Check npm
    success, version = run_command(["npm", "--version"])
    if success and version:
        print_status("ok", f"npm: {version}")
    else:
        print_status("error", "npm not found")
    
    # Check yarn
    success, version = run_command(["yarn", "--version"])
    if success and version:
        print_status("ok", f"yarn: {version}")
    else:
        print_status("info", "yarn: not installed (optional)")


def check_python() -> None:
    """Check Python installation."""
    print_section("Python Environment")
    
    # Try python3 first, then python
    for cmd in ["python3", "python"]:
        success, version = run_command([cmd, "--version"])
        if success and version:
            # Parse version like "Python 3.9.7"
            parts = version.split()
            if len(parts) >= 2:
                ver_str = parts[1]
                ver_nums = ver_str.split(".")
                if len(ver_nums) >= 2:
                    major = int(ver_nums[0]) if ver_nums[0].isdigit() else 0
                    minor = int(ver_nums[1]) if ver_nums[1].isdigit() else 0
                    
                    if major >= 3 and minor >= 9:
                        print_status("ok", f"Python: {version} (meets requirement: 3.9+)")
                    elif major >= 3:
                        print_status("warn", f"Python: {version} (recommended: 3.9+)")
                    else:
                        print_status("error", f"Python: {version} (required: 3.9+)")
            break
    else:
        print_status("error", "Python not found in PATH")
        print("   Install from: https://www.python.org/")


def check_git() -> None:
    """Check Git installation."""
    print_section("Version Control")
    
    success, version = run_command(["git", "--version"])
    if success and version:
        print_status("ok", version)
    else:
        print_status("error", "Git not found")
        print("   Install from: https://git-scm.com/")


def check_os_info() -> None:
    """Check operating system information."""
    print_section("Operating System")
    
    system = platform.system()
    release = platform.release()
    version = platform.version()
    machine = platform.machine()
    
    print(f"  Platform: {system} {release}")
    print(f"  Version: {version}")
    print(f"  Architecture: {machine}")
    print(f"  Processor: {platform.processor()}")


def check_common_tools() -> None:
    """Check common development tools."""
    print_section("Development Tools")
    
    # Check TypeScript
    success, version = run_command(["npx", "tsc", "--version"])
    if success and version:
        print_status("ok", f"TypeScript: {version}")
    else:
        print_status("warn", "TypeScript: not globally available")
    
    # Check if in a project with package.json
    if os.path.exists("package.json"):
        print_status("ok", "Found package.json in current directory")
    else:
        print("  package.json: not found in current directory")


def check_env_variables() -> None:
    """Check important environment variables."""
    print_section("Environment Variables")
    
    important_vars = [
        "PATH",
        "HOME",
        "USERPROFILE",
        "NODE_ENV",
        "PNPM_HOME",
    ]
    
    for var in important_vars:
        value = os.environ.get(var)
        if value:
            # Truncate long values
            if len(value) > 60:
                value = value[:57] + "..."
            print(f"  {var}: {value}")
        else:
            print(f"  {var}: not set")


def main() -> int:
    """Main function."""
    print(f"{BOLD}Kimi Code Environment Checker{RESET}")
    print("Checking your development environment...")
    
    check_os_info()
    check_nodejs()
    check_package_managers()
    check_python()
    check_git()
    check_common_tools()
    check_env_variables()
    
    print(f"\n{BOLD}{'=' * 50}{RESET}")
    print(f"{BOLD}Environment Check Complete{RESET}")
    print(f"{BOLD}{'=' * 50}{RESET}\n")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
