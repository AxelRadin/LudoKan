import type { DriveStep } from 'driver.js';

export const HOME_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="search"]',
    popover: {
      title: '🔍 Explore le catalogue',
      description:
        'Recherche parmi des milliers de jeux. Filtre par genre, plateforme ou note pour trouver ton prochain coup de cœur.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="genres"]',
    popover: {
      title: '🎮 Explorer par genre',
      description:
        'Parcours les jeux par catégorie : action, RPG, stratégie… Clique sur un genre pour découvrir tous les titres associés.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="suggestions"]',
    popover: {
      title: '✨ Suggestions personnalisées',
      description:
        "Cette section t'affiche des jeux sélectionnés selon les genres de ta bibliothèque. Plus tu ajoutes de jeux, plus les suggestions s'affinent.",
      side: 'bottom',
      align: 'start',
    },
  },
];

export const PROFILE_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="profile-edit"]',
    popover: {
      title: '✏️ Modifier ton profil',
      description:
        'Change ton avatar, ta bannière et ta description depuis ce bouton.',
      side: 'bottom',
      align: 'end',
    },
  },
  {
    element: '[data-tour="profile-stats"]',
    popover: {
      title: '📊 Tes statistiques',
      description:
        'Suis ta progression : pourcentage de jeux terminés, joués, et le total de ta collection.',
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="profile-library"]',
    popover: {
      title: '📚 Ta bibliothèque',
      description:
        "Retrouve ici tous tes jeux : en cours, terminés, en liste d'envie… Filtre et organise ta collection comme tu veux.",
      side: 'top',
      align: 'start',
    },
  },
  {
    element: '[data-tour="profile-filters"]',
    popover: {
      title: '🔎 Filtrer ta bibliothèque',
      description:
        "Trie tes jeux par statut : en cours, terminés, favoris, liste d'envie.",
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="profile-collections"]',
    popover: {
      title: '🗂️ Collections',
      description:
        'Crée des listes personnalisées pour organiser tes jeux comme tu veux.',
      side: 'bottom',
      align: 'end',
    },
  },
];

export const GAME_TOUR_STEPS: DriveStep[] = [
  {
    element: '[data-tour="matchmaking-button"]',
    popover: {
      title: '🎮 Matchmaking',
      description:
        'Lance une recherche pour trouver des joueurs qui ont ce jeu dans leur bibliothèque.',
      side: 'bottom',
      align: 'start',
    },
  },
  {
    element: '[data-tour="add-to-library"]',
    popover: {
      title: '➕ Ajouter à ta bibliothèque',
      description:
        "Ajoute ce jeu à ta collection : en cours, terminé, en liste d'envie… et suis ta progression.",
      side: 'bottom',
      align: 'start',
    },
  },
];
