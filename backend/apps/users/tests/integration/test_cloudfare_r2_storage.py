import os
from urllib.parse import urlparse

import boto3
import pytest
from botocore.exceptions import ClientError
from django.conf import settings
from PIL import Image

pytestmark = [
    pytest.mark.django_db,
    pytest.mark.integration,
    pytest.mark.cloudflare_storage,
    pytest.mark.skipif(
        not os.environ.get("CLOUDFLARE_R2_ENDPOINT"),
        reason="Cloudflare R2 non configuré (CLOUDFLARE_R2_ENDPOINT manquant)",
    ),
]


def _cloudflare_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION_NAME,
    )


def _extract_key_from_url(url: str) -> str:
    """
    À partir d'une URL R2, récupère la clé dans le bucket.

    Ex:
      https://.../ludokan/ci-tests/avatars/foo.jpg -> "ci-tests/avatars/foo.jpg"
      https://.../ludokan/ludokan/staging/avatars/foo.jpg -> "ludokan/staging/avatars/foo.jpg"
    """
    parsed = urlparse(url)
    path = parsed.path.lstrip("/")

    bucket = settings.AWS_STORAGE_BUCKET_NAME
    if path.startswith(f"{bucket}/"):
        return path[len(bucket) + 1 :]
    return path


def _object_exists(key: str) -> bool:
    s3 = _cloudflare_client()
    try:
        s3.head_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey", "NotFound"):
            return False
        raise


def _delete_object_if_exists(key: str) -> None:
    """
    Supprime l'objet s'il existe, pour laisser le bucket propre après les tests.
    """
    s3 = _cloudflare_client()
    try:
        s3.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=key)
    except ClientError as e:
        if e.response["Error"]["Code"] not in ("404", "NoSuchKey", "NotFound"):
            raise


def _create_temp_image(tmp_path, name: str = "avatar.jpg", color: str = "red"):
    img_path = tmp_path / name
    Image.new("RGB", (100, 100), color=color).save(img_path)
    return img_path


def test_cloudfare_upload_creates_object(auth_client_with_tokens, tmp_path):
    """
    Vérifie qu'un upload via /api/auth/user/ crée bien un objet dans le bucket R2.
    """
    client = auth_client_with_tokens
    url = "/api/auth/user/"

    img_path = _create_temp_image(tmp_path, "avatar_upload.jpg", "red")
    with img_path.open("rb") as f:
        response = client.patch(url, {"avatar": f}, format="multipart")

    assert response.status_code == 200
    avatar_url = response.data["avatar"]
    assert avatar_url

    key = _extract_key_from_url(avatar_url)
    assert _object_exists(key)

    _delete_object_if_exists(key)


def test_cloudfare_update_replaces_object(auth_client_with_tokens, tmp_path):
    """
    Vérifie qu'un remplacement d'avatar supprime l'ancien objet et crée le nouveau.
    """
    client = auth_client_with_tokens
    url = "/api/auth/user/"

    # 1er avatar
    img1 = _create_temp_image(tmp_path, "avatar1.jpg", "red")
    with img1.open("rb") as f1:
        r1 = client.patch(url, {"avatar": f1}, format="multipart")
    assert r1.status_code == 200
    key1 = _extract_key_from_url(r1.data["avatar"])
    assert _object_exists(key1)

    # 2e avatar (remplacement)
    img2 = _create_temp_image(tmp_path, "avatar2.jpg", "blue")
    with img2.open("rb") as f2:
        r2 = client.patch(url, {"avatar": f2}, format="multipart")
    assert r2.status_code == 200
    key2 = _extract_key_from_url(r2.data["avatar"])

    assert key1 != key2
    assert _object_exists(key2)
    assert not _object_exists(key1)

    _delete_object_if_exists(key1)
    _delete_object_if_exists(key2)


def test_cloudfare_delete_avatar_removes_object(auth_client_with_tokens, tmp_path):
    """
    Vérifie que la suppression de l'avatar (avatar=null) supprime aussi l'objet R2.
    """
    client = auth_client_with_tokens
    url = "/api/auth/user/"

    img = _create_temp_image(tmp_path, "avatar_del.jpg", "green")
    with img.open("rb") as f:
        r1 = client.patch(url, {"avatar": f}, format="multipart")
    assert r1.status_code == 200
    key = _extract_key_from_url(r1.data["avatar"])
    assert _object_exists(key)

    # Suppression côté API
    r2 = client.patch(url, {"avatar": None}, format="json")
    assert r2.status_code == 200

    assert not _object_exists(key)
