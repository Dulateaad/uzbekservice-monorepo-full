import '../models/business_hub/organization.dart';
import '../models/firestore_models.dart';

/// Размещение вакансий: компания, специалист или владелец организации Business Hub (часто userType остаётся client).
bool userCanPostVacancy(FirestoreUser user, BHOrganization? bhOrganization) {
  if (user.userType == 'company' || user.userType == 'specialist') {
    return true;
  }
  if (bhOrganization != null && bhOrganization.ownerId == user.id) {
    return true;
  }
  return false;
}
