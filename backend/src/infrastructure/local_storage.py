import shutil
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

from PIL import Image

from ..core.config import Settings
from ..domain.models.media import MediaUrls
from ..domain.ports import StoragePort


class LocalStorageManager(StoragePort):
    """Local filesystem implementation of StoragePort."""

    def __init__(self, settings: Settings):
        self._base_path = Path(settings.STORAGE_PATH) / "media"
        self._base_path.mkdir(parents=True, exist_ok=True)

    async def upload_image(self, node_id: str, image_data: bytes, fmt: str = "png") -> MediaUrls:
        gen_id = uuid.uuid4().hex[:12]
        gen_dir = self._base_path / node_id / gen_id
        gen_dir.mkdir(parents=True, exist_ok=True)

        img = Image.open(BytesIO(image_data))

        # Save original
        img.save(gen_dir / f"original.{fmt}", format=fmt.upper())

        # Thumbnail (200x200)
        thumb = img.copy()
        thumb.thumbnail((200, 200), Image.Resampling.LANCZOS)
        thumb.save(gen_dir / "thumbnail.jpg", "JPEG", quality=85)

        base = f"/media/{node_id}/{gen_id}"
        return MediaUrls(
            original=f"{base}/original.{fmt}",
            thumbnail=f"{base}/thumbnail.jpg",
        )

    async def upload_text(self, node_id: str, text: str) -> MediaUrls:
        gen_id = uuid.uuid4().hex[:12]
        gen_dir = self._base_path / node_id / gen_id
        gen_dir.mkdir(parents=True, exist_ok=True)

        (gen_dir / "output.txt").write_text(text, encoding="utf-8")

        # For text, store the actual text content directly in original (not a URL)
        # This avoids an extra fetch on the frontend to read a .txt file
        return MediaUrls(original=text, thumbnail=text)

    async def upload_video(self, node_id: str, video_bytes: bytes, fmt: str = "mp4") -> MediaUrls:
        gen_id = uuid.uuid4().hex[:12]
        gen_dir = self._base_path / node_id / gen_id
        gen_dir.mkdir(parents=True, exist_ok=True)

        (gen_dir / f"original.{fmt}").write_bytes(video_bytes)

        base = f"/media/{node_id}/{gen_id}"
        return MediaUrls(
            original=f"{base}/original.{fmt}",
            thumbnail=f"{base}/original.{fmt}",
        )

    async def upload_audio(self, node_id: str, audio_bytes: bytes, fmt: str = "wav") -> MediaUrls:
        gen_id = uuid.uuid4().hex[:12]
        gen_dir = self._base_path / node_id / gen_id
        gen_dir.mkdir(parents=True, exist_ok=True)

        (gen_dir / f"original.{fmt}").write_bytes(audio_bytes)

        base = f"/media/{node_id}/{gen_id}"
        return MediaUrls(
            original=f"{base}/original.{fmt}",
            thumbnail=f"{base}/original.{fmt}",
        )

    async def read_media_bytes(self, url: str) -> Optional[bytes]:
        """Read original media file bytes from a /media/... URL path."""
        parts = url.split("/media/")
        if len(parts) == 2:
            local_path = self._base_path / parts[1]
            if local_path.exists():
                return local_path.read_bytes()
        return None

    async def delete_node_media(self, node_id: str) -> None:
        node_dir = self._base_path / node_id
        if node_dir.exists():
            shutil.rmtree(node_dir)

    async def duplicate_node_media(self, source_node_id: str, target_node_id: str) -> None:
        source_dir = self._base_path / source_node_id
        if source_dir.exists():
            target_dir = self._base_path / target_node_id
            shutil.copytree(source_dir, target_dir)
