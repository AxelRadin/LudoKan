# 🎮 IGDB API – Appels Essentiels

Ce document regroupe les requêtes essentielles pour interagir avec la base de données IGDB, via notre backend Node.js (IGDB ne peut pas être appelé directement depuis le frontend).

## 🔑 1. Authentification IGDB

IGDB utilise Twitch OAuth.
Notre backend génère automatiquement un access token via :

POST https://id.twitch.tv/oauth2/token
