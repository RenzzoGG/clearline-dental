"""Serves the single-page app's index.html for the frontend's own routes.

In production the built frontend lives in settings.FRONTEND_DIST: WhiteNoise serves its files
(/assets/*, /img/*, ...) and this view answers every other non-API path (/, /book,
/dashboard/insights...) with index.html, so reloading any page of the app works. In local
development there is no build (Vite serves the frontend), and these paths are a 404.
"""

from functools import cache

from django.conf import settings
from django.http import Http404, HttpRequest, HttpResponse
from django.views.decorators.http import require_GET


@cache
def _index_html() -> bytes | None:
    index = settings.FRONTEND_DIST / "index.html"
    return index.read_bytes() if index.is_file() else None


@require_GET
def index(request: HttpRequest) -> HttpResponse:
    html = _index_html()
    if html is None:
        raise Http404("Frontend build not found.")
    response = HttpResponse(html, content_type="text/html; charset=utf-8")
    # Always revalidate: a new deploy changes which hashed assets index.html points to.
    response["Cache-Control"] = "no-cache"
    return response
