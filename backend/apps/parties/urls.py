from django.urls import path

from apps.parties.views import PartyDetailView, PartyJoinOrCreateView, PartyLeaveView, PartyMeActiveView, PartyReadyForChatView, PartyReadyView

urlpatterns = [
    path("parties/join-or-create", PartyJoinOrCreateView.as_view(), name="party-join-or-create"),
    path("parties/me/active", PartyMeActiveView.as_view(), name="party-me-active"),
    path("parties/<int:party_id>", PartyDetailView.as_view(), name="party-detail"),
    path("parties/<int:party_id>/ready", PartyReadyView.as_view(), name="party-ready"),
    path("parties/<int:party_id>/ready-for-chat", PartyReadyForChatView.as_view(), name="party-ready-for-chat"),
    path("parties/<int:party_id>/leave", PartyLeaveView.as_view(), name="party-leave"),
]
