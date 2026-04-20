from __future__ import annotations

from django.contrib.auth.models import AbstractBaseUser
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.games.models import Game
from apps.parties.constants import DEFAULT_PARTY_MAX_PLAYERS, MIN_PLAYERS_TO_CONTINUE, OPEN_TIMEOUT, READY_TIMEOUT
from apps.parties.models import GameParty, GamePartyMember
from apps.parties.services.members import active_member_count, open_parties_with_active_count_qs


def resolve_party_max_players(game: Game, *, max_players_override: int | None = None) -> int:
    """
    Détermine le plafond de places pour une nouvelle party.

    Priorité : `max_players_override` (>= 1) > `Game.max_players` s'il est un entier >= 1 >
    `DEFAULT_PARTY_MAX_PLAYERS` (`Game.max_players` absent, null, 0 ou négatif).
    """
    if max_players_override is not None:
        if max_players_override < 1:
            raise ValueError("max_players_override must be >= 1")
        return max_players_override
    mp = game.max_players
    if mp is not None and mp >= 1:
        return int(mp)
    return DEFAULT_PARTY_MAX_PLAYERS


def select_open_party_for_recruitment(game: Game) -> GameParty | None:
    """
    Sélection en lecture seule : party `open` avec encore de la place, la plus remplie,
    puis la plus ancienne (`created_at` croissant).

    Pour un join atomique, utiliser `join_or_create_party` (verrous exclusifs).
    """
    qs = open_parties_with_active_count_qs(game.id).filter(_active_member_count__lt=F("max_players")).order_by("-_active_member_count", "created_at")
    return qs.first()


def _lock_open_parties_for_game(game_id: int) -> list[GameParty]:
    return list(GameParty.objects.filter(game_id=game_id, status=GameParty.Status.OPEN).order_by("id").select_for_update())


def _pick_open_party_with_capacity_locked(game_id: int) -> GameParty | None:
    """
    Choisit une party ouverte avec de la place parmi les lignes déjà verrouillées
    (`select_for_update` sur le jeu courant).
    """
    eligible: list[tuple[GameParty, int]] = []
    for party in _lock_open_parties_for_game(game_id):
        n = active_member_count(party_id=party.id)
        if n < party.max_players:
            eligible.append((party, n))
    if not eligible:
        return None
    return min(eligible, key=lambda item: (-item[1], item[0].created_at))[0]


def _create_open_party_locked(game: Game, *, max_players: int) -> GameParty:
    now = timezone.now()
    return GameParty.objects.create(
        game=game,
        status=GameParty.Status.OPEN,
        max_players=max_players,
        open_deadline_at=now + OPEN_TIMEOUT,
    )


def _ensure_active_membership(party: GameParty, user: AbstractBaseUser) -> GamePartyMember:
    """
    Garantit un membre actif avec états initiaux. Idempotent si déjà actif.
    Réactive un enregistrement existant (même user / party) si le statut n'était pas actif.
    """
    try:
        member = GamePartyMember.objects.select_for_update().get(party=party, user=user)
    except GamePartyMember.DoesNotExist:
        try:
            return GamePartyMember.objects.create(
                party=party,
                user=user,
                membership_status=GamePartyMember.MembershipStatus.ACTIVE,
                ready_state=GamePartyMember.ReadyState.PENDING,
                ready_for_chat_state=GamePartyMember.ReadyForChatState.PENDING,
            )
        except IntegrityError:
            member = GamePartyMember.objects.select_for_update().get(party=party, user=user)

    if member.membership_status == GamePartyMember.MembershipStatus.ACTIVE:
        return member

    member.membership_status = GamePartyMember.MembershipStatus.ACTIVE
    member.ready_state = GamePartyMember.ReadyState.PENDING
    member.ready_for_chat_state = GamePartyMember.ReadyForChatState.PENDING
    member.left_at = None
    member.save(
        update_fields=[
            "membership_status",
            "ready_state",
            "ready_for_chat_state",
            "left_at",
            "updated_at",
        ]
    )
    return member


def transition_open_to_waiting_ready(party: GameParty) -> GameParty:
    """
    Applique les règles de clôture de la phase `open` sur une instance déjà cohérente
    avec la transaction courante (appelant responsable du verrou si besoin).

    - Plein (`membres actifs >= max_players`) -> `waiting_ready` + `ready_deadline_at`.
    - `open_deadline_at` dépassé et >= min joueurs -> `waiting_ready` + `ready_deadline_at`.
    - `open_deadline_at` dépassé et < min joueurs -> `cancelled`.
    Ne modifie pas `ready_state` / `ready_for_chat_state`. Idempotent si déjà hors `open`.
    """
    if party.status != GameParty.Status.OPEN:
        return party

    now = timezone.now()
    n = active_member_count(party_id=party.id)
    full = n >= party.max_players
    deadline_hit = party.open_deadline_at is not None and now >= party.open_deadline_at

    if full:
        party.status = GameParty.Status.WAITING_READY
        party.ready_deadline_at = now + READY_TIMEOUT
        party.save(update_fields=["status", "ready_deadline_at", "updated_at"])
        return party

    if deadline_hit:
        if n >= MIN_PLAYERS_TO_CONTINUE:
            party.status = GameParty.Status.WAITING_READY
            party.ready_deadline_at = now + READY_TIMEOUT
            party.save(update_fields=["status", "ready_deadline_at", "updated_at"])
        else:
            party.status = GameParty.Status.CANCELLED
            party.save(update_fields=["status", "updated_at"])
        return party

    return party


@transaction.atomic
def finalize_open_phase(party_id: int) -> GameParty | None:
    """
    Recharge la party avec verrou exclusif et tente la transition depuis `open`.
    """
    try:
        party = GameParty.objects.select_for_update().get(pk=party_id)
    except GameParty.DoesNotExist:
        return None
    return transition_open_to_waiting_ready(party)


@transaction.atomic
def join_or_create_party(
    user: AbstractBaseUser,
    game: Game,
    *,
    max_players_override: int | None = None,
) -> GameParty:
    """
    Place l'utilisateur dans une party ouverte (création si aucune place disponible).

    Uniquement des parties `status=open` sont éligibles au join ; sinon création.

    Verrouille les parties `open` du jeu, choisit la plus remplie puis la plus ancienne,
    crée la ligne membre (idempotent si déjà actif), puis tente la clôture de phase `open`.

    `max_players_override` s'applique uniquement à la création d'une nouvelle party ; une party
    existante conserve son `max_players` déjà persisté.
    """
    resolved_max = resolve_party_max_players(game, max_players_override=max_players_override)

    party = _pick_open_party_with_capacity_locked(game.id)
    if party is None:
        party = _create_open_party_locked(game, max_players=resolved_max)

    _ensure_active_membership(party, user)

    party.refresh_from_db(fields=["status", "max_players", "open_deadline_at"])
    transition_open_to_waiting_ready(party)
    return party
