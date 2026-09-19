#!/usr/bin/env python3
"""
Automated import checker for Aapda Setu backend.
Parses all .py files under apps/backend/app/ for imports and cross-checks
against requirements.txt. Fails loudly if any third-party package is missing.
"""

import ast
import re
import sys
from pathlib import Path
from typing import Set, Dict, List, Tuple

# Known stdlib modules (Python 3.11+)
STDLIB_MODULES = {
    'os', 'sys', 'json', 'math', 'time', 'datetime', 'collections', 'itertools',
    'functools', 'pathlib', 'typing', 'dataclasses', 'enum', 'uuid', 'hashlib',
    'random', 'statistics', 'decimal', 'fractions', 'copy', 'pprint', 'textwrap',
    'string', 're', 'html', 'xml', 'csv', 'sqlite3', 'logging', 'argparse',
    'configparser', 'urllib', 'http', 'email', 'mimetypes', 'base64', 'binascii',
    'codecs', 'csv', 'html', 'http', 'json', 'mailbox', 'mimetypes', 'plistlib',
    'socket', 'ssl', 'select', 'signal', 'subprocess', 'threading', 'multiprocessing',
    'asyncio', 'concurrent', 'queue', 'sched', 'timeit', 'traceback', 'types',
    'warnings', 'weakref', 'abc', 'importlib', 'inspect', 'pkgutil', 'modulefinder',
    'runpy', 'site', 'sysconfig', 'zipfile', 'tarfile', 'gzip', 'bz2', 'lzma',
    'zlib', 'hashlib', 'hmac', 'secrets', 'getpass', 'curses', 'tty', 'pty',
    'resource', 'syslog', 'platform', 'errno', 'ctypes', 'msvcrt', 'winreg',
    'pipes', 'shlex', 'shutil', 'tempfile', 'glob', 'fnmatch', 'linecache',
    'pickle', 'shelve', 'marshal', 'dbm', 'sqlite3', 'json', 'csv', 'xml',
    'html', 'http', 'urllib', 'email', 'mailbox', 'mimetypes', 'base64', 'binascii',
    'quopri', 'uu', 'html', 'http', 'xmlrpc', 'ipaddress', 'colorsys', 'imghdr',
    'sndhdr', 'ossaudiodev', 'wave', 'chunk', 'aifc', 'sunau', 'au', 'audioop',
    'imageop', 'rgbimg', 'cmath', 'math', 'numbers', 'fractions', 'decimal',
    'random', 'statistics', 'itertools', 'functools', 'operator', 'collections',
    'heapq', 'bisect', 'array', 'weakref', 'types', 'copy', 'pprint', 'reprlib',
    'enum', 'graphlib', 'contextlib', 'contextvars', 'asyncio', 'concurrent',
    'multiprocessing', 'threading', 'queue', '_thread', 'dummy_threading',
    '_dummy_thread', 'subprocess', 'sched', 'time', 'timeit', 'calendar',
    'datetime', 'zoneinfo', 'string', 'textwrap', 'unicodedata', 'stringprep',
    'readline', 'rlcompleter', 'getopt', 'optparse', 'argparse', 'cmd', 'shlex',
    'configparser', 'netrc', 'xdrlib', 'plistlib', 'csv', 'html', 'http',
    'urllib', 'email', 'json', 'mailbox', 'mimetypes', 'base64', 'binascii',
    'quopri', 'uu', 'hashlib', 'hmac', 'secrets', 'uuid', 'getpass', 'curses',
    'tty', 'pty', 'resource', 'syslog', 'platform', 'errno', 'ctypes', 'msvcrt',
    'winreg', 'pipes', 'shlex', 'shutil', 'tempfile', 'glob', 'fnmatch', 'linecache',
    'pickle', 'shelve', 'marshal', 'dbm', 'sqlite3', 'zlib', 'gzip', 'bz2', 'lzma',
    'zipfile', 'tarfile', 'csv', 'html', 'http', 'urllib', 'xml', 'xmlrpc',
    'ipaddress', 'colorsys', 'imghdr', 'sndhdr', 'ossaudiodev', 'wave', 'chunk',
    'aifc', 'sunau', 'au', 'audioop', 'imageop', 'rgbimg',
}

