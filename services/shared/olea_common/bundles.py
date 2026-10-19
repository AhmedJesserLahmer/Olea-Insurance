"""Insurance bundle catalogue shared by every service (no ML dependencies)."""
from typing import Dict, Tuple

BUNDLE_META: Dict[int, Tuple[str, str]] = {
    0: ("BH-001", "Basic Health"),
    1: ("HDV-002", "Health + Dental + Vision"),
    2: ("FC-003", "Family Comprehensive"),
    3: ("PHL-004", "Premium Health & Life"),
    4: ("AL-005", "Auto Liability Basic"),
    5: ("AC-006", "Auto Comprehensive"),
    6: ("HS-007", "Home Standard"),
    7: ("HP-008", "Home Premium"),
    8: ("RB-009", "Renter's Basic"),
    9: ("RP-010", "Renter's Premium"),
}
