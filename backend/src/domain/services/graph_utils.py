from collections import deque
from typing import Dict, List, Set

from ..models.graph import Graph


def topological_sort(graph: Graph) -> List[str]:
    """Return node IDs in execution order (Kahn's algorithm)."""
    in_degree: Dict[str, int] = {nid: 0 for nid in graph.nodes}
    adj: Dict[str, List[str]] = {nid: [] for nid in graph.nodes}

    for edge in graph.edges:
        src = edge.connection.from_node_id
        dst = edge.connection.to_node_id
        adj[src].append(dst)
        in_degree[dst] += 1

    queue = deque(nid for nid, deg in in_degree.items() if deg == 0)
    order: List[str] = []

    while queue:
        nid = queue.popleft()
        order.append(nid)
        for neighbor in adj[nid]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order


def get_required_nodes(graph: Graph, output_node_ids: List[str]) -> Set[str]:
    """Walk backwards from output nodes to find all nodes that need to execute."""
    required: Set[str] = set()
    stack = list(output_node_ids)

    while stack:
        nid = stack.pop()
        if nid in required:
            continue
        required.add(nid)
        for dep_id in graph.get_dependencies(nid):
            stack.append(dep_id)

    return required


def topological_levels(graph: Graph, node_ids: List[str]) -> List[List[str]]:
    """Group nodes into levels where nodes within a level have no dependencies on each other."""
    adj_reverse: Dict[str, Set[str]] = {nid: set() for nid in node_ids}
    for edge in graph.edges:
        src = edge.connection.from_node_id
        dst = edge.connection.to_node_id
        if src in adj_reverse and dst in adj_reverse:
            adj_reverse[dst].add(src)

    node_set = set(node_ids)
    levels: Dict[str, int] = {}
    for nid in node_ids:
        preds = adj_reverse[nid] & node_set
        levels[nid] = max((levels.get(p, 0) for p in preds), default=-1) + 1

    grouped: Dict[int, List[str]] = {}
    for nid in node_ids:
        grouped.setdefault(levels[nid], []).append(nid)

    return [grouped[lvl] for lvl in sorted(grouped)]
