# backend/apps/core/mixins.py
from rest_framework.response import Response
from rest_framework import status


class ReadAfterWriteMixin:
    """For views that use a different serializer for writes than for reads.
    Ensures create/update responses always reflect the full read serializer
    — avoids fields silently missing from POST/PATCH responses."""

    read_serializer_class = None  # subclasses must set this

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read_serializer = self.read_serializer_class(serializer.instance, context=self.get_serializer_context())
        headers = self.get_success_headers(read_serializer.data)
        return Response(read_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        read_serializer = self.read_serializer_class(serializer.instance, context=self.get_serializer_context())
        return Response(read_serializer.data)