/// Параметры атрибуции CPA / партнёрских сетей (арбитраж, postback).
/// Имена полей согласованы с типичными макросами трекеров (Keitaro, Binom, сети).
class CpaAttribution {
  const CpaAttribution({
    this.clickId,
    this.sub1,
    this.sub2,
    this.sub3,
    this.sub4,
    this.sub5,
    this.networkId,
    this.offerId,
    this.affiliateId,
    this.utmSource,
    this.utmMedium,
    this.utmCampaign,
    this.gclid,
    this.fbclid,
    this.extra = const {},
  });

  final String? clickId;
  final String? sub1;
  final String? sub2;
  final String? sub3;
  final String? sub4;
  final String? sub5;
  final String? networkId;
  final String? offerId;
  final String? affiliateId;
  final String? utmSource;
  final String? utmMedium;
  final String? utmCampaign;
  final String? gclid;
  final String? fbclid;

  /// Прочие query-параметры, не попавшие в известные поля.
  final Map<String, String> extra;

  bool get hasConversionSignal =>
      (clickId != null && clickId!.isNotEmpty) ||
      (affiliateId != null && affiliateId!.isNotEmpty);

  Map<String, dynamic> toFirestoreMap() {
    final m = <String, dynamic>{
      if (clickId != null) 'click_id': clickId,
      if (sub1 != null) 'sub1': sub1,
      if (sub2 != null) 'sub2': sub2,
      if (sub3 != null) 'sub3': sub3,
      if (sub4 != null) 'sub4': sub4,
      if (sub5 != null) 'sub5': sub5,
      if (networkId != null) 'network_id': networkId,
      if (offerId != null) 'offer_id': offerId,
      if (affiliateId != null) 'affiliate_id': affiliateId,
      if (utmSource != null) 'utm_source': utmSource,
      if (utmMedium != null) 'utm_medium': utmMedium,
      if (utmCampaign != null) 'utm_campaign': utmCampaign,
      if (gclid != null) 'gclid': gclid,
      if (fbclid != null) 'fbclid': fbclid,
    };
    if (extra.isNotEmpty) {
      m['extra'] = extra;
    }
    return m;
  }

  static CpaAttribution? fromUriQuery(Map<String, String> q) {
    String? firstNonEmpty(List<String> keys) {
      for (final k in keys) {
        final v = q[k];
        if (v != null && v.trim().isNotEmpty) return v.trim();
      }
      return null;
    }

    final clickId = firstNonEmpty([
      'click_id',
      'clickid',
      'cid',
      'transaction_id',
      'txn_id',
    ]);
    final affiliateId = firstNonEmpty(['aff_id', 'affiliate_id', 'pub_id', 'publisher_id']);
    final networkId = firstNonEmpty(['network_id', 'nw', 'source']);
    final offerId = firstNonEmpty(['offer_id', 'offer']);

    final known = <String>{
      'click_id', 'clickid', 'cid', 'transaction_id', 'txn_id',
      'sub1', 'sub2', 'sub3', 'sub4', 'sub5',
      'aff_id', 'affiliate_id', 'pub_id', 'publisher_id',
      'network_id', 'nw', 'source', 'offer_id', 'offer',
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'gclid', 'fbclid',
    };

    final extra = <String, String>{};
    for (final e in q.entries) {
      if (!known.contains(e.key.toLowerCase())) {
        extra[e.key] = e.value;
      }
    }

    final utmSource = q['utm_source']?.trim();
    final utmMedium = q['utm_medium']?.trim();
    final utmCampaign = q['utm_campaign']?.trim();

    final hasAnything = clickId != null ||
        affiliateId != null ||
        networkId != null ||
        offerId != null ||
        utmSource != null ||
        utmMedium != null ||
        utmCampaign != null ||
        q['sub1'] != null ||
        q['gclid'] != null ||
        q['fbclid'] != null;

    if (!hasAnything) return null;

    return CpaAttribution(
      clickId: clickId,
      sub1: q['sub1']?.trim(),
      sub2: q['sub2']?.trim(),
      sub3: q['sub3']?.trim(),
      sub4: q['sub4']?.trim(),
      sub5: q['sub5']?.trim(),
      networkId: networkId,
      offerId: offerId,
      affiliateId: affiliateId,
      utmSource: utmSource,
      utmMedium: utmMedium,
      utmCampaign: utmCampaign,
      gclid: q['gclid']?.trim(),
      fbclid: q['fbclid']?.trim(),
      extra: extra,
    );
  }

  static CpaAttribution? fromJsonMap(Map<String, dynamic> raw) {
    if (raw.isEmpty) return null;
    String? s(String k) => raw[k]?.toString();

    return CpaAttribution(
      clickId: s('click_id'),
      sub1: s('sub1'),
      sub2: s('sub2'),
      sub3: s('sub3'),
      sub4: s('sub4'),
      sub5: s('sub5'),
      networkId: s('network_id'),
      offerId: s('offer_id'),
      affiliateId: s('affiliate_id'),
      utmSource: s('utm_source'),
      utmMedium: s('utm_medium'),
      utmCampaign: s('utm_campaign'),
      gclid: s('gclid'),
      fbclid: s('fbclid'),
      extra: raw['extra'] is Map
          ? Map<String, String>.from(
              (raw['extra'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())),
            )
          : const {},
    );
  }
}
