export type Locale = 'en' | 'es' | 'fr';

export const locales: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
};

type TranslationKey =
  | 'appTitle'
  | 'appSubtitle'
  | 'connectWallet'
  | 'disconnect'
  | 'searchPlaceholder'
  | 'allStates'
  | 'total'
  | 'active'
  | 'passed'
  | 'rejected'
  | 'executed'
  | 'cancelled'
  | 'noProposals'
  | 'walletDisconnected'
  | 'disconnectMsg'
  | 'reconnect'
  | 'dismiss'
  | 'filterByState'
  | 'checkingVote'
  | 'notVoted'
  | 'votedAs';

type Translations = Record<TranslationKey, string>;

const translations: Record<Locale, Translations> = {
  en: {
    appTitle: '🌌 CosmosVote',
    appSubtitle: 'On-chain governance',
    connectWallet: 'Connect Wallet',
    disconnect: 'Disconnect',
    searchPlaceholder: 'Search proposals...',
    allStates: 'All States',
    total: 'Total',
    active: 'Active',
    passed: 'Passed',
    rejected: 'Rejected',
    executed: 'Executed',
    cancelled: 'Cancelled',
    noProposals: 'No proposals found.',
    walletDisconnected: '⚠️ Wallet Disconnected',
    disconnectMsg: 'Your wallet was disconnected. Any pending transaction has been cancelled.',
    reconnect: 'Reconnect',
    dismiss: 'Dismiss',
    filterByState: 'Filter by state',
    checkingVote: 'Checking vote status...',
    notVoted: 'You have not voted on this proposal',
    votedAs: 'You voted {vote} with weight {weight}',
  },
  es: {
    appTitle: '🌌 CosmosVote',
    appSubtitle: 'Gobernanza en cadena',
    connectWallet: 'Conectar billetera',
    disconnect: 'Desconectar',
    searchPlaceholder: 'Buscar propuestas...',
    allStates: 'Todos los estados',
    total: 'Total',
    active: 'Activo',
    passed: 'Aprobado',
    rejected: 'Rechazado',
    executed: 'Ejecutado',
    cancelled: 'Cancelado',
    noProposals: 'No se encontraron propuestas.',
    walletDisconnected: '⚠️ Billetera desconectada',
    disconnectMsg: 'Tu billetera fue desconectada. Cualquier transacción pendiente ha sido cancelada.',
    reconnect: 'Reconectar',
    dismiss: 'Descartar',
    filterByState: 'Filtrar por estado',
    checkingVote: 'Verificando estado del voto...',
    notVoted: 'No has votado en esta propuesta',
    votedAs: 'Votaste {vote} con peso {weight}',
  },
  fr: {
    appTitle: '🌌 CosmosVote',
    appSubtitle: 'Gouvernance on-chain',
    connectWallet: 'Connecter le portefeuille',
    disconnect: 'Déconnecter',
    searchPlaceholder: 'Rechercher des propositions...',
    allStates: 'Tous les états',
    total: 'Total',
    active: 'Actif',
    passed: 'Adopté',
    rejected: 'Rejeté',
    executed: 'Exécuté',
    cancelled: 'Annulé',
    noProposals: 'Aucune proposition trouvée.',
    walletDisconnected: '⚠️ Portefeuille déconnecté',
    disconnectMsg: 'Votre portefeuille a été déconnecté. Toute transaction en attente a été annulée.',
    reconnect: 'Reconnecter',
    dismiss: 'Ignorer',
    filterByState: 'Filtrer par état',
    checkingVote: 'Vérification du statut du vote...',
    notVoted: "Vous n'avez pas voté sur cette proposition",
    votedAs: 'Vous avez voté {vote} avec un poids de {weight}',
  },
};

export function t(locale: Locale, key: TranslationKey, vars?: Record<string, string>): string {
  let str = translations[locale]?.[key] ?? translations.en[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
  }
  return str;
}

export type { TranslationKey };
