from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from ...core.exceptions import (
    CycleDetectedError,
    ExecutionError,
    ExperimentNotFoundError,
    GraphNotFoundError,
    NodeNotFoundError,
    PortIncompatibleError,
)


def add_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(GraphNotFoundError)
    async def graph_not_found(request: Request, exc: GraphNotFoundError):
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(NodeNotFoundError)
    async def node_not_found(request: Request, exc: NodeNotFoundError):
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(ExperimentNotFoundError)
    async def experiment_not_found(request: Request, exc: ExperimentNotFoundError):
        return JSONResponse(status_code=404, content={"error": str(exc)})

    @app.exception_handler(PortIncompatibleError)
    async def port_incompatible(request: Request, exc: PortIncompatibleError):
        return JSONResponse(status_code=400, content={"error": str(exc)})

    @app.exception_handler(CycleDetectedError)
    async def cycle_detected(request: Request, exc: CycleDetectedError):
        return JSONResponse(status_code=400, content={"error": str(exc)})

    @app.exception_handler(ExecutionError)
    async def execution_error(request: Request, exc: ExecutionError):
        return JSONResponse(status_code=500, content={"error": str(exc)})

    @app.exception_handler(ValueError)
    async def value_error(request: Request, exc: ValueError):
        return JSONResponse(status_code=400, content={"error": str(exc)})
