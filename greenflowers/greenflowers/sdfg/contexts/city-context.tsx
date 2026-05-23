"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type CityContextType = {
  city: string;
  setCity: (c: string) => void;
};

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [city, setCityState] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("gf_city");
    if (saved) setCityState(saved);
  }, []);

  const setCity = (c: string) => {
    setCityState(c);
    try {
      localStorage.setItem("gf_city", c);
    } catch (e) {}
    // dispatch event for listeners
    window.dispatchEvent(new CustomEvent("gf:city:changed", { detail: c }));
  };

  return (
    <CityContext.Provider value={{ city, setCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
