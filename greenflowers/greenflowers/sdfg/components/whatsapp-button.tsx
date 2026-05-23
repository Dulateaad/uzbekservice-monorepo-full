"use client";

import { useLanguageContext } from "@/contexts/language-context";
import { getTranslation } from "@/lib/i18n";

interface WhatsAppButtonProps {
  variant?: "primary" | "outline" | "floating";
  productName?: string;
  className?: string;
}

export function WhatsAppButton({
  variant = "primary",
  productName = "",
  className = "",
}: WhatsAppButtonProps) {
  const { language } = useLanguageContext();
  const whatsappNumber = "77082354533";

  // Localized messages
  const getMessage = () => {
    if (productName) {
      if (language === "ru") {
        return `Хочу сделать предзаказ со скидкой. Интересует: ${productName}. Можете предоставить информацию?`;
      } else if (language === "kk") {
        return `Ынамдау арқасында құны төмені болмасын деп сұраймын. Қызығушылық: ${productName}. Ақпарат бере аласыз ба?`;
      }
      return `I want to make a pre-order with a discount. I'm interested in: ${productName}. Can you provide more information?`;
    }

    if (language === "ru") {
      return "Хочу сделать предзаказ со скидкой";
    } else if (language === "kk") {
      return "Ынамдау арқасында құны төмені болмасын деп сұраймын";
    }
    return "I want to make a pre-order with a discount";
  };

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(getMessage())}`;

  const baseStyles =
    "flex items-center gap-2 font-semibold transition-all rounded-xl";

  let variantStyles = "";
  switch (variant) {
    case "primary":
      variantStyles =
        "px-8 py-4 bg-[#568a56] text-white hover:bg-[#457245] shadow-lg hover:shadow-xl hover:scale-105";
      break;
    case "outline":
      variantStyles =
        "px-8 py-4 border-2 border-[#568a56] text-[#568a56] hover:bg-green-50";
      break;
    case "floating":
      variantStyles =
        "fixed bottom-6 right-6 p-4 bg-[#568a56] text-white rounded-full shadow-2xl hover:bg-[#457245] hover:scale-110 z-40";
      break;
  }

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${baseStyles} ${variantStyles} ${className}`}
      title="Contact via WhatsApp"
    >
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a6.963 6.963 0 00-6.868 6.972c0 1.668.414 3.304 1.201 4.752L2.267 22l5.108-1.338a6.944 6.944 0 004.157 1.34h.004c3.837 0 6.97-3.131 6.972-6.972 0-1.862-.723-3.613-2.037-4.928-1.314-1.316-3.056-2.04-4.917-2.04" />
      </svg>
      {variant !== "floating" && (
        <span>{getTranslation(language, "whatsapp")}</span>
      )}
    </a>
  );
}
