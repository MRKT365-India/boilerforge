# react-native boilerplate

Production-ready React Native starter with:
- **Auth** — OTP/phone auth with Firebase
- **Navigation** — React Navigation v6 (stack + tabs)
- **Payments** — Razorpay integration (India-first)
- **Push notifications** — FCM via notifee
- **State** — Zustand
- **API** — Axios with interceptors + token refresh
- **Environment** — react-native-config (.env support)

## Stack
- React Native 0.74+
- TypeScript
- React Navigation 6
- Zustand
- Razorpay React Native SDK
- Firebase Auth + FCM
- Notifee

## Structure
```
src/
├── screens/        # Screen components
├── navigation/     # Navigation config
├── store/          # Zustand stores
├── services/       # API, auth, payments
├── components/     # Shared components
└── utils/          # Helpers
```

## Via boilerforge MCP
```
"Scaffold a react-native project in ./my-app"
```
