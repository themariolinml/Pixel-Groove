import asyncio
import json
from collections.abc import AsyncGenerator
from typing import Any

from fastapi.responses import StreamingResponse


async def sse_stream(
    event_source: AsyncGenerator[dict[str, Any], None],
    sleep_interval: float = 0.05,
) -> StreamingResponse:
    async def event_generator():
        async for event in event_source:
            data = json.dumps(event)
            yield f"data: {data}\n\n"
            await asyncio.sleep(sleep_interval)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
