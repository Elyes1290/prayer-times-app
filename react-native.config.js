module.exports = {
  dependencies: {
    // Exclure Stripe sur iOS uniquement (on utilise react-native-purchases à la place)
    '@stripe/stripe-react-native': {
      platforms: {
        ios: null, // null = exclure sur iOS
        // Android continue d'utiliser Stripe normalement
      },
    },
  },
};
