from django.contrib import admin

from .models import Game, Genre, Platform, Publisher


@admin.register(Publisher)
class PublisherAdmin(admin.ModelAdmin):
    list_display = ("name", "website")
    search_fields = ("name",)
    list_filter = ()


@admin.register(Platform)
class PlatformAdmin(admin.ModelAdmin):
    list_display = ("nom_plateforme",)
    search_fields = ("nom_plateforme",)


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ("nom_genre",)
    search_fields = ("nom_genre",)


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ("name", "publisher", "rating_avg", "popularity_score")
    search_fields = ("name", "publisher__name")
    list_filter = ("publisher", "genres", "platforms")
