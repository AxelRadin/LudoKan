from django.db import models


class Publisher(models.Model):
    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Platform(models.Model):
    nom_plateforme = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_plateforme


class Genre(models.Model):
    nom_genre = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nom_genre


class Game(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    min_players = models.IntegerField(blank=True, null=True)
    max_players = models.IntegerField(blank=True, null=True)
    min_age = models.IntegerField(blank=True, null=True)
    rating_avg = models.FloatField(default=0.0)
    popularity_score = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    publisher = models.ForeignKey(Publisher, on_delete=models.CASCADE, related_name="games")
    platforms = models.ManyToManyField(Platform, related_name="games")
    genres = models.ManyToManyField(Genre, related_name="games")

    def __str__(self):
        return self.name
