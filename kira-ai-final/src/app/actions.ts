"use client";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "@/firebase/config";
import { runVirtualTryOnClient } from "@/lib/virtual-try-on-client";

export type BatchAddProductsInput = {
  products: Array<{
    name: string;
    description?: string;
    price: string;
    category?: string;
    sizes: string;
    imageUrls: string;
  }>;
};

export type GenerateTrendVideoInput = {
  imageDataUri: string;
  theme: "bridgerton" | "f1";
};

function getFirebaseApp() {
  if (getApps().length) return getApp();
  return initializeApp(firebaseConfig);
}

export async function runBatchAddProducts(input: BatchAddProductsInput) {
  try {
    const processedProducts = input.products.map((p) => ({
      name: p.name,
      description: p.description || `${p.name} — стильный продукт для вашего гардероба.`,
      price: parseFloat(String(p.price).replace(",", ".")) || 0,
      category: p.category || "Без категории",
      sizes: p.sizes.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
      imageUrls: p.imageUrls.split(",").map((u) => u.trim()).filter(Boolean),
      colors: [] as string[],
    }));
    return { processedProducts };
  } catch (error) {
    console.error("Batch Add Products failed:", error);
    return { error: "Не удалось обработать файл с товарами." };
  }
}

export async function uploadProductImage(formData: FormData) {
  try {
    const app = getFirebaseApp();
    const storage = getStorage(app);
    const file = formData.get("file") as File;

    if (!file) {
      return { error: "Файл не найден." };
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const storageRef = ref(storage, `product_images/${fileName}`);

    const fileBuffer = await file.arrayBuffer();
    await uploadBytes(storageRef, new Uint8Array(fileBuffer), {
      contentType: file.type,
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return { url: downloadUrl };
  } catch (error) {
    console.error("Upload failed:", error);
    return { error: "Не удалось загрузить изображение." };
  }
}

export async function uploadAvatarImage(formData: FormData) {
  try {
    const app = getFirebaseApp();
    const storage = getStorage(app);
    const file = formData.get("file") as File;

    if (!file) {
      return { error: "Файл не найден." };
    }

    const fileExtension = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;
    const storageRef = ref(storage, `avatars/${fileName}`);

    const fileBuffer = await file.arrayBuffer();
    await uploadBytes(storageRef, new Uint8Array(fileBuffer), {
      contentType: file.type,
    });

    const downloadUrl = await getDownloadURL(storageRef);
    return { url: downloadUrl };
  } catch (error) {
    console.error("Upload failed:", error);
    return { error: "Не удалось загрузить изображение." };
  }
}

export async function runVirtualTryOnAction(
  userPhotoDataUri: string,
  clothingImageUrl: string
) {
  const apiKey =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_GOOGLE_GENAI_API_KEY ||
        process.env.NEXT_PUBLIC_GEMINI_API_KEY)) ||
    "";
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return {
      error:
        "Генерация фото в веб-версии не настроена: задайте NEXT_PUBLIC_GOOGLE_GENAI_API_KEY при сборке (см. CI / локальный .env).",
    };
  }
  return runVirtualTryOnClient(userPhotoDataUri, clothingImageUrl, trimmed);
}

export async function runGenerateCatwalkVideoAction(imageDataUri: string) {
  return { error: "Генерация видео временно недоступна в веб-версии." };
}

export async function runGenerateTrendVideoAction(input: GenerateTrendVideoInput) {
  return { error: "Генерация трендового видео временно недоступна в веб-версии." };
}
