from django.urls import path

from apps.social.views import (
    FriendRequestAcceptView,
    FriendRequestCancelView,
    FriendRequestDeclineView,
    FriendRequestViewSet,
    FriendsListView,
    RemoveFriendView,
    UserBlockDeleteView,
    UserBlockListCreateView,
    UserSearchView,
)

app_name = "social"

urlpatterns = [
    path("blocks/", UserBlockListCreateView.as_view(), name="user-blocks"),
    path("blocks/<int:user_id>/", UserBlockDeleteView.as_view(), name="user-block-delete"),
    path("users/search/", UserSearchView.as_view(), name="social-user-search"),
    path("friend-requests/", FriendRequestViewSet.as_view({"get": "list", "post": "create"}), name="friend-requests"),
    path("friend-requests/<int:pk>/accept/", FriendRequestAcceptView.as_view(), name="friend-request-accept"),
    path("friend-requests/<int:pk>/decline/", FriendRequestDeclineView.as_view(), name="friend-request-decline"),
    path("friend-requests/<int:pk>/cancel/", FriendRequestCancelView.as_view(), name="friend-request-cancel"),
    path("friends/", FriendsListView.as_view(), name="friends-list"),
    path("friends/<int:user_id>/", RemoveFriendView.as_view(), name="friend-remove"),
]
