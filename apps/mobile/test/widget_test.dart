import 'package:flutter_test/flutter_test.dart';
import 'package:zipzo_mobile/main.dart';

void main() {
  testWidgets('renders Zipzo app shell', (WidgetTester tester) async {
    await tester.pumpWidget(const ZipzoApp());

    expect(find.text('Zipzo'), findsOneWidget);
    expect(find.text('MeroMart'), findsOneWidget);
    expect(find.text('MeroDokaan'), findsOneWidget);
    expect(find.text('Cart'), findsOneWidget);
  });
}
