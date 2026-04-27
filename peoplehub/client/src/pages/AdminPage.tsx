import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Shield, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Loader2, FileText, Image,
  Eye, Car, Star, AlertTriangle,
} from "lucide-react";
import { useStore } from "../store/useStore";
import {
  listVerificationRequestsForAdmin,
  approveVerificationRequest,
  rejectVerificationRequest,
  getAdminUids,
  resetAllUsersCodex,
} from "../services/firebase";
import { TARIFF_NAMES, type TariffLevel } from "../utils/ocr";
import Button from "../components/common/Button";

const STATUS_MAP: Record<string, { label: string; color: string; icon: any }> = {
  pending_moderation: { label: "Ждёт модератора", color: "text-amber-600 bg-amber-50", icon: Clock },
  approved: { label: "Одобрено", color: "text-green-600 bg-green-50", icon: CheckCircle },
  rejected: { label: "Отклонено", color: "text-red-600 bg-red-50", icon: XCircle },
};

const DOC_LABELS: Record<string, string> = {
  techPassport: "Техпаспорт",
  license: "Права",
};

const PHOTO_LABELS: Record<string, string> = {
  front: "Спереди", rear: "Сзади", left: "Слева", right: "Справа",
  interiorFront: "Салон спереди", interiorRear: "Салон сзади", trunk: "Багажник",
};

const TARIFF_COLORS: Record<string, string> = {
  narodniy: "bg-green-500", econom: "bg-blue-500",
  comfort: "bg-purple-500", business: "bg-gray-900",
};

const ALL_TARIFFS: TariffLevel[] = ["narodniy", "econom", "comfort", "business"];

