from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reviews.views import ReviewViewSet

# Cr�er le router pour les endpoints REST
router = DefaultRouter()
router.register(r"reviews", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
]
