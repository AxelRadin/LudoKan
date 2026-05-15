
import requests
from decouple import config


def find_ids():
    client_id = config("TWITCH_CLIENT_ID")
    client_secret = config("TWITCH_CLIENT_SECRET")
    token_resp = requests.post(
        "https://id.twitch.tv/oauth2/token", data={"client_id": client_id, "client_secret": client_secret, "grant_type": "client_credentials"}
    )
    token = token_resp.json()["access_token"]
    headers = {"Client-ID": client_id, "Authorization": f"Bearer {token}", "Content-Type": "text/plain"}

    targets = [
        "Atari 2600",
        "Atari Jaguar",
        "Nintendo Entertainment System",
        "Super Nintendo Entertainment System",
        "Nintendo 64",
        "GameCube",
        "Wii",
        "Wii U",
        "Nintendo Switch",
        "Game Boy",
        "Game Boy Advance",
        "Nintendo DS",
        "Nintendo 3DS",
        "Mega Drive / Genesis",
        "Sega Saturn",
        "Neo Geo AES",
        "PC (Microsoft Windows)",
        "PlayStation",
        "PlayStation 2",
        "PlayStation 3",
        "PlayStation 4",
        "PlayStation 5",
        "PlayStation Portable",
        "PlayStation Vita",
        "Xbox",
        "Xbox 360",
        "Xbox One",
        "Xbox Series X|S",
        "iOS",
        "Android",
    ]

    query = f"fields name,id; where name = ({','.join([f'\"{t}\"' for t in targets])}); limit 100;"
    resp = requests.post("https://api.igdb.com/v4/platforms", data=query, headers=headers)
    platforms = resp.json()

    found = {p["name"]: p["id"] for p in platforms}
    for t in targets:
        print(f"{t}: {found.get(t, 'NOT FOUND')}")


if __name__ == "__main__":
    find_ids()
