import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../widgets/brain_regions_map.dart';

/// Глобальный прогресс «зажжённых» зон мозга.
/// После выполнения задания вызывайте:
/// `ref.read(brainLobeProgressProvider.notifier).activate(BrainLobe.frontal);`
final brainLobeProgressProvider =
    StateNotifierProvider<BrainLobeProgressNotifier, Set<BrainLobe>>((ref) {
  return BrainLobeProgressNotifier();
});

class BrainLobeProgressNotifier extends StateNotifier<Set<BrainLobe>> {
  BrainLobeProgressNotifier() : super(<BrainLobe>{});

  void activate(BrainLobe lobe) {
    state = {...state, lobe};
  }

  void deactivate(BrainLobe lobe) {
    state = {...state}..remove(lobe);
  }

  void clear() {
    state = {};
  }

  void setAll(Set<BrainLobe> lobes) {
    state = Set<BrainLobe>.from(lobes);
  }
}
