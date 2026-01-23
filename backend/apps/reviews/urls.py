from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reviews.views import AdminReviewDetailView, AdminReviewListView, ReviewViewSet

# Créer le router pour les endpoints REST publics
router = DefaultRouter()
router.register(r"reviews", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
    # Endpoints admin pour la gestion des reviews
    path("admin/reviews/", AdminReviewListView.as_view(), name="admin-reviews-list"),
    path("admin/reviews/<int:pk>/", AdminReviewDetailView.as_view(), name="admin-reviews-detail"),
]
