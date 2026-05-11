import type { DriveStep } from 'driver.js';

export const TOUR_STEPS: DriveStep[] = [
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
    scrollIntoViewOptions: { behavior: 'smooth', block: 'center' },
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
  {
    element: '[data-tour="profile"]',
    popover: {
      title: '📚 Ta bibliothèque',
      description:
        'Accède à ton profil pour gérer ta collection : jeux en cours, terminés, favoris et bien plus.',
      side: 'bottom',
      align: 'end',
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
    element: '[data-tour="matchmaking"]',
    popover: {
      title: '🎮 Matchmaking',
      description:
        'Lance une recherche de matchmaking depuis une fiche de jeu pour trouver des joueurs qui ont les mêmes jeux que toi.',
      side: 'bottom',
      align: 'end',
    },
  },
];
