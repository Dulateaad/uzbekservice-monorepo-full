import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import Button from '../components/common/Button';

const PRODUCT_NAMES: Record<string, { name: string; emoji: string }> = {
  '/realty': { name: 'Недвижимость', emoji: '🏠' },
  '/auto': { name: 'Авто', emoji: '🚗' },
  '/tourism': { name: 'Туризм', emoji: '🌴' },
};

export default function ComingSoonPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const product = PRODUCT_NAMES[location.pathname] || { name: 'Раздел', emoji: '🚀' };

  return (
    <div className="h-full flex flex-col bg-gray-50 safe-top safe-bottom">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => navigate('/hub')}>
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="text-6xl mb-6">{product.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Скоро!</h1>
        <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
          Раздел «{product.name}» в PeopleHub уже в разработке. 
          Мы сообщим, когда он будет готов.
        </p>
        <Button
          onClick={() => navigate('/hub')}
          icon={<ArrowLeft size={18} />}
          variant="secondary"
        >
          Назад к сервисам
        </Button>
      </div>
    </div>
  );
}
