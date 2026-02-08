import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum

from .ports import Port, PortType, PortDirection, Connection
from .media import MediaResult


class NodeType(Enum):
    GENERATE_TEXT = "generate_text"
    GENERATE_IMAGE = "generate_image"
    GENERATE_VIDEO = "generate_video"
    GENERATE_SPEECH = "generate_speech"
    GENERATE_MUSIC = "generate_music"
    ANALYZE_IMAGE = "analyze_image"
    TRANSFORM_IMAGE = "transform_image"


class NodeStatus(Enum):
    IDLE = "idle"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class Position:
    x: float
    y: float


# Port definitions per node type: (name, port_type, direction, description)
_PORT_SPECS: Dict[NodeType, Dict[str, list]] = {
    NodeType.GENERATE_TEXT: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("text", PortType.TEXT, "Generated text")],
    },
    NodeType.GENERATE_IMAGE: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("image", PortType.IMAGE, "Generated image")],
    },
    NodeType.GENERATE_VIDEO: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("video", PortType.VIDEO, "Generated video")],
    },
    NodeType.GENERATE_SPEECH: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("audio", PortType.AUDIO, "Generated speech")],
    },
    NodeType.GENERATE_MUSIC: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("audio", PortType.AUDIO, "Generated music")],
    },
    NodeType.ANALYZE_IMAGE: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("text", PortType.TEXT, "Image description")],
    },
    NodeType.TRANSFORM_IMAGE: {
        "inputs": [("in", PortType.ANY, "Input from upstream node")],
        "outputs": [("image", PortType.IMAGE, "Modified image")],
    },
}


@dataclass
class Node:
    """A processing node with typed input/output ports."""
    id: str
    type: NodeType
    label: str
    params: Dict
    position: Position
    provider: str = "gemini"
    status: NodeStatus = NodeStatus.IDLE
    input_ports: List[Port] = field(default_factory=list)
    output_ports: List[Port] = field(default_factory=list)
    result: Optional[MediaResult] = None
    #TODO: do we need generation_history? I don't think it's used in the Frontend
    generation_history: List[MediaResult] = field(default_factory=list)
    error_message: Optional[str] = None
    stale: bool = False

    def __post_init__(self):
        if not self.input_ports and not self.output_ports:
            self._initialize_ports()

    def _initialize_ports(self):
        spec = _PORT_SPECS.get(self.type, {})
        for name, port_type, desc in spec.get("inputs", []):
            self.input_ports.append(Port(
                id=f"{self.id}_input_{name}",
                name=name,
                port_type=port_type,
                direction=PortDirection.INPUT,
                description=desc,
            ))
        for name, port_type, desc in spec.get("outputs", []):
            self.output_ports.append(Port(
                id=f"{self.id}_output_{name}",
                name=name,
                port_type=port_type,
                direction=PortDirection.OUTPUT,
                description=desc,
            ))

    def get_input_port(self, port_id: str) -> Optional[Port]:
        return next((p for p in self.input_ports if p.id == port_id), None)

    def get_output_port(self, port_id: str) -> Optional[Port]:
        return next((p for p in self.output_ports if p.id == port_id), None)

    def add_generation(self, result: MediaResult) -> None:
        self.generation_history.append(result)
        self.result = result
        self.status = NodeStatus.COMPLETED
        self.stale = False

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "type": self.type.value,
            "label": self.label,
            "params": self.params,
            "position": {"x": self.position.x, "y": self.position.y},
            "provider": self.provider,
            "status": self.status.value,
            "input_ports": [p.to_dict() for p in self.input_ports],
            "output_ports": [p.to_dict() for p in self.output_ports],
            "result": self.result.to_dict() if self.result else None,
            "generation_history": [r.to_dict() for r in self.generation_history],
            "error_message": self.error_message,
            "stale": self.stale,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Node":
        result = MediaResult.from_dict(d["result"]) if d.get("result") else None
        history = [MediaResult.from_dict(r) for r in d.get("generation_history", [])]
        return cls(
            id=d["id"],
            type=NodeType(d["type"]),
            label=d["label"],
            params=d["params"],
            position=Position(x=d["position"]["x"], y=d["position"]["y"]),
            provider=d.get("provider", "gemini"),
            status=NodeStatus(d.get("status", "idle")),
            input_ports=[Port.from_dict(p) for p in d.get("input_ports", [])],
            output_ports=[Port.from_dict(p) for p in d.get("output_ports", [])],
            result=result,
            generation_history=history,
            error_message=d.get("error_message"),
            stale=d.get("stale", False),
        )


