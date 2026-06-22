import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

const apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://localhost:4000',
);

void main() {
  runApp(const ZipzoApp());
}

class ZipzoApp extends StatelessWidget {
  const ZipzoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Zipzo',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF256F58),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7F4),
        useMaterial3: true,
      ),
      home: const CustomerHomeScreen(),
    );
  }
}

class CustomerHomeScreen extends StatefulWidget {
  const CustomerHomeScreen({super.key});

  @override
  State<CustomerHomeScreen> createState() => _CustomerHomeScreenState();
}

class _CustomerHomeScreenState extends State<CustomerHomeScreen> {
  late Future<CatalogData> _catalogFuture;
  final Map<String, CartLine> _cart = {};
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    _catalogFuture = ZipzoApi().loadCatalog();
  }

  void _refresh() {
    setState(() {
      _catalogFuture = ZipzoApi().loadCatalog();
    });
  }

  void _addToCart(Product product) {
    setState(() {
      final current = _cart[product.id];
      _cart[product.id] = CartLine(
        product: product,
        quantity: (current?.quantity ?? 0) + 1,
      );
    });
  }

  void _removeFromCart(String productId) {
    setState(() {
      final current = _cart[productId];
      if (current == null) {
        return;
      }

      if (current.quantity <= 1) {
        _cart.remove(productId);
      } else {
        _cart[productId] = CartLine(
          product: current.product,
          quantity: current.quantity - 1,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final cartTotal = _cart.values.fold<double>(
      0,
      (sum, item) => sum + item.product.price * item.quantity,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Zipzo'),
        actions: [
          IconButton(
            tooltip: 'Refresh',
            onPressed: _refresh,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: FutureBuilder<CatalogData>(
        future: _catalogFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return ErrorState(
                message: snapshot.error.toString(), onRetry: _refresh);
          }

          final data = snapshot.data!;
          final pages = [
            MartView(products: data.meroMartProducts, onAdd: _addToCart),
            DokaanView(
                stores: data.dokaanStores,
                products: data.products,
                onAdd: _addToCart),
            CartView(lines: _cart.values.toList(), onRemove: _removeFromCart),
          ];

          return pages[_selectedIndex];
        },
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.shopping_basket_outlined),
            selectedIcon: Icon(Icons.shopping_basket),
            label: 'MeroMart',
          ),
          const NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'MeroDokaan',
          ),
          NavigationDestination(
            icon: Badge(
              label: Text('${_cart.length}'),
              isLabelVisible: _cart.isNotEmpty,
              child: const Icon(Icons.shopping_cart_outlined),
            ),
            selectedIcon: Badge(
              label: Text('${_cart.length}'),
              isLabelVisible: _cart.isNotEmpty,
              child: const Icon(Icons.shopping_cart),
            ),
            label: 'Cart',
          ),
        ],
      ),
      bottomSheet: _cart.isEmpty
          ? null
          : SafeArea(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  border: Border(
                    top: BorderSide(color: Colors.black.withOpacity(0.08)),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${_cart.length} item${_cart.length == 1 ? '' : 's'} in cart',
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                    Text(
                      'Rs. ${cartTotal.toStringAsFixed(0)}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class MartView extends StatelessWidget {
  const MartView({
    super.key,
    required this.products,
    required this.onAdd,
  });

  final List<Product> products;
  final ValueChanged<Product> onAdd;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
      children: [
        const SectionHeader(
          title: 'MeroMart Fresh',
          subtitle: 'Company-stocked essentials for controlled quality.',
        ),
        const SizedBox(height: 12),
        ...products
            .map((product) => ProductTile(product: product, onAdd: onAdd)),
      ],
    );
  }
}

class DokaanView extends StatelessWidget {
  const DokaanView({
    super.key,
    required this.stores,
    required this.products,
    required this.onAdd,
  });

  final List<Store> stores;
  final List<Product> products;
  final ValueChanged<Product> onAdd;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 90),
      children: [
        const SectionHeader(
          title: 'Nearby MeroDokaan',
          subtitle: 'Buy from verified local shops around your area.',
        ),
        const SizedBox(height: 12),
        ...stores.map((store) {
          final storeProducts =
              products.where((product) => product.storeId == store.id).toList();
          return StorePanel(
              store: store, products: storeProducts, onAdd: onAdd);
        }),
      ],
    );
  }
}

