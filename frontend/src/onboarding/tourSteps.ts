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
    popover: {
      title: '📚 Ta bibliothèque',
      description:
        "Clique sur le bouton 'Mon profil' en haut à droite, puis sur 'Mon profil' dans le menu déroulant.",
    },
  },
  {
    element: '[data-tour="profile-library"]',
    popover: {
      title: '📚 Ta bibliothèque',
      description:
        'Retrouve ici tous tes jeux. Clique sur un jeu pour accéder à sa fiche.',
      side: 'top',
      align: 'start',
    },
  },
];