@dataclass
class Edge:
    """A connection between two node ports."""
    id: str
    connection: Connection

    @classmethod
    def from_ports(
        cls,
        from_node_id: str,
        from_port_id: str,
        to_node_id: str,
        to_port_id: str,
    ) -> "Edge":
        conn = Connection(from_node_id, from_port_id, to_node_id, to_port_id)
        return cls(id=conn.get_id(), connection=conn)

    def to_dict(self) -> dict:
        c = self.connection
        return {
            "id": self.id,
            "from_node_id": c.from_node_id,
            "from_port_id": c.from_port_id,
            "to_node_id": c.to_node_id,
            "to_port_id": c.to_port_id,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Edge":
        conn = Connection(
            from_node_id=d["from_node_id"],
            from_port_id=d["from_port_id"],
            to_node_id=d["to_node_id"],
            to_port_id=d["to_port_id"],
        )
        return cls(id=d["id"], connection=conn)


@dataclass
class Graph:
    """A DAG of nodes connected by typed port edges."""
    id: str
    name: str
    canvas_memory: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    nodes: Dict[str, Node] = field(default_factory=dict)
    edges: List[Edge] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "canvas_memory": self.canvas_memory,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "nodes": {nid: n.to_dict() for nid, n in self.nodes.items()},
            "edges": [e.to_dict() for e in self.edges],
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Graph":
        nodes = {nid: Node.from_dict(nd) for nid, nd in d["nodes"].items()}
        edges = [Edge.from_dict(ed) for ed in d["edges"]]
        now = time.time()
        return cls(
            id=d["id"], name=d["name"],
            canvas_memory=d.get("canvas_memory", ""),
            created_at=d.get("created_at", now),
            updated_at=d.get("updated_at", now),
            nodes=nodes, edges=edges,
        )

    def add_node(self, node: Node) -> None:
        self.nodes[node.id] = node

    def get_node(self, node_id: str) -> Optional[Node]:
        return self.nodes.get(node_id)

    def add_edge(self, edge: Edge) -> None:
        conn = edge.connection
        from_node = self.get_node(conn.from_node_id)
        to_node = self.get_node(conn.to_node_id)
        if not from_node or not to_node:
            raise ValueError("Source or target node not found")

        from_port = from_node.get_output_port(conn.from_port_id)
        to_port = to_node.get_input_port(conn.to_port_id)
        if not from_port or not to_port:
            raise ValueError("Source or target port not found")

        if not from_port.is_compatible_with(to_port):
            raise ValueError(
                f"Incompatible port types: {from_port.port_type.value} -> {to_port.port_type.value}"
            )

        if self._would_create_cycle(conn):
            raise ValueError("Connection would create a cycle")

        self.edges.append(edge)

    def remove_edge(self, edge_id: str) -> None:
        self.edges = [e for e in self.edges if e.id != edge_id]

    def remove_node(self, node_id: str) -> None:
        self.nodes.pop(node_id, None)
        self.edges = [
            e for e in self.edges
            if e.connection.from_node_id != node_id
            and e.connection.to_node_id != node_id
        ]

    def get_incoming_edges(self, node_id: str) -> List[Edge]:
        return [e for e in self.edges if e.connection.to_node_id == node_id]

    def get_dependencies(self, node_id: str) -> List[str]:
        return [e.connection.from_node_id for e in self.get_incoming_edges(node_id)]

    def get_downstream_nodes(self, node_id: str) -> List[str]:
        """BFS forward walk: return all node IDs reachable downstream from node_id."""
        visited: set = set()
        queue = [node_id]
        while queue:
            nid = queue.pop(0)
            if nid in visited:
                continue
            visited.add(nid)
            for edge in self.edges:
                if edge.connection.from_node_id == nid:
                    queue.append(edge.connection.to_node_id)
        visited.discard(node_id)  # exclude the starting node itself
        return list(visited)

    def mark_stale(self, node_id: str) -> None:
        """Mark the given node and all its downstream dependents as stale."""
        node = self.get_node(node_id)
        if node:
            node.stale = True
        for downstream_id in self.get_downstream_nodes(node_id):
            downstream = self.get_node(downstream_id)
            if downstream:
                downstream.stale = True

    def _would_create_cycle(self, new_conn: Connection) -> bool:
        adj: Dict[str, List[str]] = {nid: [] for nid in self.nodes}
        for edge in self.edges:
            adj[edge.connection.from_node_id].append(edge.connection.to_node_id)
        adj.setdefault(new_conn.from_node_id, []).append(new_conn.to_node_id)

        visited: set = set()
        rec_stack: set = set()

        def has_cycle(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            for neighbor in adj.get(node, []):
                if neighbor not in visited:
                    if has_cycle(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            rec_stack.discard(node)
            return False

        for nid in adj:
            if nid not in visited:
                if has_cycle(nid):
                    return True
        return False
