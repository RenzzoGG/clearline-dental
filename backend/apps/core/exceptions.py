from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.response import Response
from rest_framework.views import exception_handler


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "The request conflicts with the current state of the resource."
    default_code = "conflict"


def api_exception_handler(exc, context):
    """DRF's handler plus a 409 for deleting rows that other records still reference."""
    if isinstance(exc, ProtectedError):
        return Response(
            {"detail": "This record cannot be deleted because other records depend on it."},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)
