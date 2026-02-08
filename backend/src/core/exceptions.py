class GraphNotFoundError(Exception):
    def __init__(self, graph_id: str):
        self.graph_id = graph_id
        super().__init__(f"Graph not found: {graph_id}")


class NodeNotFoundError(Exception):
    def __init__(self, node_id: str):
        self.node_id = node_id
        super().__init__(f"Node not found: {node_id}")


class PortIncompatibleError(Exception):
    pass


class ExecutionError(Exception):
    pass


class CycleDetectedError(Exception):
    pass