class CartView extends StatelessWidget {
  const CartView({
    super.key,
    required this.lines,
    required this.onRemove,
  });

  final List<CartLine> lines;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    final subtotal = lines.fold<double>(
      0,
      (sum, line) => sum + line.product.price * line.quantity,
    );
    final deliveryFee = subtotal >= 1500 || subtotal == 0 ? 0.0 : 100.0;

    if (lines.isEmpty) {
      return const EmptyState(
        icon: Icons.shopping_cart_outlined,
        title: 'Your cart is empty',
        subtitle: 'Add meat, drinks, vegetables, or grocery items to begin.',
      );
    }

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 120),
      children: [
        const SectionHeader(
          title: 'Cart',
          subtitle: 'MVP checkout preview. Order placement comes next.',
        ),
        const SizedBox(height: 12),
        ...lines.map((line) => CartLineTile(line: line, onRemove: onRemove)),
        const SizedBox(height: 12),
        SummaryCard(subtotal: subtotal, deliveryFee: deliveryFee),
      ],
    );
  }
}

class ProductTile extends StatelessWidget {
  const ProductTile({
    super.key,
    required this.product,
    required this.onAdd,
  });

  final Product product;
  final ValueChanged<Product> onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.black.withOpacity(0.08)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.fromLTRB(14, 10, 10, 10),
        leading: CircleAvatar(
          backgroundColor: const Color(0xFFE4F5EB),
          foregroundColor: const Color(0xFF256F58),
          child: Icon(iconForCategory(product.category)),
        ),
        title: Text(product.name,
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(
            '${product.category} • ${product.stockQuantity.toStringAsFixed(0)} ${product.unit} left'),
        trailing: FilledButton.icon(
          onPressed: product.stockQuantity > 0 ? () => onAdd(product) : null,
          icon: const Icon(Icons.add, size: 18),
          label: Text('Rs. ${product.price.toStringAsFixed(0)}'),
        ),
      ),
    );
  }
}

class StorePanel extends StatelessWidget {
  const StorePanel({
    super.key,
    required this.store,
    required this.products,
    required this.onAdd,
  });

  final Store store;
  final List<Product> products;
  final ValueChanged<Product> onAdd;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 14),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.black.withOpacity(0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.verified, color: Color(0xFF256F58), size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    store.name,
                    style: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(store.addressLine,
                style: TextStyle(color: Colors.grey.shade700)),
            const SizedBox(height: 12),
            if (products.isEmpty)
              Text('No active products yet.',
                  style: TextStyle(color: Colors.grey.shade700))
            else
              ...products.map(
                  (product) => ProductTile(product: product, onAdd: onAdd)),
          ],
        ),
      ),
    );
  }
}

class CartLineTile extends StatelessWidget {
  const CartLineTile({
    super.key,
    required this.line,
    required this.onRemove,
  });

  final CartLine line;
  final ValueChanged<String> onRemove;

  @override
  Widget build(BuildContext context) {
    final lineTotal = line.product.price * line.quantity;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.black.withOpacity(0.08)),
      ),
      child: ListTile(
        title: Text(line.product.name,
            style: const TextStyle(fontWeight: FontWeight.w700)),
        subtitle: Text(
            '${line.quantity} x Rs. ${line.product.price.toStringAsFixed(0)}'),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Rs. ${lineTotal.toStringAsFixed(0)}',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            IconButton(
              tooltip: 'Remove one',
              onPressed: () => onRemove(line.product.id),
              icon: const Icon(Icons.remove_circle_outline),
            ),
          ],
        ),
      ),
    );
  }
}

class SummaryCard extends StatelessWidget {
  const SummaryCard({
    super.key,
    required this.subtotal,
    required this.deliveryFee,
  });

