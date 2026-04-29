import pytest

from apps.library.models import UserGame, UserLibrary, UserLibraryEntry


@pytest.mark.django_db
class TestUserLibraryModelStr:
    def test_userlibrary_str(self, user):
        lib = UserLibrary.objects.create(user=user, name="Test Lib", system_key="")
        assert "Test Lib" in str(lib)

    def test_userlibrary_entry_str(self, user, game):
        lib = UserLibrary.objects.create(user=user, name="L", system_key="")
        ug = UserGame.objects.create(user=user, game=game)
        entry = UserLibraryEntry.objects.create(library=lib, user_game=ug)
        s = str(entry)
        assert str(lib.pk) in s
        assert str(ug.pk) in s
