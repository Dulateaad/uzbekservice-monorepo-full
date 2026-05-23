"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguageContext } from "@/contexts/language-context";
import { getTranslation } from "@/lib/i18n";
import { useCart } from "@/contexts/cart-context";
import { products, type Product } from "@/lib/products";

export function Catalog() {
  const router = useRouter();
  const { language } = useLanguageContext();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"price" | "name">("price");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [orderQuantity, setOrderQuantity] = useState<string>("1");
  const [addedToCart, setAddedToCart] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const getProductName = (product: Product) => {
    if (language === "ru" && product.nameRu) return product.nameRu;
    if (language === "kk" && product.nameKk) return product.nameKk;
    return product.name;
  };

  const getProductDescription = (product: Product) => {
    if (language === "ru" && product.descriptionRu)
      return product.descriptionRu;
    if (language === "kk" && product.descriptionKk)
      return product.descriptionKk;
    return product.description;
  };

  const searchSuggestions = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const query = searchQuery.toLowerCase();
    return products
      .filter(
        (p) =>
          getProductName(p).toLowerCase().includes(query) ||
          p.variety.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [searchQuery, language]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    if (selectedColor) {
      filtered = filtered.filter((p) => p.color === selectedColor);
    }

    if (selectedSeason) {
      filtered = filtered.filter((p) => p.season === selectedSeason);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          getProductName(p).toLowerCase().includes(query) ||
          getProductDescription(p).toLowerCase().includes(query) ||
          p.variety.toLowerCase().includes(query),
      );
    }

    if (sortBy === "price") {
      filtered.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
    } else if (sortBy === "name") {
      filtered.sort((a, b) =>
        getProductName(a).localeCompare(getProductName(b)),
      );
    }

    return filtered;
  }, [
    selectedCategory,
    selectedColor,
    selectedSeason,
    searchQuery,
    sortBy,
    language,
  ]);

  const categories = [
    { value: "", label: getTranslation(language, "allCategories") },
    { value: "roses", label: getTranslation(language, "roses") },
    {
      value: "chrysanthemums",
      label: getTranslation(language, "chrysanthemums"),
    },
    { value: "carnations", label: getTranslation(language, "carnations") },
    { value: "gypsophila", label: getTranslation(language, "gypsophila") },
    { value: "lilies", label: getTranslation(language, "lilies") },
    { value: "gerberas", label: getTranslation(language, "gerberas") },
    { value: "seasonal", label: getTranslation(language, "seasonal") },
    { value: "holiday", label: getTranslation(language, "holiday") },
  ];

  const colors = [
    { value: "", label: getTranslation(language, "allColors") },
    { value: "red", label: getTranslation(language, "red") },
    { value: "pink", label: getTranslation(language, "pink") },
    { value: "white", label: getTranslation(language, "white") },
    { value: "yellow", label: getTranslation(language, "yellow") },
    { value: "purple", label: getTranslation(language, "purple") },
    { value: "multi", label: getTranslation(language, "multi") },
  ];

  const seasons = [
    { value: "", label: getTranslation(language, "allSeasons") },
    { value: "yearRound", label: getTranslation(language, "yearRound") },
    { value: "spring", label: getTranslation(language, "spring") },
    { value: "summer", label: getTranslation(language, "summer") },
    { value: "autumn", label: getTranslation(language, "autumn") },
    { value: "winter", label: getTranslation(language, "winter") },
  ];

  const handleSelectSuggestion = (product: Product) => {
    setSearchQuery(getProductName(product));
    setShowSuggestions(false);
  };

  return (
    <section
      id="catalog"
      className="py-20 px-4 bg-gradient-to-b from-white to-green-50"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-[#568a56] mb-4">
            {getTranslation(language, "catalog")}
          </h2>
          <div className="h-1 w-20 bg-[#568a56] mx-auto"></div>
        </div>

        {/* Filters */}
        <div className="mb-10 space-y-4">
          <div className="max-w-md mx-auto relative" ref={searchRef}>
            <input
              type="text"
              placeholder={getTranslation(language, "searchProducts")}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              className="w-full px-5 py-3 border-2 border-green-200 rounded-xl focus:outline-none focus:border-[#568a56] bg-white text-foreground"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-20 w-full mt-1 bg-white border border-green-200 rounded-xl shadow-lg overflow-hidden">
                {searchSuggestions.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectSuggestion(product)}
                    className="w-full px-4 py-3 text-left hover:bg-green-50 flex items-center gap-3 border-b border-green-100 last:border-b-0"
                  >
                    <img
                      src={product.imageUrl || "/placeholder.svg"}
                      alt=""
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {getProductName(product)}
                      </p>
                      <p className="text-sm text-gray-500">{product.variety}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex gap-3 flex-wrap justify-center">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-[#568a56] bg-white text-foreground min-w-[140px]"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="px-4 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-[#568a56] bg-white text-foreground min-w-[140px]"
            >
              {colors.map((color) => (
                <option key={color.value} value={color.value}>
                  {color.label}
                </option>
              ))}
            </select>

            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="px-4 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-[#568a56] bg-white text-foreground min-w-[140px]"
            >
              {seasons.map((season) => (
                <option key={season.value} value={season.value}>
                  {season.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "price" | "name")}
              className="px-4 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-[#568a56] bg-white text-foreground min-w-[140px]"
            >
              <option value="price">
                {getTranslation(language, "sortBy")}:{" "}
                {getTranslation(language, "price")}
              </option>
              <option value="name">
                {getTranslation(language, "sortBy")}:{" "}
                {getTranslation(language, "name")}
              </option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white border border-green-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all hover:border-[#568a56] cursor-pointer group"
                onClick={() => {
                  setSelectedProduct(product);
                  setOrderQuantity(String(product.minOrder));
                }}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.imageUrl || "/placeholder.svg"}
                    alt={getProductName(product)}
                    className="w-full h-48 object-cover bg-green-50 group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#568a56] mb-2 line-clamp-1">
                    {getProductName(product)}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                    {getProductDescription(product)}
                  </p>

                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-400 uppercase">
                        {getTranslation(language, "pricePerUnit")}
                      </p>
                      <p className="text-2xl font-bold text-[#568a56]">
                        {product.pricePerUnit}
                        <span className="text-sm font-normal ml-1">
                          {getTranslation(language, "currency")}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {getTranslation(language, "minOrder")}
                      </p>
                      <p className="font-semibold text-gray-700">
                        {product.minOrder} {getTranslation(language, "boxes")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">
              {getTranslation(language, "noResults")}
            </p>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-green-100 p-5 flex justify-between items-center z-10">
              <h2 className="text-xl md:text-2xl font-bold text-[#568a56] pr-4">
                {getProductName(selectedProduct)}
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-5 md:p-6 space-y-6">
              <img
                src={selectedProduct.imageUrl || "/placeholder.svg"}
                alt={getProductName(selectedProduct)}
                className="w-full h-64 md:h-80 object-cover rounded-xl bg-green-50"
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-[#568a56] mb-4">
                    {getTranslation(language, "productDetails")}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {getTranslation(language, "color")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {getTranslation(language, selectedProduct.color)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {getTranslation(language, "variety")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedProduct.variety}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {getTranslation(language, "stemLength")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedProduct.stemLength}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {getTranslation(language, "packaging")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedProduct.packaging}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">
                        {getTranslation(language, "minOrder")}
                      </span>
                      <span className="font-medium text-gray-900">
                        {selectedProduct.minOrder}{" "}
                        {getTranslation(language, "boxes")}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-[#568a56] mb-4">
                    {getTranslation(language, "price")}
                  </h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-gray-500 text-sm mb-1">
                        {getTranslation(language, "pricePerUnit")}
                      </p>
                      <p className="text-3xl font-bold text-[#568a56]">
                        {selectedProduct.pricePerUnit}{" "}
                        <span className="text-lg font-normal">
                          {getTranslation(language, "currency")}
                        </span>
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-gray-500 text-sm mb-1">
                        {getTranslation(language, "pricePerBox")}
                      </p>
                      <p className="text-3xl font-bold text-[#568a56]">
                        {selectedProduct.pricePerBox.toLocaleString()}{" "}
                        <span className="text-lg font-normal">
                          {getTranslation(language, "currency")}
                        </span>
                      </p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <p className="text-gray-500 text-sm mb-2">
                        {language === "ru"
                          ? "Количество коробок"
                          : language === "kk"
                            ? "Қораптар саны"
                            : "Number of boxes"}
                      </p>
                      <input
                        type="number"
                        min={selectedProduct.minOrder}
                        value={orderQuantity}
                        onChange={(e) => setOrderQuantity(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-green-200 rounded-lg focus:outline-none focus:border-[#568a56] bg-white text-foreground text-center text-xl font-bold"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {language === "ru"
                          ? `Мин. заказ: ${selectedProduct.minOrder} коробок`
                          : language === "kk"
                            ? `Мин. тапсырыс: ${selectedProduct.minOrder} қорап`
                            : `Min. order: ${selectedProduct.minOrder} boxes`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-gray-600 leading-relaxed">
                  {getProductDescription(selectedProduct)}
                </p>
              </div>

              {addedToCart && (
                <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg text-center">
                  ✓ Товар добавлен в корзину!
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => {
                    // Проверяем авторизацию
                    const savedUser = localStorage.getItem("sprayflowers_user");
                    if (!savedUser) {
                      alert(
                        "Пожалуйста, войдите в аккаунт, чтобы добавлять товары в корзину",
                      );
                      router.push("/auth/login");
                      return;
                    }

                    // Конвертируем Product в формат для корзины
                    const productForCart = {
                      id: selectedProduct.id,
                      name: getProductName(selectedProduct),
                      price_per_unit: selectedProduct.pricePerUnit,
                      price_per_box: selectedProduct.pricePerBox,
                      color: selectedProduct.color,
                      variety: selectedProduct.variety,
                      stem_length: selectedProduct.stemLength,
                      packaging_type: selectedProduct.packaging,
                      min_order_quantity: selectedProduct.minOrder,
                      image_url: selectedProduct.imageUrl,
                    };

                    addToCart(productForCart, parseInt(orderQuantity) || 1);
                    setAddedToCart(true);
                    setTimeout(() => {
                      setAddedToCart(false);
                      setSelectedProduct(null);
                    }, 1500);
                  }}
                  className="flex-1 bg-[#568a56] hover:bg-[#457245] text-white py-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  {getTranslation(language, "addToCart") ||
                    "Добавить в корзину"}
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-6 py-4 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  {getTranslation(language, "closeModal")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
