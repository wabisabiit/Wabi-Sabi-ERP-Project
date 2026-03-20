import re
from typing import Optional
from .models import Product

_BAR_REGEX = re.compile(r"^([A-Z])-(\d+)$")


def _bump_letter_num(letter: str, num: int) -> tuple[str, int]:
    """
    Keep the same letter and only increment the numeric series.
    Example: A-001 -> A-002 ... A-999 -> A-1000
    """
    num += 1
    return letter, num


def _format_code(letter: str, num: int) -> str:
    return f"{letter}-{num:03d}"


def _parse_code(code: str) -> Optional[tuple[str, int]]:
    m = _BAR_REGEX.match(code or "")
    if not m:
        return None
    return m.group(1), int(m.group(2))


def _find_last_global_code() -> tuple[str, int]:
    """
    Find the most recently created barcode that matches LETTER-NUMBER.
    Falls back to A-000 so next becomes A-001.
    """
    last = (
        Product.objects
        .filter(barcode__regex=r'^[A-Z]-\d+$')
        .order_by('-created_at', '-id')
        .values_list('barcode', flat=True)
        .first()
    )
    parsed = _parse_code(last) if last else None
    if not parsed:
        return "A", 0   # will become A-001
    return parsed


def next_barcode_global() -> str:
    """Returns the next code in the rolling global sequence."""
    letter, num = _find_last_global_code()
    letter, num = _bump_letter_num(letter, num)
    return _format_code(letter, num)