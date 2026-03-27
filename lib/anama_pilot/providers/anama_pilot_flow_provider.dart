import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

const _uuid = Uuid();

class AnamaPilotFlowState {
  const AnamaPilotFlowState({
    this.ageBand = 'teen_school',
    this.deviceId = 'child_01',
    this.sessionId,
    this.quiz = const {},
  });

  final String ageBand;
  final String deviceId;
  final String? sessionId;
  final Map<String, String> quiz;

  AnamaPilotFlowState copyWith({
    String? ageBand,
    String? deviceId,
    String? sessionId,
    Map<String, String>? quiz,
  }) {
    return AnamaPilotFlowState(
      ageBand: ageBand ?? this.ageBand,
      deviceId: deviceId ?? this.deviceId,
      sessionId: sessionId ?? this.sessionId,
      quiz: quiz ?? this.quiz,
    );
  }
}

class AnamaPilotFlowNotifier extends StateNotifier<AnamaPilotFlowState> {
  AnamaPilotFlowNotifier() : super(const AnamaPilotFlowState());

  void setAgeBand(String v) => state = state.copyWith(ageBand: v);

  void setDeviceId(String v) => state = state.copyWith(deviceId: v.trim());

  void setQuiz(Map<String, String> q) => state = state.copyWith(quiz: q);

  String ensureSessionId() {
    if (state.sessionId != null) return state.sessionId!;
    final id = _uuid.v4();
    state = state.copyWith(sessionId: id);
    return id;
  }

  void resetSession() => state = state.copyWith(sessionId: null, quiz: {});
}

final anamaPilotFlowProvider =
    StateNotifierProvider<AnamaPilotFlowNotifier, AnamaPilotFlowState>((ref) {
  return AnamaPilotFlowNotifier();
});
