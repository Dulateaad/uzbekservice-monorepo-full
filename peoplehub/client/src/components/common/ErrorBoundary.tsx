import { Component, type ErrorInfo, type ReactNode } from 'react';
import { trackError } from '../../services/analytics';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/** Ловит ошибки рендера и показывает заглушку вместо белого экрана */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    trackError(error, `ErrorBoundary: ${errorInfo.componentStack?.slice(0, 200)}`);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center p-6"
          style={{ background: '#f4f4f5', color: '#1f2937' }}
        >
          <p className="text-lg font-semibold mb-2">Что-то пошло не так</p>
          <p className="text-sm text-gray-600 text-center mb-4">
            Закройте мини-приложение и откройте снова из бота.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl font-medium text-white"
            style={{ background: '#0c93e7' }}
          >
            Обновить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