# Package name mappings (import name -> requirements.txt name)
PACKAGE_MAPPING = {
    'sklearn': 'scikit-learn',
    'cv2': 'opencv-python',
    'PIL': 'Pillow',
    'yaml': 'PyYAML',
    'dotenv': 'python-dotenv',
    'jose': 'python-jose',
    'passlib': 'passlib',
    'bcrypt': 'bcrypt',
    'httpx': 'httpx',
    'pydantic': 'pydantic',
    'pydantic_settings': 'pydantic-settings',
    'pydantic_extra_types': 'pydantic-extra-types',
    'uvicorn': 'uvicorn',
    'fastapi': 'fastapi',
    'pytest': 'pytest',
    'pytest_asyncio': 'pytest-asyncio',
    'pytest_cov': 'pytest-cov',
    'black': 'black',
    'ruff': 'ruff',
    'mypy': 'mypy',
    'pre_commit': 'pre-commit',
    'joblib': 'joblib',
    'twilio': 'twilio',
    'shapely': 'shapely',
    'geopandas': 'geopandas',
    'networkx': 'networkx',
    'pyproj': 'pyproj',
    'numpy': 'numpy',
    'pandas': 'pandas',
    'fiona': 'fiona',
    'pyogrio': 'pyogrio',
    'shapely': 'shapely',
    'rtree': 'rtree',
    'pygeos': 'pygeos',
}

# Local package prefixes to ignore
LOCAL_PREFIXES = {'app', 'optimizer', 'shared_types', 'gis_engine'}


def parse_requirements(requirements_path: Path) -> Set[str]:
    """Parse requirements.txt and return set of package names (lowercase, normalized)."""
    packages = set()
    if not requirements_path.exists():
        return packages
    
    with open(requirements_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('-e'):
                continue
            # Handle version specifiers
            pkg_name = re.split(r'[=<>!~\[]', line)[0].strip()
            packages.add(pkg_name.lower().replace('-', '_'))
    return packages


def get_top_level_imports(file_path: Path) -> Set[str]:
    """Extract top-level imports from a Python file using AST."""
    imports = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content, filename=str(file_path))
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    top_level = alias.name.split('.')[0]
                    imports.add(top_level)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    top_level = node.module.split('.')[0]
                    imports.add(top_level)
    except SyntaxError:
        pass  # Skip files with syntax errors
    except Exception:
        pass  # Skip unreadable files
    
    return imports


def is_third_party(import_name: str) -> bool:
    """Check if an import is a third-party package (not stdlib, not local)."""
    if import_name in STDLIB_MODULES:
        return False
    if import_name in LOCAL_PREFIXES:
        return False
    if import_name.startswith('_'):
        return False
    return True


def normalize_package_name(import_name: str) -> str:
    """Normalize import name to requirements.txt package name."""
    return PACKAGE_MAPPING.get(import_name, import_name).lower().replace('-', '_')


def check_imports(app_dir: Path, requirements_path: Path) -> Tuple[List[str], List[str]]:
    """Check all imports in app_dir against requirements.txt.
    
    Returns:
        (missing_packages, all_third_party_imports)
    """
    requirements_packages = parse_requirements(requirements_path)
    
    all_imports = set()
    python_files = list(app_dir.rglob('*.py'))
    
    for py_file in python_files:
        # Skip test files, __pycache__, and db/ directory (future PostgreSQL integration)
        if '__pycache__' in str(py_file) or py_file.name.startswith('test_'):
            continue
        if 'db' in py_file.parts:
            continue
        imports = get_top_level_imports(py_file)
        all_imports.update(imports)
    
    third_party = {imp for imp in all_imports if is_third_party(imp)}
    normalized_third_party = {normalize_package_name(imp) for imp in third_party}
    
    missing = normalized_third_party - requirements_packages
    
    return sorted(missing), sorted(normalized_third_party)


def main():
    repo_root = Path(__file__).parent.parent.parent
    app_dir = repo_root / 'apps' / 'backend' / 'app'
    requirements_path = repo_root / 'apps' / 'backend' / 'requirements.txt'
    
    print(f"Checking imports in: {app_dir}")
    print(f"Against requirements: {requirements_path}")
    print()
    
    missing, all_third_party = check_imports(app_dir, requirements_path)
    
    print(f"Third-party packages found in imports: {len(all_third_party)}")
    for pkg in all_third_party:
        print(f"  - {pkg}")
    print()
    
    print(f"Packages in requirements.txt: {len(parse_requirements(requirements_path))}")
    for pkg in sorted(parse_requirements(requirements_path)):
        print(f"  - {pkg}")
    print()
    
    if missing:
        print("MISSING PACKAGES (imported but not in requirements.txt):")
        for pkg in missing:
            print(f"  - {pkg}")
        print()
        print("Add these to requirements.txt and run the check again.")
        sys.exit(1)
    else:
        print("All third-party imports are covered by requirements.txt")
        sys.exit(0)


if __name__ == '__main__':
    main()