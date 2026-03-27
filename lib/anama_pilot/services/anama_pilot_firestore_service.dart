import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';

class AnamaPilotFirestoreService {
  AnamaPilotFirestoreService({
    FirebaseFirestore? firestore,
    FirebaseAuth? auth,
  })  : _fs = firestore ?? FirebaseFirestore.instance,
        _auth = auth ?? FirebaseAuth.instance;

  final FirebaseFirestore _fs;
  final FirebaseAuth _auth;

  CollectionReference<Map<String, dynamic>> get _sessions =>
      _fs.collection('anama_pilot_sessions');

  Future<void> createSession({
    required String sessionId,
    required String ageBand,
    required String deviceId,
    required Map<String, dynamic> quiz,
    String? pilotLabel,
  }) async {
    final user = _auth.currentUser;
    if (user == null) {
      throw StateError('Нужна анонимная авторизация');
    }
    // На web первый запрос в Firestore иногда уходит до прикрепления JWT.
    await user.getIdToken();
    final data = <String, dynamic>{
      'anonUid': user.uid,
      'ageBand': ageBand,
      'deviceId': deviceId,
      'quiz': quiz,
      'createdAt': FieldValue.serverTimestamp(),
    };
    final label = pilotLabel?.trim();
    if (label != null && label.isNotEmpty) {
      data['pilotLabel'] = label.length > 48 ? label.substring(0, 48) : label;
    }
    await _sessions.doc(sessionId).set(data);
  }

  Stream<DocumentSnapshot<Map<String, dynamic>>> sessionStream(String sessionId) {
    return _sessions.doc(sessionId).snapshots();
  }
}
