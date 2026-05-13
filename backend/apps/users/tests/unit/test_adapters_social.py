from unittest.mock import MagicMock, patch

from apps.users.adapters_social import Allauth65GoogleOAuth2Adapter, Allauth65OAuth2Client, _allauth_client_has_scope_param


class TestAllauthClientHasScopeParam:
    def test_returns_bool(self):
        assert isinstance(_allauth_client_has_scope_param(), bool)

    def test_true_when_scope_in_init(self):
        class _WithScope:
            def __init__(self, request, scope=None):
                pass

        with patch("apps.users.adapters_social._AllauthOAuth2Client", _WithScope):
            assert _allauth_client_has_scope_param() is True

    def test_false_when_scope_absent_from_init(self):
        class _WithoutScope:
            def __init__(self, request):
                pass

        with patch("apps.users.adapters_social._AllauthOAuth2Client", _WithoutScope):
            assert _allauth_client_has_scope_param() is False


class TestAllauth65OAuth2ClientInit:
    def test_passes_scope_when_param_exists(self):
        """allauth <65: scope forwarded as 7th positional argument."""
        mock_cls = MagicMock()
        request = MagicMock()

        with (
            patch("apps.users.adapters_social._allauth_client_has_scope_param", return_value=True),
            patch("apps.users.adapters_social._AllauthOAuth2Client", mock_cls),
        ):
            Allauth65OAuth2Client(
                request,
                "key",
                "secret",
                "POST",
                "https://token.url",
                "https://callback.url",
                scope=["email", "profile"],
                scope_delimiter=" ",
                headers={"X-Custom": "1"},
                basic_auth=True,
            )

        mock_cls.assert_called_once_with(
            request,
            "key",
            "secret",
            "POST",
            "https://token.url",
            "https://callback.url",
            ["email", "profile"],
            scope_delimiter=" ",
            headers={"X-Custom": "1"},
            basic_auth=True,
        )

    def test_none_scope_coerced_to_empty_list(self):
        """scope=None is passed as [] to avoid allauth TypeError on join."""
        mock_cls = MagicMock()

        with (
            patch("apps.users.adapters_social._allauth_client_has_scope_param", return_value=True),
            patch("apps.users.adapters_social._AllauthOAuth2Client", mock_cls),
        ):
            Allauth65OAuth2Client(
                MagicMock(),
                "key",
                "secret",
                "POST",
                "https://token.url",
                "https://callback.url",
            )

        assert mock_cls.call_args[0][6] == []

    def test_omits_scope_when_param_absent(self):
        """allauth 65+: scope NOT forwarded to underlying client."""
        mock_cls = MagicMock()
        request = MagicMock()

        with (
            patch("apps.users.adapters_social._allauth_client_has_scope_param", return_value=False),
            patch("apps.users.adapters_social._AllauthOAuth2Client", mock_cls),
        ):
            Allauth65OAuth2Client(
                request,
                "key",
                "secret",
                "POST",
                "https://token.url",
                "https://callback.url",
                scope=["email"],
                scope_delimiter=" ",
            )

        mock_cls.assert_called_once_with(
            request,
            "key",
            "secret",
            "POST",
            "https://token.url",
            "https://callback.url",
            scope_delimiter=" ",
            headers=None,
            basic_auth=False,
        )


class TestAllauth65OAuth2ClientMethods:
    def _make_client(self):
        inner = MagicMock()
        mock_cls = MagicMock(return_value=inner)
        with (
            patch("apps.users.adapters_social._allauth_client_has_scope_param", return_value=True),
            patch("apps.users.adapters_social._AllauthOAuth2Client", mock_cls),
        ):
            client = Allauth65OAuth2Client(
                MagicMock(),
                "key",
                "secret",
                "POST",
                "https://token.url",
                "https://callback.url",
            )
        return client, inner

    def test_get_access_token_delegates_to_inner_client(self):
        client, inner = self._make_client()
        inner.get_access_token.return_value = {"access_token": "tok123"}

        result = client.get_access_token("auth-code")

        inner.get_access_token.assert_called_once_with("auth-code")
        assert result == {"access_token": "tok123"}

    def test_get_access_token_forwards_extra_kwargs(self):
        client, inner = self._make_client()
        client.get_access_token("code", pkce_code_verifier="verifier")
        inner.get_access_token.assert_called_once_with("code", pkce_code_verifier="verifier")

    def test_get_redirect_url_delegates_to_inner_client(self):
        client, inner = self._make_client()
        inner.get_redirect_url.return_value = "https://redirect.url?foo=bar"

        result = client.get_redirect_url("https://auth.url", {"state": "xyz"})

        inner.get_redirect_url.assert_called_once_with("https://auth.url", {"state": "xyz"})
        assert result == "https://redirect.url?foo=bar"


class TestAllauth65GoogleOAuth2Adapter:
    def _patch_get_provider(self, get_scope_impl):
        mock_provider = MagicMock()
        mock_provider.get_scope = get_scope_impl
        return mock_provider

    def _get_patched_provider(self, get_scope_impl):
        mock_provider = self._patch_get_provider(get_scope_impl)
        adapter = Allauth65GoogleOAuth2Adapter(MagicMock())
        with patch(
            "allauth.socialaccount.providers.google.views.GoogleOAuth2Adapter.get_provider",
            return_value=mock_provider,
        ):
            return adapter.get_provider(), mock_provider.get_scope

    def test_get_provider_installs_compat_get_scope(self):
        """get_provider() replaces get_scope with a compat wrapper."""
        original_get_scope = MagicMock(return_value=["profile"])
        provider, _ = self._get_patched_provider(original_get_scope)

        assert provider.get_scope is not original_get_scope
        assert callable(provider.get_scope)

    def test_compat_get_scope_calls_no_arg_path(self):
        """allauth 65+: get_scope() with no args returns scopes directly."""
        original_get_scope = MagicMock(return_value=["email", "profile"])
        provider, orig = self._get_patched_provider(original_get_scope)

        result = provider.get_scope()

        assert result == ["email", "profile"]
        original_get_scope.assert_called_once_with()

    def test_compat_get_scope_falls_back_on_typeerror(self):
        """allauth <65: when no-arg get_scope() raises TypeError, retries with request."""
        request = MagicMock()

        def scope_requiring_request(req=None):
            if req is None:
                raise TypeError("request is required")
            return ["email"]

        provider, _ = self._get_patched_provider(scope_requiring_request)

        result = provider.get_scope(request)

        assert result == ["email"]

    def test_compat_get_scope_passes_request_on_fallback(self):
        """The request passed to the compat wrapper reaches the original get_scope."""
        request = MagicMock()
        received = []

        def scope_requiring_request(req=None):
            received.append(req)
            if req is None:
                raise TypeError
            return ["profile"]

        provider, _ = self._get_patched_provider(scope_requiring_request)
        provider.get_scope(request)

        assert received[0] is None  # first attempt — no-arg
        assert received[1] is request  # fallback — with request
