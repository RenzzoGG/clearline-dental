"""Rate limiting keyed on the real client IP behind the deploy platform's proxy.

DRF's default identifies anonymous clients by X-Forwarded-For plus NUM_PROXIES. That only works
when the proxy chain has a fixed length. Railway's edge rebuilds X-Forwarded-For with a hop of its
own that changes per request, so every attempt looked like a new client and limits never kicked
in. The edge also overwrites X-Real-IP with the connecting client's address, so in production the
client IP is read from that single header (settings.CLIENT_IP_HEADER) instead.

With CLIENT_IP_HEADER unset (local development, CI) this is plain DRF behaviour: the header is
only trustworthy when a proxy overwrites it, otherwise any client could pick its own identity.
"""

from django.conf import settings
from rest_framework.throttling import ScopedRateThrottle


def _meta_key(header: str) -> str:
    return "HTTP_" + header.upper().replace("-", "_")


class ClientIPScopedRateThrottle(ScopedRateThrottle):
    def get_ident(self, request):
        header = settings.CLIENT_IP_HEADER
        if header:
            client_ip = request.META.get(_meta_key(header), "").strip()
            if client_ip:
                return client_ip
        return super().get_ident(request)
