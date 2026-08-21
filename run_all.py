"""
SignConnect Unified Application Launcher
Launches SignConnect Backend (FastAPI on http://localhost:8000)
and SignConnect Frontend (Vite React on http://localhost:5173).
"""

import os
import sys
import subprocess
import time
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "signconnect-source", "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "signconnect-source", "frontend")

processes = []

def cleanup(sig=None, frame=None):
    print("\n[SignConnect Launcher] Stopping all services...")
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=3)
        except Exception:
            p.kill()
    print("[SignConnect Launcher] All services stopped.")
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)

def main():
    print("=========================================================")
    print("         SIGNCONNECT UNIFIED PLATFORM LAUNCHER         ")
    print("=========================================================")
    print(f"Workspace Directory: {ROOT_DIR}")
    print(f"Backend Directory:   {BACKEND_DIR}")
    print(f"Frontend Directory:  {FRONTEND_DIR}")
    print("---------------------------------------------------------")

    # 1. Start Python FastAPI Backend Server (Port 8000)
    print("\n[Launcher] Starting SignConnect Backend on http://localhost:8000...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR)
    processes.append(backend_proc)
    print("[Launcher] Backend process launched (PID: %d)" % backend_proc.pid)

    time.sleep(2)

    # 2. Start Vite React Frontend (Port 5173)
    print("\n[Launcher] Starting SignConnect Frontend on http://localhost:5173...")
    # On Windows npm is npm.cmd
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=FRONTEND_DIR)
    processes.append(frontend_proc)
    print("[Launcher] Frontend process launched (PID: %d)" % frontend_proc.pid)

    print("\n=========================================================")
    print(" SignConnect Unified Application is Running Successfully! ")
    print("  - Frontend UI: http://localhost:5173")
    print("  - Backend API: http://localhost:8000")
    print("  - API Docs:    http://localhost:8000/docs")
    print(" Press Ctrl+C to stop all services.")
    print("=========================================================\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
