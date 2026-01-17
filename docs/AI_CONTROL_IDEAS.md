# Additional AI Control Ideas

This document outlines additional automated checks and controls to maintain code quality and prevent common AI-generated code issues.

---

## 1. Type Hint Validation ⭐ **High Value**

**Problem:** AI sometimes omits return type hints, especially in async functions.

**Solution:** Validate that all public functions have return type hints.

**Implementation:**
```python
# scripts/validate_type_hints.py
# Check that async functions and public functions have return type hints
```

**Why:** Your `.cursorrules` requires "Strict type hints required" and "Prefer explicit return types". This enforces it automatically.

---

## 2. Blocking I/O Detection in Async Functions ⭐ **High Value**

**Problem:** AI sometimes uses blocking I/O (`open()`, `requests.get()`, `time.sleep()`) in async functions.

**Solution:** Detect blocking operations in async functions.

**Common violations:**
- `open()` instead of `aiofiles.open()`
- `requests.get()` instead of `httpx.AsyncClient()`
- `time.sleep()` instead of `asyncio.sleep()`
- `session.query()` instead of `await session.execute()`

**Why:** Your async database rules explicitly forbid blocking I/O in async functions.

---

## 3. Test File Existence Check ⭐ **High Value**

**Problem:** AI sometimes creates new service files without corresponding tests.

**Solution:** Ensure every new service file has a corresponding test file.

**Rules:**
- `src/services/X.py` → `tests/services/test_X.py` must exist
- `src/api/X.py` → `tests/api/test_X.py` must exist
- `src/core/infrastructure/X.py` → `tests/core/infrastructure/test_X.py` must exist

**Why:** Your testing rules state "Auth flows MUST have tests" and "Any DB write logic MUST be covered". This ensures tests aren't forgotten.

---

## 4. Schema/Model Separation Validation

**Problem:** AI might use schemas where models should be used, or vice versa.

**Solution:** Validate that:
- Services use `models` for database operations
- Services use `schemas` for input/output validation
- API routers use `schemas` for request/response, not `models`

**Why:** Your CONTEXT.md explicitly states "Keep schemas separate from models".

---

## 5. Database Session Pattern Validation

**Problem:** AI might create database sessions directly instead of using dependency injection.

**Solution:** Detect patterns like:
- `async with async_session() as session:` in services (should use dependency injection)
- `session = create_session()` in services
- Missing `AsyncSession` parameter in service functions

**Why:** Your async database rules state "ALWAYS inject DB session via `get_session` dependency" and "Services must not manage DB lifecycle directly".

---

## 6. Exception Handling Pattern Validation

**Problem:** AI might catch generic `Exception` or not use domain exceptions.

**Solution:** Validate that:
- Services raise domain exceptions (`src/services/exceptions.py`)
- Generic `except Exception:` is avoided (use specific exceptions)
- API routers convert domain exceptions to HTTP responses

**Why:** Your SOC guidelines require services to raise domain exceptions, not HTTPException.

---

## 7. Hardcoded Values Detection

**Problem:** AI sometimes hardcodes values that should be in config.

**Solution:** Detect common hardcoded values:
- URLs, API endpoints
- Magic numbers (timeouts, limits)
- File paths (should use `settings.local_storage_path`)
- Secret-looking strings (even if not actual secrets)

**Why:** Your security baseline requires "JWT secrets must come from environment variables". This extends the principle.

---

## 8. Dependency Validation

**Problem:** AI might add unnecessary dependencies or use wrong versions.

**Solution:**
- Check for new dependencies in `requirements.txt`
- Validate that new dependencies align with project stack (FastAPI, SQLModel, async)
- Warn about dependencies that might conflict

**Why:** Prevents dependency bloat and conflicts.

---

## 9. Documentation Change Detection

**Problem:** AI might change models/schemas without updating `docs/CONTEXT.md` or `docs/ARCHITECTURE.md`.

**Solution:**
- Detect changes to `src/models.py` or `src/enums.py`
- Remind to update `docs/CONTEXT.md` if domain model changes
- Remind to update `docs/ARCHITECTURE.md` if infrastructure changes

**Why:** Your guidelines state "Domain model changes are reflected in `docs/CONTEXT.md` if needed".

---

## 10. Security Pattern Validation

**Problem:** AI might accidentally log sensitive data or expose credentials.

**Solution:** Detect:
- `print()` or `logger.info()` with password/token variables
- Response schemas that might expose `hashed_password`
- Hardcoded JWT secrets or API keys

**Why:** Your security baseline requires "Never return credentials or tokens in logs or responses".

---

## Implementation Priority

### 🔴 **High Priority (Implement Soon)**

1. **Type Hint Validation** - Enforces your strict typing requirement
2. **Blocking I/O Detection** - Critical for async correctness
3. **Test File Existence Check** - Ensures test coverage

### 🟡 **Medium Priority (Plan for Next Sprint)**

4. **Database Session Pattern Validation** - Enforces dependency injection
5. **Exception Handling Pattern Validation** - Ensures proper SOC
6. **Schema/Model Separation Validation** - Prevents architectural violations

### 🟢 **Low Priority (Nice to Have)**

7. **Hardcoded Values Detection** - Code quality improvement
8. **Dependency Validation** - Prevents bloat
9. **Documentation Change Detection** - Documentation hygiene
10. **Security Pattern Validation** - Additional security layer

---

## Quick Wins

**Easiest to implement:**
- Type hint validation (AST parsing, similar to import validation)
- Test file existence check (simple file system check)
- Schema/model separation (grep for import patterns)

**Most valuable:**
- Blocking I/O detection (prevents runtime issues)
- Database session validation (enforces architecture)
- Exception handling validation (ensures SOC)

---

## Integration with CI

All validation scripts should:
1. Run in the `lint` job (before tests)
2. Fail fast (exit code 1 on violations)
3. Provide clear error messages with file:line references
4. Be fast (< 5 seconds total)

---

## Example: Type Hint Validation Script

```python
#!/usr/bin/env python3
"""Validate that functions have return type hints."""

import ast
import sys
from pathlib import Path

def check_type_hints(file_path: Path) -> list[str]:
    """Check that functions have return type hints."""
    violations = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read(), filename=str(file_path))

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                # Skip private functions (starting with _)
                if node.name.startswith("_"):
                    continue

                # Check if return type annotation exists
                if node.returns is None:
                    violations.append(
                        f"{file_path}:{node.lineno}: Function '{node.name}' missing return type hint"
                    )
    except Exception as e:
        violations.append(f"{file_path}: Error parsing: {e}")

    return violations

def main():
    """Main validation function."""
    violations = []
    src_path = Path("src")

    for py_file in src_path.rglob("*.py"):
        if py_file.name == "__init__.py":
            continue

        file_violations = check_type_hints(py_file)
        violations.extend(file_violations)

    if violations:
        print("❌ Type hint violations detected:")
        for violation in violations:
            print(f"  {violation}")
        sys.exit(1)
    else:
        print("✅ All functions have return type hints")
        sys.exit(0)

if __name__ == "__main__":
    main()
```

---

## Next Steps

1. **Choose 2-3 high-priority validations** to implement first
2. **Create validation scripts** following the pattern of `validate_imports.py`
3. **Add to CI** in the `lint` job
4. **Test on current codebase** to ensure no false positives
5. **Iterate** based on what violations are found

---

**Recommendation:** Start with **Type Hint Validation** and **Test File Existence Check** - they're easy to implement and provide immediate value.
