import os
import runpy
import sys

project_root = os.path.dirname(__file__)
venv_python = os.path.join(project_root, ".venv", "Scripts", "python.exe")

if os.path.exists(venv_python):
	current_python = os.path.normcase(os.path.normpath(sys.executable))
	desired_python = os.path.normcase(os.path.normpath(venv_python))
	if current_python != desired_python:
		os.execv(venv_python, [venv_python, __file__, *sys.argv[1:]])

backend_app_path = os.path.join(os.path.dirname(__file__), "backend", "app.py")
backend_dir = os.path.dirname(backend_app_path)

if backend_dir not in sys.path:
	sys.path.insert(0, backend_dir)

os.chdir(backend_dir)
runpy.run_path(backend_app_path, run_name="__main__")
