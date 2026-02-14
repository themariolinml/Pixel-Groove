class GraphNotFoundError(Exception):
    def __init__(self, graph_id: str):
        self.graph_id = graph_id
        super().__init__(f"Graph not found: {graph_id}")


class NodeNotFoundError(Exception):
    def __init__(self, node_id: str):
        self.node_id = node_id
        super().__init__(f"Node not found: {node_id}")


class PortIncompatibleError(Exception):
    def __init__(self, from_type: str, to_type: str):
        self.from_type = from_type
        self.to_type = to_type
        super().__init__(f"Incompatible port types: {from_type} -> {to_type}")


class ExecutionError(Exception):
    pass


class CycleDetectedError(Exception):
    def __init__(self, from_node_id: str, to_node_id: str):
        self.from_node_id = from_node_id
        self.to_node_id = to_node_id
        super().__init__(
            f"Connection from {from_node_id} to {to_node_id} would create a cycle"
        )


class ExperimentNotFoundError(Exception):
    def __init__(self, experiment_id: str):
        self.experiment_id = experiment_id
        super().__init__(f"Experiment not found: {experiment_id}")
