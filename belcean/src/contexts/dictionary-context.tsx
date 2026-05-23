'use client'
import React, { createContext, useContext } from 'react';

// The dictionary type will be complex, so we use 'any' for simplicity.
// In a real-world app, you'd generate a type from your JSON files.
const DictionaryContext = createContext<any>(null);

export function DictionaryProvider({
  children,
  dictionary,
}: {
  children: React.ReactNode;
  dictionary: any;
}) {
  return (
    <DictionaryContext.Provider value={dictionary}>
      {children}
    </DictionaryContext.Provider>
  );
}

export const useDictionary = () => {
  const context = useContext(DictionaryContext);
  if (context === null) {
    throw new Error('useDictionary must be used within a DictionaryProvider');
  }
  return context;
};
