"""Per-analysis stash of the landing page extract.
Used by the landing-page-rewrite recommendation so we can quote the original
H1/meta verbatim. In-memory is fine — recommendations are lazy and live in
the same process.
"""
_pages: dict[str, dict[str, str]] = {}


def remember_page(analysis_id: str, page: dict[str, str]) -> None:
    _pages[analysis_id] = page


def get_page(analysis_id: str) -> dict[str, str] | None:
    return _pages.get(analysis_id)
