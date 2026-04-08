import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Loader2, CheckCircle, XCircle,
  Camera, Car, Shield, Star,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { useTelegram } from "../hooks/useTelegram";
import Button from "../components/common/Button";
import CameraAvatarCapture, { type CameraOverlayType } from "../components/profile/CameraAvatarCapture";
import {
  uploadVerificationFile,
  createVerificationRequest,
  getVerificationByDriver,
  processVerificationImageViaFunction,
  VERIFICATION_DOC_TYPES,
  VERIFICATION_PHOTO_KEYS,
  type VerificationDocuments,
  type VerificationVehiclePhotos,
} from "../services/firebase";
import {
  extractDocument, extractDocumentLicense, extractPhoto, runTariffChecklist, loadBusinessWhitelist,
  TARIFF_NAMES, type OcrResult, type VerificationVerdict, type TariffLevel,
} from "../utils/ocr";
import { db } from "../services/firebase";

const DOC_LABELS: Record<string, string> = {
  techPassport: "Техпаспорт",
  license: "Водительские права",
};

const PHOTO_LABELS: Record<string, string> = {
  left: "Сбоку слева",
  right: "Сбоку справа",
  rear: "Сзади",
  front: "Спереди",
  interiorFront: "Салон + сиденье",
  rearSeat: "Сиденье сзади",
  trunk: "Багажник",
  extra: "Дополнительно",
};

/** Контур камеры под ракурс авто */
const PHOTO_KEY_TO_OVERLAY: Record<string, CameraOverlayType> = {
  front: "car-front",
  rear: "car-rear",
  left: "car-side-left",
  right: "car-side-right",
  interiorFront: "car-interior",
  rearSeat: "car-seat",
  trunk: "car-trunk",
  extra: "car-extra",
};

const TARIFF_COLORS: Record<TariffLevel, string> = {
  narodniy: "bg-green-500",
  econom: "bg-blue-500",
  comfort: "bg-purple-500",
  business: "bg-gray-900",
};

type Step = "docs" | "photos" | "uploading" | "result";

