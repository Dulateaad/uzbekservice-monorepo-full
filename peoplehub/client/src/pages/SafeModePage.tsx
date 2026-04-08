import { Shield, RefreshCw } from 'lucide-react';
import Button from '../components/common/Button';

export default function SafeModePage() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 px-8 safe-top safe-bottom">
      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
        <Shield size={40} className="text-red-400" />
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Безопасный режим</h1>
      <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
        PeopleHub временно работает в безопасном режиме. 
        Новые заказы недоступны. Активные поездки продолжают работу.
      </p>
      <Button
        onClick={() => window.location.reload()}
        icon={<RefreshCw size={18} />}
        variant="secondary"
      >
        Обновить
      </Button>
      <p className="text-xs text-gray-300 mt-6">
        Следите за обновлениями в @peoplehub_news
      </p>
    </div>
  );
}
