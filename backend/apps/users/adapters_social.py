import inspect

from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from allauth.socialaccount.providers.oauth2.client import OAuth2Client as _AllauthOAuth2Client


def _allauth_client_has_scope_param():
    params = inspect.signature(_AllauthOAuth2Client.__init__).parameters
    return "scope" in params


class Allauth65OAuth2Client:
    """
    Compat wrapper for allauth's OAuth2Client.

    allauth 65+ removed the `scope` positional argument from OAuth2Client.__init__
    (scope is now managed at the provider level since providers are instantiated
    with the request). dj-rest-auth 5.x still passes it as the 7th positional arg,
    which hits `scope_delimiter` in allauth 65+ → TypeError.

    This wrapper keeps the old constructor signature so dj-rest-auth can call it
    normally, then delegates to the real allauth client with the right signature.
    """

    def __init__(
        self,
        request,
        consumer_key,
        consumer_secret,
        access_token_method,
        access_token_url,
        callback_url,
        scope=None,
        scope_delimiter=" ",
        headers=None,
        basic_auth=False,
    ):
        if _allauth_client_has_scope_param():
            # allauth < 65: scope is a required positional argument
            self._client = _AllauthOAuth2Client(
                request,
                consumer_key,
                consumer_secret,
                access_token_method,
                access_token_url,
                callback_url,
                scope or [],
                scope_delimiter=scope_delimiter,
                headers=headers,
                basic_auth=basic_auth,
            )
        else:
            # allauth 65+: scope removed from constructor
            self._client = _AllauthOAuth2Client(
                request,
                consumer_key,
                consumer_secret,
                access_token_method,
                access_token_url,
                callback_url,
                scope_delimiter=scope_delimiter,
                headers=headers,
                basic_auth=basic_auth,
            )

    def get_access_token(self, code, **kwargs):
        return self._client.get_access_token(code, **kwargs)

    def get_redirect_url(self, authorization_url, extra_params):
        return self._client.get_redirect_url(authorization_url, extra_params)


class Allauth65GoogleOAuth2Adapter(GoogleOAuth2Adapter):
    """
    Adapts GoogleOAuth2Adapter to be compatible with django-allauth >= 65.x.

    allauth 65+ changed OAuth2Provider.get_scope() to accept no arguments
    (the request is stored in provider.request since allauth 65 instantiates
    providers with the request). dj-rest-auth 5.x still calls get_scope(request)
    → TypeError.

    This adapter patches the provider instance returned by get_provider() so that
    get_scope() accepts an optional request argument, delegating to the underlying
    allauth implementation correctly regardless of version.
    """

    def get_provider(self):
        provider = super().get_provider()
        _orig_get_scope = provider.get_scope

        def _compat_get_scope(request=None):
            # allauth 65+: get_scope() takes no args (request stored in self.request)
            # allauth <65:  get_scope(request) requires request
            try:
                return _orig_get_scope()
            except TypeError:
                return _orig_get_scope(request)

        provider.get_scope = _compat_get_scope
        return provider
