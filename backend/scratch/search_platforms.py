
import requests
from decouple import config


def search_not_found():
    client_id = config("TWITCH_CLIENT_ID")
    client_secret = config("TWITCH_CLIENT_SECRET")
    token_resp = requests.post(
        "https://id.twitch.tv/oauth2/token", data={"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}
    )
    token = token_resp.json()["access_token"]
    headers = {"Client-ID": client_id, "Authorization": f"Bearer {token}", "Content-Type": "text/plain"}

    query = 'fields name,id; search "GameCube";'
    resp = requests.post("https://api.igdb.com/v4/platforms", data=query, headers=headers)
    print("GameCube search:", resp.json())

    query = 'fields name,id; search "Mega Drive";'
    resp = requests.post("https://api.igdb.com/v4/platforms", data=query, headers=headers)
    print("Mega Drive search:", resp.json())


if __name__ == "__main__":
    search_not_found()
