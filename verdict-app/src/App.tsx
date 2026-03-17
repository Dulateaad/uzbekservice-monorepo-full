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
import { SearchScreen } from '@/screens/SearchScreen';
import { RankingScreen } from '@/screens/RankingScreen';
import { FriendsScreen } from '@/screens/FriendsScreen';
import { useUser } from '@/context/UserContext';
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
  const [searchSelectedCard, setSearchSelectedCard] = useState<VerdictCard | null>(null);

  useEffect(() => {
    initTelegramWebApp();
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

  const requestOnboarding = () => setShowOnboarding(true);

  if (showOnboarding) {
    return (
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
        <OnboardingScreen
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      </MainLayout>
    );
  }

  if (showSearch) {
    return (
      <MainLayout activeTab={activeTab} onTabChange={handleTabChange}>
        <SearchScreen
          onSelectCard={(card) => {
            setSearchSelectedCard(card);
            setShowSearch(false);
            setFlowSubsection(null);
            setChampionMode(null);
          }}
          onBack={() => setShowSearch(false)}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onSearchClick={() => setShowSearch(true)}
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
          onFirstVote={!isOnboarded ? requestOnboarding : undefined}
        />
      ) : activeTab === 'flow' ? (
        <FlowScreen onSelect={handleFlowSelect} onBack={() => {}} />
      ) : activeTab === 'champion' ? (
        <ChampionScreen onSelect={handleChampionSelect} onBack={() => {}} />
      ) : activeTab === 'ranking' ? (
        <RankingScreen />
      ) : activeTab === 'profile' ? (
        <ProfileScreen onOpenOnboarding={() => setShowOnboarding(true)} />
      ) : (
        <FriendsScreen />
      )}
    </MainLayout>
  );
}
