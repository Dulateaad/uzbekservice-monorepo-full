import { useEffect, useState } from 'react';
import { initTelegramWebApp } from '@/lib/telegram';
import { MainLayout, type TabId } from '@/components/MainLayout';
import { FlowScreen } from '@/screens/FlowScreen';
import { ChampionScreen } from '@/screens/ChampionScreen';
import { KnowYourselfScreen } from '@/screens/KnowYourselfScreen';
import { CardFlowScreen } from '@/screens/CardFlowScreen';

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('flow');
  const [flowSubsection, setFlowSubsection] = useState<string | null>(null);
  const [championMode, setChampionMode] = useState<string | null>(null);
  const [knowSubsection, setKnowSubsection] = useState<string | null>(null);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  const inCardFlow = flowSubsection !== null || championMode !== null || knowSubsection !== null;
  const currentSubsection = flowSubsection || championMode || knowSubsection || 'popular';

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setFlowSubsection(null);
    setChampionMode(null);
    setKnowSubsection(null);
  };

  const handleFlowSelect = (subsection: string) => {
    setFlowSubsection(subsection);
  };

  const handleChampionSelect = (mode: string) => {
    setChampionMode(mode);
  };

  const handleKnowSelect = (subsection: string) => {
    setKnowSubsection(subsection);
  };

  const goBack = () => {
    setFlowSubsection(null);
    setChampionMode(null);
    setKnowSubsection(null);
  };

  return (
    <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
      {inCardFlow ? (
        <CardFlowScreen
          subsection={currentSubsection}
          mode={championMode}
          onBack={goBack}
        />
      ) : activeTab === 'flow' ? (
        <FlowScreen onSelect={handleFlowSelect} onBack={() => {}} />
      ) : activeTab === 'champion' ? (
        <ChampionScreen onSelect={handleChampionSelect} onBack={() => {}} />
      ) : (
        <KnowYourselfScreen onSelect={handleKnowSelect} onBack={() => {}} />
      )}
    </MainLayout>
  );
}
