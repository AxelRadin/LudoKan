from django.urls import path

from apps.recommendations.views import RecommendationsView

app_name = "recommendations"

urlpatterns = [
    path("recommendations/", RecommendationsView.as_view(), name="recommendations"),
]
