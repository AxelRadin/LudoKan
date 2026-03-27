from typing import Any, Dict, Optional

from notifications.models import Notification
from rest_framework import serializers


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer pour exposer les notifications utilisateur.

    Champs exposés :
    - id
    - type       : alias lisible du champ verb
    - verb       : verbe brut de la notification
    - actor      : informations minimales sur l'acteur (id, type, repr)
    - target     : informations minimales sur la cible (id, type, repr)
    - extra      : données additionnelles (JSON provenant de Notification.data)
    - timestamp  : date/heure de création
    - unread     : état lu / non-lu (seul champ modifiable via l'API)
    """

    type = serializers.CharField(source="verb", read_only=True)
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()
    extra = serializers.JSONField(source="data", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "verb",
            "actor",
            "target",
            "extra",
            "timestamp",
            "unread",
        ]
        read_only_fields = [
            "id",
            "type",
            "verb",
            "actor",
            "target",
            "extra",
            "timestamp",
        ]

    def _serialize_generic_related(self, obj: Optional[Any]) -> Optional[Dict[str, Any]]:
        """
        Retourne une représentation simple pour les relations génériques
        (actor, target) en évitant de dépendre d'un modèle précis.
        """
        if obj is None:
            return None

        return {
            "id": getattr(obj, "id", None),
            "type": obj.__class__.__name__,
            "repr": str(obj),
        }

    def get_actor(self, instance: Notification) -> Optional[Dict[str, Any]]:
        return self._serialize_generic_related(getattr(instance, "actor", None))

    def get_target(self, instance: Notification) -> Optional[Dict[str, Any]]:
        return self._serialize_generic_related(getattr(instance, "target", None))

    def update(self, instance: Notification, validated_data: Dict[str, Any]) -> Notification:
        """
        Ne permet de modifier que le champ `unread` via l'API.
        """
        unread = validated_data.get("unread")

        if unread is not None:
            instance.unread = unread
            instance.save(update_fields=["unread"])

        return instance