export default function DriverVerificationPage() {
  const navigate = useNavigate();
  const { user, userId } = useStore();
  const { tg } = useTelegram();

  const [step, setStep] = useState<Step>("docs");
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [photoFiles, setPhotoFiles] = useState<Record<string, File | null>>({});
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [error, setError] = useState("");
  const [verdict, setVerdict] = useState<VerificationVerdict | null>(null);
  const [capturingFor, setCapturingFor] = useState<{ group: "doc" | "photo"; key: string } | null>(null);
  const captureTargetRef = useRef<{ group: "doc" | "photo"; key: string } | null>(null);
  const [docPreviewUrls, setDocPreviewUrls] = useState<Record<string, string>>({});
  const docPreviewUrlsRef = useRef<Record<string, string>>({});
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<Record<string, string>>({});
  const photoPreviewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    Object.values(docPreviewUrlsRef.current).forEach(URL.revokeObjectURL);
    const urls: Record<string, string> = {};
    VERIFICATION_DOC_TYPES.forEach((k) => {
      const file = docFiles[k];
      if (file) urls[k] = URL.createObjectURL(file);
    });
    docPreviewUrlsRef.current = urls;
    setDocPreviewUrls(urls);
    return () => {
      Object.values(docPreviewUrlsRef.current).forEach(URL.revokeObjectURL);
      docPreviewUrlsRef.current = {};
    };
  }, [docFiles.techPassport, docFiles.license]);

  useEffect(() => {
    Object.values(photoPreviewUrlsRef.current).forEach(URL.revokeObjectURL);
    const urls: Record<string, string> = {};
    VERIFICATION_PHOTO_KEYS.forEach((k) => {
      const file = photoFiles[k];
      if (file) urls[k] = URL.createObjectURL(file);
    });
    photoPreviewUrlsRef.current = urls;
    setPhotoPreviewUrls(urls);
    return () => {
      Object.values(photoPreviewUrlsRef.current).forEach(URL.revokeObjectURL);
      photoPreviewUrlsRef.current = {};
    };
  }, [
    photoFiles.left, photoFiles.right, photoFiles.rear, photoFiles.front,
    photoFiles.interiorFront, photoFiles.rearSeat, photoFiles.trunk, photoFiles.extra,
  ]);

  useEffect(() => {
    if (!userId) return;
    getVerificationByDriver(userId)
      .then((r) => setExistingRequest(r))
      .finally(() => setCheckingExisting(false));
  }, [userId]);

  const handleFile = (group: "doc" | "photo", key: string, file: File | null) => {
    if (group === "doc") setDocFiles((p) => ({ ...p, [key]: file }));
    else setPhotoFiles((p) => ({ ...p, [key]: file }));
    setError("");
  };

  function handleCaptureFromCamera(blob: Blob) {
    const target = captureTargetRef.current || capturingFor;
    if (!target) return;
    const file = new File([blob], `capture_${target.key}.jpg`, { type: "image/jpeg" });
    handleFile(target.group, target.key, file);
    captureTargetRef.current = null;
    setCapturingFor(null);
  }

  const allDocsFilled = VERIFICATION_DOC_TYPES.every((k) => docFiles[k]);
  const photoCount = VERIFICATION_PHOTO_KEYS.filter((k) => photoFiles[k]).length;

  async function handleSubmit() {
    if (!allDocsFilled || photoCount < 6 || !userId || !user) return;
    setLoading(true);
    setStep("uploading");
    setError("");

    try {
      const totalFiles =
        VERIFICATION_DOC_TYPES.filter((k) => docFiles[k]).length +
        VERIFICATION_PHOTO_KEYS.filter((k) => photoFiles[k]).length;
      let i = 0;

      // 1. Upload docs + run Document AI
      const documents: VerificationDocuments = {};
      const docOcrResults: Record<string, OcrResult> = {};

      for (const key of VERIFICATION_DOC_TYPES) {
        const file = docFiles[key];
        if (!file) continue;
        i++;
        setProgressText(`[${i}/${totalFiles}] ${DOC_LABELS[key]} — загрузка и ИИ анализ...`);
        const url = await uploadVerificationFile(userId, `doc_${key}`, file);
        const fromFn = await processVerificationImageViaFunction(file, key as "techPassport" | "license");
        const ocr: OcrResult = fromFn ?? (key === "license" ? await extractDocumentLicense(file) : await extractDocument(file));
        docOcrResults[key] = ocr;
        (documents as any)[key] = {
          url,
          extractedText: ocr.text.slice(0, 5000),
          entities: ocr.entities.slice(0, 50),
        };
      }

      // 2. Upload photos + run Vision AI labels
      const vehiclePhotos: VerificationVehiclePhotos = {};
      const photoOcrResults: Record<string, OcrResult> = {};

      for (const key of VERIFICATION_PHOTO_KEYS) {
        const file = photoFiles[key];
        if (!file) continue;
        i++;
        setProgressText(`[${i}/${totalFiles}] Фото: ${PHOTO_LABELS[key]}...`);
        const url = await uploadVerificationFile(userId, `photo_${key}`, file);
        let ocr: OcrResult = (await processVerificationImageViaFunction(file, "photo")) ?? await extractPhoto(file);
        photoOcrResults[key] = ocr;
        (vehiclePhotos as any)[key] = {
          url,
          extractedText: ocr.text.slice(0, 2000),
          entities: ocr.entities.slice(0, 20),
          labels: ocr.labels.slice(0, 30),
        };
      }

      // 3. Load business whitelist from Firestore + run tariff checklist
      setProgressText("ИИ определяет тариф...");
      const whitelist = await loadBusinessWhitelist(db);
      const v = runTariffChecklist(docOcrResults, photoOcrResults, whitelist);
      setVerdict(v);

      // 4. Save to Firestore
      setProgressText("Сохранение заявки...");
      const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Водитель";
      await createVerificationRequest(userId, name, {
        documents,
        vehiclePhotos,
        verdict: v,
      });

      tg?.HapticFeedback?.notificationOccurred(v.approved ? "success" : "warning");
      setStep("result");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("DOC_AI_AUTH") || msg.includes("VISION_AUTH") || msg.includes("401") || msg.includes("403")) {
        setError(
          "Ошибка доступа к Google Cloud (401/403). Для разработчика: в Google Cloud Console включите Document AI API и Cloud Vision API, " +
          "убедитесь, что VITE_GCP_PROJECT_ID — это ID проекта (например taxi-eb8b7), а не номер. В ограничениях ключа добавьте домен приложения или отключите ограничения."
        );
      } else {
        setError(msg || "Ошибка отправки");
      }
      setStep("photos");
    } finally {
      setLoading(false);
      setProgressText("");
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (checkingExisting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (user?.role !== "DRIVER") {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <p className="text-gray-500">Верификация доступна только водителям.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600">Назад</button>
      </div>
    );
  }

  // ─── Existing request ─────────────────────────────────────────────────────

  if (existingRequest && step !== "result") {
    const s = existingRequest.status;
    const aiTariff = existingRequest.aiMaxTariff || existingRequest.verdict?.maxTariff;
    const finalTariff = existingRequest.moderatorTariff || aiTariff;

    return (
      <div className="min-h-screen bg-gray-50 p-6 safe-area">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 mb-6">
          <ArrowLeft size={20} /> Назад
        </button>

        {s === "approved" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-800">Верификация пройдена</h2>
            {finalTariff && (
              <div className="mt-3">
                <span className="text-sm text-green-700">Максимальный тариф:</span>
                <div className={`inline-block ml-2 px-3 py-1 rounded-full text-white text-sm font-bold ${TARIFF_COLORS[finalTariff as TariffLevel] || "bg-gray-500"}`}>
                  {TARIFF_NAMES[finalTariff as TariffLevel] || finalTariff}
                </div>
              </div>
            )}
          </div>
        )}

        {s === "pending_moderation" && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <Loader2 className="w-16 h-16 text-amber-500 mx-auto mb-3 animate-spin" />
            <h2 className="text-xl font-bold text-amber-800">Обработка</h2>
            <p className="text-amber-700 mt-1 text-sm">
              Тариф: <strong>{TARIFF_NAMES[aiTariff as TariffLevel] || "Народный"}</strong>
            </p>
          </div>
        )}

        {s === "rejected" && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-red-800">Заявка отклонена</h2>
            {existingRequest.rejectionReason && (
              <p className="text-red-700 mt-2 text-sm">{existingRequest.rejectionReason}</p>
            )}
            <Button className="mt-4" fullWidth onClick={() => setExistingRequest(null)}>
              Отправить заново
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── Result screen (after AI analysis) ────────────────────────────────────

  if (step === "result" && verdict) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 safe-area">
        <div className="text-center mb-6">
          {verdict.approved ? (
            <>
              <div className={`w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center ${TARIFF_COLORS[verdict.maxTariff]}`}>
                <Star size={36} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Тариф: {TARIFF_NAMES[verdict.maxTariff]}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Верификация пройдена автоматически!
              </p>
            </>
          ) : (
            <>
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-red-800">Документы не прошли проверку</h2>
              <p className="text-sm text-red-600 mt-1">Проверьте качество фото и попробуйте снова.</p>
            </>
          )}
        </div>

        {/* Available tariffs */}
        {verdict.availableTariffs.length > 0 && (
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2">ДОСТУПНЫЕ ТАРИФЫ</h3>
            <div className="flex gap-2 flex-wrap">
              {(["narodniy", "econom", "comfort", "business"] as TariffLevel[]).map((t) => {
                const available = verdict.availableTariffs.includes(t);
                return (
                  <div
                    key={t}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      available
                        ? `${TARIFF_COLORS[t]} text-white`
                        : "bg-gray-100 text-gray-400 line-through"
                    }`}
                  >
                    {TARIFF_NAMES[t]}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Car info */}
        {(verdict.carYear || verdict.carBrand) && (
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
              <Car size={14} /> АВТОМОБИЛЬ
            </h3>
            <p className="text-sm text-gray-800">
              {verdict.carBrand} {verdict.carModel} {verdict.carYear ? `(${verdict.carYear} г.)` : ""}
            </p>
          </div>
        )}

        {/* Checklist */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
          <h3 className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1">
            <Shield size={14} /> ЧЕК-ЛИСТ
          </h3>
          <div className="space-y-2">
            {verdict.checklist.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.passed ? (
                  <CheckCircle size={16} className="text-green-500 shrink-0" />
                ) : (
                  <XCircle size={16} className="text-red-400 shrink-0" />
                )}
                <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                <span className={`text-xs ${item.passed ? "text-green-600" : "text-red-500"}`}>
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Button fullWidth size="lg" onClick={() => navigate("/hub")}>
          На главную
        </Button>
      </div>
    );
  }

  // ─── Upload form ──────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex flex-col bg-gray-50 safe-area overflow-hidden">
      {capturingFor && (
        <CameraAvatarCapture
          facingMode="environment"
          title={capturingFor.group === "doc" ? `Сфотографируйте: ${DOC_LABELS[capturingFor.key]}` : `Фото авто: ${PHOTO_LABELS[capturingFor.key]}`}
          overlay={capturingFor.group === "doc" ? "document" : (PHOTO_KEY_TO_OVERLAY[capturingFor.key] ?? null)}
          onCapture={handleCaptureFromCamera}
          onCancel={() => { captureTargetRef.current = null; setCapturingFor(null); }}
        />
      )}
      <div className="shrink-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="font-semibold text-gray-900">Верификация авто</h1>
      </div>

      {/* Step indicator */}
      <div className="shrink-0 flex items-center justify-center gap-3 py-4 bg-gray-50">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${step === "docs" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-600"}`}>
          1. Документы
        </span>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${step === "photos" ? "bg-blue-500 text-white" : step === "uploading" ? "bg-blue-200 text-blue-700" : "bg-gray-200 text-gray-600"}`}>
          2. Фото авто
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-auto pb-6">
      {step === "uploading" && (
        <div className="p-6 text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
          <p className="text-gray-700 font-medium text-sm">{progressText || "Загрузка..."}</p>
          <p className="text-xs text-gray-400 mt-2">ИИ анализирует документы и фото</p>
        </div>
      )}

      {step === "docs" && (
        <div className="p-4 space-y-3">
          {/* Заголовок с прогрессом документов */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Документы
            </h3>
            <span className={`text-xs font-bold ${
              allDocsFilled ? "text-green-600" : "text-amber-600"
            }`}>
              {VERIFICATION_DOC_TYPES.filter((k) => docFiles[k]).length} / {VERIFICATION_DOC_TYPES.length}
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Загрузите чёткие фото документов (съёмка с камеры). Техпаспорт — 1 фото, водительские права — 1 фото.
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {VERIFICATION_DOC_TYPES.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => { const t = { group: "doc" as const, key }; captureTargetRef.current = t; setCapturingFor(t); }}
              className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 active:bg-gray-50 text-left"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${docFiles[key] ? "bg-green-500" : "bg-red-400"}`}>
                {docFiles[key] ? <CheckCircle size={18} className="text-white" strokeWidth={2.5} /> : <XCircle size={18} className="text-white" strokeWidth={2.5} />}
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                {docPreviewUrls[key] ? (
                  <img src={docPreviewUrls[key]} alt="" className="w-12 h-16 rounded-lg object-cover shrink-0 border border-gray-200" />
                ) : (
                  <div className="w-12 h-16 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                    <Camera size={20} className="text-gray-400" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-800">{DOC_LABELS[key]}</span>
              </div>
              <span className={`text-xs font-medium shrink-0 ${docFiles[key] ? "text-green-600" : "text-red-500"}`}>
                {docFiles[key] ? "1/1" : "0/1"}
              </span>
            </button>
          ))}
          </div>
          <div className="pt-3">
            <Button fullWidth size="lg" disabled={!allDocsFilled} onClick={() => setStep("photos")}>
              Далее — фото авто ({allDocsFilled ? "2/2 документов" : "загрузите оба"})
            </Button>
          </div>
        </div>
      )}

      {step === "photos" && (
        <div className="p-4 space-y-3">
          {/* Заголовок в стиле чек-листа */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Фото авто (мин. 6)
            </h3>
            <span className={`text-xs font-bold ${
              photoCount >= 6 ? "text-green-600" : "text-amber-600"
            }`}>
              {photoCount} / 8
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Только камера телефона (галерея отключена). Чёткие фото при дневном свете. Каждый ракурс — 1 снимок. Минимум 6 из 8 — пассажиры увидят эти фото в поездке.
          </p>

          {/* Чек-лист в стиле PeopleHub */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {VERIFICATION_PHOTO_KEYS.map((key) => {
              const filled = !!photoFiles[key];
              return (
                <div
                  key={key}
                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0"
                >
                  {/* Иконка статуса: зелёный круг + галочка или красный круг + X */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    filled ? "bg-green-500" : "bg-red-400"
                  }`}>
                    {filled ? (
                      <CheckCircle size={18} className="text-white" strokeWidth={2.5} />
                    ) : (
                      <XCircle size={18} className="text-white" strokeWidth={2.5} />
                    )}
                  </div>
                  {/* Превью + label — тап открывает камеру */}
                  <button
                    type="button"
                    onClick={() => { const t = { group: "photo" as const, key }; captureTargetRef.current = t; setCapturingFor(t); }}
                    className="flex-1 min-w-0 flex items-center gap-2 text-left active:opacity-80"
                  >
                    {photoPreviewUrls[key] ? (
                      <img
                        src={photoPreviewUrls[key]}
                        alt=""
                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center">
                        <Camera size={20} className="text-gray-400" />
                      </div>
                    )}
                    <span className="text-sm font-medium text-gray-800">
                      {PHOTO_LABELS[key]} {key !== "extra" ? "*" : ""}
                    </span>
                  </button>
                  {/* Статус справа: 1/1 или 0/1 */}
                  <span className={`text-xs font-medium shrink-0 w-12 text-right ${
                    filled ? "text-green-600" : "text-red-500"
                  }`}>
                    {filled ? "1/1" : "0/1"}
                  </span>
                </div>
              );
            })}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-2 pt-3">
            <Button variant="secondary" onClick={() => setStep("docs")} className="flex-1">
              Назад
            </Button>
            <Button
              fullWidth size="lg"
              disabled={photoCount < 6 || loading}
              loading={loading}
              onClick={handleSubmit}
              className="flex-[2]"
            >
              {photoCount >= 6 ? `Проверить (${photoCount}/8)` : `Ещё ${6 - photoCount} фото`}
            </Button>
          </div>
          {photoCount < 6 && (
            <p className="text-xs text-amber-600 text-center">Минимум 6 фото для проверки</p>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
