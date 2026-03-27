from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reviews.views import AdminReportDetailView, AdminReportListView, AdminReviewDetailView, AdminReviewListView, ReviewReportView, ReviewViewSet

# Créer le router pour les endpoints REST publics
router = DefaultRouter()
router.register(r"reviews", ReviewViewSet, basename="review")

urlpatterns = [
    path("", include(router.urls)),
    path("reviews/<int:pk>/report/", ReviewReportView.as_view(), name="review-report"),
    # Admin reviews
    path("admin/reviews/", AdminReviewListView.as_view(), name="admin-reviews-list"),
    path("admin/reviews/<int:pk>/", AdminReviewDetailView.as_view(), name="admin-reviews-detail"),
    # Admin content reports
    path("admin/reports/", AdminReportListView.as_view(), name="admin-reports-list"),
    path("admin/reports/<int:pk>/", AdminReportDetailView.as_view(), name="admin-reports-detail"),
]
