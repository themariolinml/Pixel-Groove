"""Executes a single node by dispatching to the appropriate handler."""

import logging
from typing import Any, Dict

from ..models.graph import Node, NodeType
from ..models.media import MediaResult
from ..ports import AIGenerationPort, PromptEnrichmentPort, StoragePort
from .node_handlers import (
    AnalyzeImageHandler,
    ImageHandler,
    MusicHandler,
    NodeHandler,
    SpeechHandler,
    TextHandler,
    TransformImageHandler,
    VideoHandler,
)

logger = logging.getLogger(__name__)


class NodeExecutor:
    """Dispatches node execution to registered handlers by node type."""

    def __init__(self, ai: AIGenerationPort, storage: StoragePort, enricher: PromptEnrichmentPort):
        self._handlers: Dict[NodeType, NodeHandler] = {
            NodeType.GENERATE_TEXT: TextHandler(ai, storage, enricher),
            NodeType.GENERATE_IMAGE: ImageHandler(ai, storage, enricher),
            NodeType.GENERATE_VIDEO: VideoHandler(ai, storage, enricher),
            NodeType.GENERATE_SPEECH: SpeechHandler(ai, storage, enricher),
            NodeType.GENERATE_MUSIC: MusicHandler(ai, storage, enricher),
            NodeType.ANALYZE_IMAGE: AnalyzeImageHandler(ai, storage, enricher),
            NodeType.TRANSFORM_IMAGE: TransformImageHandler(ai, storage, enricher),
        }

    async def execute(self, node: Node, input_data: Dict[str, Any], canvas_memory: str = "") -> MediaResult:
        handler = self._handlers.get(node.type)
        if not handler:
            raise ValueError(f"No handler for node type: {node.type}")
        return await handler.execute(node, input_data, canvas_memory)
