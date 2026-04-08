import { useNavigate } from 'react-router-dom';
import { Car, Home, ShoppingBag, Palmtree, ChevronRight, Shield, Globe } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { useStore } from '../store/useStore';
import { featureFlags, setSelectedProduct, type ProductId } from '../config/features';
import TrustBadge from '../components/common/TrustBadge';

interface ProductCard {
  id: ProductId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  route: string;
  enabled: boolean;
  comingSoon?: boolean;
}

const PRODUCTS: ProductCard[] = [
  {
    id: 'TAXI',
    name: 'Поездки',
    description: 'Поиск водителя, 0% комиссии',
    icon: <Car size={28} />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    route: '/taxi',
    enabled: true,
  },
  {
    id: 'REALTY',
    name: 'Недвижимость',
    description: 'Аренда и продажа',
    icon: <Home size={28} />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    route: '/realty',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'AUTO',
    name: 'Авто',
    description: 'Купля-продажа авто',
    icon: <ShoppingBag size={28} />,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    route: '/auto',
    enabled: false,
    comingSoon: true,
  },
  {
    id: 'TOURISM',
    name: 'Туризм',
    description: 'Туры и экскурсии',
    icon: <Palmtree size={28} />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    route: '/tourism',
    enabled: false,
    comingSoon: true,
  },
];

export default function HubPage() {
  const navigate = useNavigate();
  const { tg } = useTelegram();
  const { user } = useStore();
  const flags = featureFlags.getFlags();

  // Убран авторедирект — пользователь осознанно пришёл на хаб («Все сервисы»)

  function handleSelectProduct(product: ProductCard) {
    if (!product.enabled) return;

    if (flags.safeMode && product.id === 'TAXI') {
      tg?.HapticFeedback?.notificationOccurred('warning');
      tg?.showAlert?.('Сейчас включён безопасный режим: новые запросы временно недоступны.');
      return;
    }

    tg?.HapticFeedback?.impactOccurred('medium');
    setSelectedProduct(product.id);

    // For taxi, route based on role (маршрут /taxi в роутере нет — только /client и /driver)
    if (product.id === 'TAXI') {
      if (user?.role === 'DRIVER') {
        navigate('/driver');
      } else {
        navigate('/client');
      }
      return;
    }

    navigate(product.route);
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 safe-top safe-bottom">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PeopleHub</h1>
            <p className="text-sm text-gray-500">Платформа взаимного уважения</p>
          </div>
          {user && (
            <button onClick={() => navigate('/profile')} className="flex items-center gap-2">
              <TrustBadge score={user.trustScore} size="sm" />
            </button>
          )}
        </div>
      </div>

      {/* Safe Mode Banner */}
      {flags.safeMode && (
        <div className="mx-5 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-red-500" />
            <p className="text-sm font-medium text-red-700">Безопасный режим</p>
          </div>
          <p className="text-xs text-red-500 mt-1">Новые запросы временно недоступны. Активные поездки продолжают работу.</p>
        </div>
      )}

      {/* Product Grid */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Сервисы</p>

        <div className="space-y-3">
          {PRODUCTS.map((product) => {
            const isEnabled = product.enabled && featureFlags.isProductEnabled(product.id);
            // В safe mode такси оставляем кликабельным — покажем объяснение (раньше кнопка была disabled и «не нажималась»)
            const isDisabled =
              !isEnabled ||
              (flags.safeMode && product.id !== 'TAXI');
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all
                  ${isEnabled && (!flags.safeMode || product.id === 'TAXI')
                    ? `${product.bgColor} active:scale-[0.98] shadow-sm`
                    : 'bg-gray-100 border-gray-200 opacity-60'
                  }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${isEnabled ? product.color : 'text-gray-400'} bg-white/80`}>
                  {product.icon}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className={`font-semibold ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>{product.name}</p>
                    {product.comingSoon && (
                      <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Скоро</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{product.description}</p>
                </div>
                {isEnabled && (!flags.safeMode || product.id === 'TAXI') && (
                  <ChevronRight size={20} className="text-gray-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Branch info (subtle, for transparency) */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-300">
          <Globe size={12} />
          <span>PH-TAXI-KZ-1</span>
          <span>·</span>
          <span>v{(window as any).__APP_VERSION__ || 'dev'}</span>
        </div>
      </div>
    </div>
  );
}
