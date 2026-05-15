
import requests
from decouple import config


def test_platforms():
    client_id = config("TWITCH_CLIENT_ID")
    client_secret = config("TWITCH_CLIENT_SECRET")

    # Get token
    token_resp = requests.post(
        "https://id.twitch.tv/oauth2/token", data={"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}
    )
    token = token_resp.json()["access_token"]

    # Get platforms
    headers = {"Client-ID": client_id, "Authorization": f"Bearer {token}", "Content-Type": "text/plain"}
    # Sort by number of games or importance if possible?
    # Actually, let's just get the top ones and some old ones.
    query = "fields name,generation; sort name asc; limit 500;"
    resp = requests.post("https://api.igdb.com/v4/platforms", data=query, headers=headers)
    platforms = resp.json()
    print(f"Total platforms: {len(platforms)}")
    for p in platforms[:20]:
        print(p)


if __name__ == "__main__":
    test_platforms()
