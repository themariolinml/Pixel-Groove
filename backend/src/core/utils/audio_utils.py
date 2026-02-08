import io
import struct
import wave


def pcm_to_wav(
    pcm_data: bytes,
    sample_rate: int,
    channels: int,
    sample_width: int = 2,
) -> bytes:
    """Wrap raw PCM bytes in a WAV container.

    Args:
        pcm_data: Raw PCM audio bytes.
        sample_rate: e.g. 24000 (TTS) or 48000 (Lyria).
        channels: 1 for mono, 2 for stereo.
        sample_width: Bytes per sample (2 = 16-bit).
    """
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(channels)
        wf.setsampwidth(sample_width)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)
    return buf.getvalue()
