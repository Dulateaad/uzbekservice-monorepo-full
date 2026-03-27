import { useEffect, useState } from 'react';
import { initTelegramWebApp } from '@/lib/telegram';
import { MainLayout, type TabId } from '@/components/MainLayout';
import { FlowScreen } from '@/screens/FlowScreen';
import { ChampionScreen } from '@/screens/ChampionScreen';
import { CardFlowScreen } from '@/screens/CardFlowScreen';
import { AskPeopleScreen } from '@/screens/AskPeopleScreen';
import { PeopleCreateScreen } from '@/screens/PeopleCreateScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { KnowYourselfScreen } from '@/screens/KnowYourselfScreen';
import { useUser } from '@/context/UserContext';
import { SearchWithTabs } from '@/components/SearchWithTabs';
import type { VerdictCard } from '@/types/card';

export function App() {
  const { isOnboarded } = useUser();
  const [activeTab, setActiveTab] = useState<TabId>('flow');
  const [flowSubsection, setFlowSubsection] = useState<string | null>(null);
  const [championMode, setChampionMode] = useState<string | null>(null);
  const [askPeopleCreateMode, setAskPeopleCreateMode] = useState(true);
  const [peopleCreateMode, setPeopleCreateMode] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchMode, setSearchMode] = useState<'play' | 'advisor'>('play');
  const [showProfile, setShowProfile] = useState(false);
  const [searchSelectedCard, setSearchSelectedCard] = useState<VerdictCard | null>(null);

  useEffect(() => {
    initTelegramWebApp();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cardId = params.get('card');
    if (cardId) {
      import('@/services/cards-service').then(({ getCardById }) => {
        getCardById(cardId).then((card) => {
          if (card) {
            setSearchSelectedCard(card);
            setFlowSubsection(null);
            setChampionMode(null);
          }
        });
      });
    }
  }, []);

  const showAskPeopleForm = flowSubsection === 'askPeople' && askPeopleCreateMode;
  const showPeopleForm = flowSubsection === 'people' && peopleCreateMode;
  const inCardFlow =
    (flowSubsection !== null && !showAskPeopleForm && !showPeopleForm) || championMode !== null;
  const currentSubsection = flowSubsection || championMode || 'popular';

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setFlowSubsection(null);
    setChampionMode(null);
    setAskPeopleCreateMode(true);
    setPeopleCreateMode(true);
  };

  const handleFlowSelect = (subsection: string) => {
    setFlowSubsection(subsection);
    setAskPeopleCreateMode(subsection === 'askPeople');
    setPeopleCreateMode(subsection === 'people');
  };

  const handleChampionSelect = (mode: string) => {
    setChampionMode(mode);
  };

  const goBack = () => {
    setFlowSubsection(null);
    setChampionMode(null);
    setAskPeopleCreateMode(true);
    setPeopleCreateMode(true);
    setSearchSelectedCard(null);
  };

  const handleVoteCount = (count: number) => {
    if (count >= 3 && !isOnboarded) setShowOnboarding(true);
  };

  if (showOnboarding) {
    return (
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange} onSearchClick={() => setShowSearch(true)} onProfileClick={() => setShowProfile(true)}>
        <OnboardingScreen
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </MainLayout>
    );
  }

  if (showSearch) {
    const handleSelectCard = (card: VerdictCard) => {
      setSearchSelectedCard(card);
      setShowSearch(false);
      setFlowSubsection(null);
      setChampionMode(null);
    };
    return (
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange} onSearchClick={() => setShowSearch(true)} onProfileClick={() => { setShowSearch(false); setShowProfile(true); }}>
        <SearchWithTabs
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          onSelectCard={handleSelectCard}
          onBack={() => setShowSearch(false)}
        />
      </MainLayout>
    );
  }

  if (showProfile) {
    return (
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange} onSearchClick={() => setShowSearch(true)} onProfileClick={() => setShowProfile(true)}>
        <ProfileScreen onBack={() => setShowProfile(false)} onOpenOnboarding={() => setShowOnboarding(true)} />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onSearchClick={() => setShowSearch(true)}
      onProfileClick={() => setShowProfile(true)}
    >
      {showAskPeopleForm ? (
        <AskPeopleScreen onCreated={() => setAskPeopleCreateMode(false)} onBack={goBack} />
      ) : showPeopleForm ? (
        <PeopleCreateScreen onCreated={() => setPeopleCreateMode(false)} onBack={goBack} />
      ) : inCardFlow || searchSelectedCard ? (
        <CardFlowScreen
          subsection={searchSelectedCard ? 'popular' : currentSubsection}
          mode={championMode}
          onBack={goBack}
          initialCard={searchSelectedCard}
          onVoteCount={!isOnboarded ? handleVoteCount : undefined}
        />
      ) : activeTab === 'flow' ? (
        <FlowScreen onSelect={handleFlowSelect} onBack={() => {}} />
      ) : activeTab === 'champion' ? (
        <ChampionScreen onSelect={handleChampionSelect} onBack={() => {}} />
      ) : activeTab === 'discover' ? (
        <KnowYourselfScreen onSelect={(id) => { handleFlowSelect(id); }} onBack={() => {}} />
      ) : (
        <FlowScreen onSelect={handleFlowSelect} onBack={() => {}} />
      )}
    </MainLayout>
  );
}