export default function AdminPage() {
  const navigate = useNavigate();
  const { userId } = useStore();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending_moderation" | "approved" | "rejected">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [selectedTariff, setSelectedTariff] = useState<Record<string, string>>({});
  const [resettingAll, setResettingAll] = useState(false);

  useEffect(() => { checkAdmin(); }, [userId]);
  useEffect(() => { if (isAdmin) loadRequests(); }, [isAdmin, filter]);

  async function checkAdmin() {
    if (!userId) { setIsAdmin(false); return; }
    const admins = await getAdminUids();
    setIsAdmin(admins.includes(userId));
  }

  async function loadRequests() {
    setLoading(true);
    try {
      const data = await listVerificationRequestsForAdmin(
        filter === "all" ? undefined : filter as any
      );
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    if (!userId) return;
    setActionLoading(id);
    try {
      const tariff = selectedTariff[id];
      await approveVerificationRequest(id, userId, tariff);
      await loadRequests();
    } catch (err: any) {
      alert(err?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!userId || !rejectReason.trim()) return;
    setActionLoading(id);
    try {
      await rejectVerificationRequest(id, userId, rejectReason.trim());
      setRejectingId(null);
      setRejectReason("");
      await loadRequests();
    } catch (err: any) {
      alert(err?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-center">
        <Shield className="w-16 h-16 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-800">Доступ запрещён</h2>
        <p className="text-gray-500 mt-1">Только для модераторов.</p>
        <button onClick={() => navigate("/")} className="mt-4 text-blue-600">На главную</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6 safe-area">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <Shield size={20} className="text-blue-600" />
        <h1 className="font-semibold text-gray-900">Админ-панель</h1>
        <span className="ml-auto text-xs text-gray-400">{requests.length}</span>
      </div>

      {/* Reset all users */}
      <div className="px-4 py-2">
        <button
          disabled={resettingAll}
          onClick={async () => {
            if (!confirm("Сбросить codexAccepted у ВСЕХ пользователей? Все заново пройдут регистрацию.")) return;
            setResettingAll(true);
            try {
              const count = await resetAllUsersCodex();
              alert(`Сброшено ${count} пользователей. При следующем входе они пройдут регистрацию заново.`);
            } catch (e: any) {
              alert("Ошибка: " + (e?.message || e));
            } finally {
              setResettingAll(false);
            }
          }}
          className="w-full py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
        >
          {resettingAll ? "Сброс…" : "Сбросить всех пользователей (ре-регистрация)"}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1 p-3 overflow-x-auto">
        {(["pending_moderation", "all", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === f ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f === "all" ? "Все" : STATUS_MAP[f]?.label || f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-gray-400" size={32} />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><p>Нет заявок</p></div>
      ) : (
        <div className="px-3 space-y-3">
          {requests.map((req) => {
            const st = STATUS_MAP[req.status] || STATUS_MAP.pending_moderation;
            const StIcon = st.icon;
            const isExpanded = expandedId === req.id;
            const date = req.submittedAt?.toDate?.()?.toLocaleDateString("ru-RU") || "";
            const v = req.verdict;
            const aiTariff = req.aiMaxTariff || v?.maxTariff || "narodniy";
            const aiAvailable = req.aiAvailableTariffs || v?.availableTariffs || ["narodniy"];
            const chosen = selectedTariff[req.id] || aiTariff;

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${st.color}`}>
                    <StIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{req.driverName || req.driverId}</p>
                    <p className="text-xs text-gray-400">{date}</p>
                  </div>
                  {/* AI tariff badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full text-white font-bold ${TARIFF_COLORS[aiTariff] || "bg-gray-400"}`}>
                    {TARIFF_NAMES[aiTariff as TariffLevel] || aiTariff}
                  </span>
                  {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-50">
                    {/* AI Verdict summary */}
                    {v && (
                      <div className="bg-blue-50 rounded-xl p-3 mt-3 mb-3">
                        <h4 className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1">
                          <Star size={14} /> ИИ ВЕРДИКТ
                        </h4>
                        {v.carBrand && (
                          <p className="text-xs text-blue-800 flex items-center gap-1 mb-1">
                            <Car size={12} /> {v.carBrand} {v.carModel} {v.carYear ? `(${v.carYear})` : ""}
                          </p>
                        )}
                        <div className="flex gap-1.5 flex-wrap mb-2">
                          {ALL_TARIFFS.map((t) => (
                            <span
                              key={t}
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                aiAvailable.includes(t)
                                  ? `${TARIFF_COLORS[t]} text-white`
                                  : "bg-gray-200 text-gray-400 line-through"
                              }`}
                            >
                              {TARIFF_NAMES[t]}
                            </span>
                          ))}
                        </div>
                        {/* Checklist */}
                        {v.checklist?.length > 0 && (
                          <div className="space-y-1">
                            {v.checklist.map((c: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 text-[10px]">
                                {c.passed
                                  ? <CheckCircle size={12} className="text-green-500 shrink-0" />
                                  : <XCircle size={12} className="text-red-400 shrink-0" />
                                }
                                <span className="text-gray-700">{c.label}</span>
                                <span className="ml-auto text-gray-400">{c.detail}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents */}
                    <h3 className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-2">
                      <FileText size={14} /> Документы
                    </h3>
                    <div className="space-y-2 mb-3">
                      {req.documents && Object.entries(req.documents).map(([key, val]: any) => (
                        <div key={key} className="bg-gray-50 rounded-xl p-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">{DOC_LABELS[key] || key}</span>
                            <button onClick={() => setImageModal(val.url)} className="text-blue-500 text-xs flex items-center gap-1">
                              <Eye size={12} /> Открыть
                            </button>
                          </div>
                          {val.entities?.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {val.entities.filter((e: any) => e.confidence > 0.5).slice(0, 5).map((e: any, i: number) => (
                                <div key={i} className="flex items-center gap-1 text-[10px]">
                                  <span className="bg-blue-100 text-blue-700 px-1 rounded">{e.type}</span>
                                  <span className="text-gray-700 truncate">{e.mentionText}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {val.extractedText && (
                            <details className="mt-1">
                              <summary className="text-[10px] text-gray-400 cursor-pointer">Текст</summary>
                              <p className="text-[10px] text-gray-500 whitespace-pre-wrap mt-1 max-h-20 overflow-y-auto">{val.extractedText}</p>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Photos */}
                    <h3 className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-2">
                      <Image size={14} /> Фото авто
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {req.vehiclePhotos && Object.entries(req.vehiclePhotos).map(([key, val]: any) => (
                        <div key={key} className="relative">
                          <img
                            src={val.url} alt={PHOTO_LABELS[key]}
                            className="w-full aspect-square object-cover rounded-lg cursor-pointer"
                            onClick={() => setImageModal(val.url)}
                          />
                          <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] px-1 rounded">
                            {PHOTO_LABELS[key]}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Rejection reason */}
                    {req.status === "rejected" && req.rejectionReason && (
                      <div className="bg-red-50 rounded-xl p-2 mb-3">
                        <p className="text-xs text-red-700"><strong>Причина:</strong> {req.rejectionReason}</p>
                      </div>
                    )}

                    {/* Approved info */}
                    {req.status === "approved" && req.moderatorTariff && (
                      <div className="bg-green-50 rounded-xl p-3 mb-3 text-center">
                        <p className="text-xs text-green-700">Подтверждённый тариф:</p>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-white text-sm font-bold ${TARIFF_COLORS[req.moderatorTariff] || "bg-gray-500"}`}>
                          {TARIFF_NAMES[req.moderatorTariff as TariffLevel] || req.moderatorTariff}
                        </span>
                      </div>
                    )}

                    {/* Actions for pending */}
                    {req.status === "pending_moderation" && (
                      <div className="mt-3 space-y-3">
                        {/* Tariff selector */}
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-2">Подтвердите тариф:</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {ALL_TARIFFS.map((t) => {
                              const aiAllows = aiAvailable.includes(t);
                              return (
                                <button
                                  key={t}
                                  onClick={() => setSelectedTariff((p) => ({ ...p, [req.id]: t }))}
                                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                                    chosen === t
                                      ? `${TARIFF_COLORS[t]} text-white ring-2 ring-offset-1 ring-blue-300`
                                      : aiAllows
                                        ? "bg-gray-200 text-gray-700"
                                        : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  {TARIFF_NAMES[t]}
                                </button>
                              );
                            })}
                          </div>
                          {!aiAvailable.includes(chosen) && (
                            <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1">
                              <AlertTriangle size={10} /> ИИ не рекомендует этот тариф
                            </p>
                          )}
                        </div>

                        <Button
                          fullWidth size="lg"
                          loading={actionLoading === req.id}
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <CheckCircle size={18} className="mr-2" />
                          Подтвердить — {TARIFF_NAMES[chosen as TariffLevel] || chosen}
                        </Button>

                        {rejectingId === req.id ? (
                          <div className="space-y-2">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Причина отклонения..."
                              className="w-full bg-gray-50 rounded-xl px-3 py-2 text-sm outline-none border border-gray-200 resize-none h-16"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(""); }}
                                className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium"
                              >
                                Отмена
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                disabled={!rejectReason.trim() || actionLoading === req.id}
                                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium disabled:opacity-50"
                              >
                                {actionLoading === req.id ? "..." : "Отклонить"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRejectingId(req.id)}
                            className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <XCircle size={18} /> Отклонить
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Image modal */}
      {imageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setImageModal(null)}>
          <img src={imageModal} alt="Doc" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
          <button className="absolute top-6 right-6 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white" onClick={() => setImageModal(null)}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
