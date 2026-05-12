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
    element: '[data-tour="profile-library"]',
    popover: {
      title: '📚 Ta bibliothèque',
      description:
        "Retrouve ici tous tes jeux : en cours, terminés, en liste d'envie… Filtre et organise ta collection comme tu veux.",
      side: 'top',
      align: 'start',
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
