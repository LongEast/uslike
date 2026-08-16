import importlib.util

import pytest


@pytest.fixture
def anyio_backend():
    """Use uvloop when installed, while keeping the tests portable elsewhere.

    The managed WSL sandbox used for this project does not reliably wake the
    default selector loop after worker-thread filesystem calls. Starlette's
    FileResponse and StaticFiles correctly offload those calls, so exercise
    them on uvloop here (the loop Uvicorn uses in production when available).
    """
    if importlib.util.find_spec("uvloop") is not None:
        return "asyncio", {"use_uvloop": True}
    return "asyncio"
