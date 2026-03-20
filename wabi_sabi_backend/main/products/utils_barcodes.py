import re
from typing import Optional
from .models import Product

_BAR_REGEX = re.compile(r"^(A)-(\d+)$")

def _bump_letter_num(letter: str, num: int) -> tuple[str, int]:
    """
    Keep the same letter and only increment the numeric series.
    Example: A-1 -> A-2 ... A-999 -> A-1000
    """
    letter = "A"
    num = int(num or 0) + 1
    return letter, num

def _format_code(letter: str, num: int) -> str:
    return f"A-{num}"

def _parse_code(code: str) -> Optional[tuple[str, int]]:
    m = _BAR_REGEX.match(code or "")
    if not m:
        return None
    return "A", int(m.group(2))

def _find_last_global_code() -> tuple[str, int]:
    """
    Find the most recently created A-series barcode only.
    Falls back to A-0 so next becomes A-1.
    """
    last = (
        Product.objects
        .filter(barcode__regex=r'^A-\d+$')
        .order_by('-created_at', '-id')
        .values_list('barcode', flat=True)
        .first()
    )
    parsed = _parse_code(last) if last else None
    if not parsed:
        return "A", 0
    return parsed

def next_barcode_global() -> str:
    """Returns the next code in the rolling global sequence."""
    letter, num = _find_last_global_code()
    letter, num = _bump_letter_num(letter, num)
    return _format_code(letter, num)