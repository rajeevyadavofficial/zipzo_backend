# Zipzo Mobile

Flutter customer app for Zipzo.

Current MVP screens:

- Browse MeroMart products.
- Discover verified MeroDokaan shops.
- Add products to a local cart.
- Preview cart totals and delivery fee.

## Run

For web development against the local API:

```bash
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:4000
```

For Android emulator development, use Android's host bridge:

```bash
flutter run -d emulator --dart-define=API_BASE_URL=http://10.0.2.2:4000
```
