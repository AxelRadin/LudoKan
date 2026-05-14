import type { DriveStep } from 'driver.js';

function createStep(
  element: string,
  title: string,
  description: string,
  side: 'top' | 'bottom' | 'left' | 'right' = 'bottom',
  align: 'start' | 'center' | 'end' = 'start'
): DriveStep {
  return {
    element,
    popover: {
      title,
      description,
      side,
      align,
    },
  };
}

export const HOME_TOUR_STEPS: DriveStep[] = [
  createStep(
    '[data-tour="search"]',
    '🔍 Explore le catalogue',
    'Recherche parmi des milliers de jeux. Filtre par genre, plateforme ou note pour trouver ton prochain coup de cœur.'
  ),
  createStep(
    '[data-tour="genres"]',
    '🎮 Explorer par genre',
    'Parcours les jeux par catégorie : action, RPG, stratégie… Clique sur un genre pour découvrir tous les titres associés.',
    'top'
  ),
  createStep(
    '[data-tour="suggestions"]',
    '✨ Suggestions personnalisées',
    "Cette section t'affiche des jeux sélectionnés selon les genres de ta bibliothèque. Plus tu ajoutes de jeux, plus les suggestions s'affinent."
  ),
];

export const PROFILE_TOUR_STEPS: DriveStep[] = [
  createStep(
    '[data-tour="profile-edit"]',
    '✏️ Modifier ton profil',
    'Change ton avatar, ta bannière et ta description depuis ce bouton.',
    'bottom',
    'end'
  ),
  createStep(
    '[data-tour="profile-stats"]',
    '📊 Tes statistiques',
    'Suis ta progression : pourcentage de jeux terminés, joués, et le total de ta collection.',
    'top'
  ),
  createStep(
    '[data-tour="profile-library"]',
    '📚 Ta bibliothèque',
    "Retrouve ici tous tes jeux : en cours, terminés, en liste d'envie… Filtre et organise ta collection comme tu veux.",
    'top'
  ),
  createStep(
    '[data-tour="profile-filters"]',
    '🔎 Filtrer ta bibliothèque',
    "Trie tes jeux par statut : en cours, terminés, favoris, liste d'envie."
  ),
  createStep(
    '[data-tour="profile-collections"]',
    '🗂️ Collections',
    'Crée des listes personnalisées pour organiser tes jeux comme tu veux.',
    'bottom',
    'end'
  ),
];

export const FRIENDS_TOUR_STEPS: DriveStep[] = [
  createStep(
    '[data-tour="friends-add"]',
    '🤝 Ajouter un ami',
    "Recherche un joueur par pseudo et envoie-lui une demande d'ami pour suivre sa bibliothèque."
  ),
  createStep(
    '[data-tour="friends-tabs"]',
    '📑 Navigation',
    "Retrouve ici ta liste d'amis, les demandes reçues et envoyées, et les utilisateurs que tu as bloqués.",
    'bottom'
  ),
  createStep(
    '[data-tour="friends-list"]',
    '👥 Tes amis',
    'Clique sur un ami pour voir son profil et sa bibliothèque de jeux.',
    'top'
  ),
];

export const GAME_TOUR_STEPS: DriveStep[] = [
  createStep(
    '[data-tour="matchmaking-button"]',
    '🎮 Matchmaking',
    'Lance une recherche pour trouver des joueurs qui ont ce jeu dans leur bibliothèque.'
  ),
  createStep(
    '[data-tour="add-to-library"]',
    '➕ Ajouter à ta bibliothèque',
    "Ajoute ce jeu à ta collection : en cours, terminé, en liste d'envie… et suis ta progression."
  ),
  createStep(
    '[data-tour="game-status"]',
    '🏷️ Statut & favoris',
    "Marque ce jeu comme terminé, en cours ou en liste d'envie. Tu peux aussi l'ajouter à tes favoris pour le retrouver rapidement."
  ),
  createStep(
    '[data-tour="game-gallery"]',
    '🖼️ Galerie médias',
    'Regarde les vidéos et screenshots du jeu avant de te lancer.',
    'top'
  ),
  createStep(
    '[data-tour="game-reviews"]',
    '⭐ Avis de la communauté',
    'Lis les avis des autres joueurs et laisse le tien pour partager ton expérience.',
    'top'
  ),
];