  final double subtotal;
  final double deliveryFee;

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: Colors.black.withOpacity(0.08)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            SummaryRow(label: 'Subtotal', value: subtotal),
            const SizedBox(height: 8),
            SummaryRow(label: 'Delivery', value: deliveryFee),
            const Divider(height: 24),
            SummaryRow(
                label: 'Total', value: subtotal + deliveryFee, strong: true),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: null,
                icon: const Icon(Icons.lock_outline),
                label: const Text('Checkout coming next'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class SummaryRow extends StatelessWidget {
  const SummaryRow({
    super.key,
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final double value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final style = strong
        ? const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)
        : const TextStyle(fontWeight: FontWeight.w600);

    return Row(
      children: [
        Expanded(child: Text(label, style: style)),
        Text('Rs. ${value.toStringAsFixed(0)}', style: style),
      ],
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title,
            style: Theme.of(context)
                .textTheme
                .headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text(subtitle, style: TextStyle(color: Colors.grey.shade700)),
      ],
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 42, color: const Color(0xFF256F58)),
            const SizedBox(height: 14),
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade700)),
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.message,
    required this.onRetry,
  });

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off, size: 42, color: Color(0xFF8A2F20)),
            const SizedBox(height: 14),
            const Text('Could not load Zipzo',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class ZipzoApi {
  Future<CatalogData> loadCatalog() async {
    final storeResponse =
        await http.get(Uri.parse('$apiBaseUrl/api/v1/stores'));
    final productResponse =
        await http.get(Uri.parse('$apiBaseUrl/api/v1/products'));

    if (storeResponse.statusCode >= 400 || productResponse.statusCode >= 400) {
      throw Exception('API request failed. Make sure the backend is running.');
    }

    final storesJson = jsonDecode(storeResponse.body) as Map<String, dynamic>;
    final productsJson =
        jsonDecode(productResponse.body) as Map<String, dynamic>;
    final stores = (storesJson['data'] as List<dynamic>)
        .map((item) => Store.fromJson(item))
        .toList();
    final products = (productsJson['data'] as List<dynamic>)
        .map((item) => Product.fromJson(item))
        .toList();
    final companyStoreIds = stores
        .where((store) => store.type == 'company')
        .map((store) => store.id)
        .toSet();

    return CatalogData(
      stores: stores,
      products: products,
      meroMartProducts: products
          .where((product) => companyStoreIds.contains(product.storeId))
          .toList(),
      dokaanStores: stores
          .where((store) => store.type == 'shop' && store.status == 'approved')
          .toList(),
    );
  }
}

class CatalogData {
  const CatalogData({
    required this.stores,
    required this.products,
    required this.meroMartProducts,
    required this.dokaanStores,
  });

  final List<Store> stores;
  final List<Product> products;
  final List<Product> meroMartProducts;
  final List<Store> dokaanStores;
}

class Store {
  const Store({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.addressLine,
  });

  factory Store.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    return Store(
      id: map['id'] as String,
      name: map['name'] as String,
      type: map['type'] as String,
      status: map['status'] as String,
      addressLine: map['addressLine'] as String,
    );
  }

  final String id;
  final String name;
  final String type;
  final String status;
  final String addressLine;
}

class Product {
  const Product({
    required this.id,
    required this.storeId,
    required this.name,
    required this.category,
    required this.unit,
    required this.price,
    required this.stockQuantity,
  });

  factory Product.fromJson(dynamic json) {
    final map = json as Map<String, dynamic>;
    return Product(
      id: map['id'] as String,
      storeId: map['storeId'] as String,
      name: map['name'] as String,
      category: map['category'] as String,
      unit: map['unit'] as String,
      price: (map['price'] as num).toDouble(),
      stockQuantity: (map['stockQuantity'] as num).toDouble(),
    );
  }

  final String id;
  final String storeId;
  final String name;
  final String category;
  final String unit;
  final double price;
  final double stockQuantity;
}

class CartLine {
  const CartLine({
    required this.product,
    required this.quantity,
  });

  final Product product;
  final int quantity;
}

IconData iconForCategory(String category) {
  final normalized = category.toLowerCase();
  if (normalized.contains('meat')) {
    return Icons.restaurant;
  }
  if (normalized.contains('drink')) {
    return Icons.local_drink;
  }
  if (normalized.contains('vegetable') || normalized.contains('fruit')) {
    return Icons.eco;
  }
  return Icons.shopping_bag;
}
