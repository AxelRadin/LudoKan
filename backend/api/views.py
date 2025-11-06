from rest_framework import viewsets
from rest_framework.response import Response


class ItemViewSet(viewsets.ViewSet):
    """ViewSet temporaire pour les tests"""
    
    def list(self, request):
        return Response({"message": "API is working"})
    
    def create(self, request):
        return Response({"message": "Item created"})
    
    def retrieve(self, request, pk=None):
        return Response({"message": f"Item {pk}"})
    
    def update(self, request, pk=None):
        return Response({"message": f"Item {pk} updated"})
    
    def destroy(self, request, pk=None):
        return Response({"message": f"Item {pk} deleted"})
