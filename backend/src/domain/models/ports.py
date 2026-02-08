from dataclasses import dataclass
from enum import Enum


class PortType(Enum):
    """Data types that can flow through ports."""
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    ANY = "any"


class PortDirection(Enum):
    INPUT = "input"
    OUTPUT = "output"


@dataclass
class Port:
    """A typed connection point on a node."""
    id: str
    name: str
    port_type: PortType
    direction: PortDirection
    required: bool = True
    description: str = ""

    def is_compatible_with(self, other: "Port") -> bool:
        if self.direction == other.direction:
            return False
        if self.port_type == PortType.ANY or other.port_type == PortType.ANY:
            return True
        return self.port_type == other.port_type

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "port_type": self.port_type.value,
            "direction": self.direction.value,
            "required": self.required,
            "description": self.description,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Port":
        return cls(
            id=d["id"],
            name=d["name"],
            port_type=PortType(d["port_type"]),
            direction=PortDirection(d["direction"]),
            required=d.get("required", True),
            description=d.get("description", ""),
        )


@dataclass
class Connection:
    """A link between two specific ports on two nodes."""
    from_node_id: str
    from_port_id: str
    to_node_id: str
    to_port_id: str

    def get_id(self) -> str:
        return f"{self.from_node_id}:{self.from_port_id}->{self.to_node_id}:{self.to_port_id}"
