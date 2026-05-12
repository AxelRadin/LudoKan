from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny

from apps.social.blocking import pair_has_block
from apps.users.serializers import PublicUserProfileSerializer

User = get_user_model()


class UserPublicProfileView(RetrieveAPIView):
    """GET /api/users/<pseudo>/profile/"""

    permission_classes = [AllowAny]
    serializer_class = PublicUserProfileSerializer
    lookup_field = "pseudo"
    lookup_url_kwarg = "pseudo"

    def get_queryset(self):
        return User.objects.select_related("steam_profile", "xbox_profile").all()

    def get_object(self):
        pseudo = self.kwargs["pseudo"]
        owner = get_object_or_404(self.get_queryset(), pseudo=pseudo)
        user = self.request.user
        if user.is_authenticated and pair_has_block(user, owner):
            raise NotFound()
        return owner
