import re
from typing import Optional
from .models import Product

_BAR_REGEX = re.compile(r"^([A-Z])-(\d{3})$")

def _bump_letter_num(letter: str, num: int) -> tuple[str, int]:
    """A-001..A-999, B-001..Z-999, then wrap to A-001."""
    num += 1
    if num <= 999:
        return letter, num
    # carry over to next letter
    num = 1
    idx = (ord(letter) - ord('A') + 1) % 26  # 0..25
    letter = chr(ord('A') + idx)
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
    Find the most recently created barcode that matches LETTER-NNN.
    We use created order as the “last” (keeps this migration simple and avoids a new DB model).
    Falls back to A-000 so next becomes A-001.
    """
    last = (
        Product.objects
        .filter(barcode__regex=r'^[A-Z]-\d{3}$')
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
